import net from "node:net";
import type {
  StreamAdapterStatus,
  StreamMode,
  TcpClientParams,
  TcpServerParams
} from "../../../shared/stream";
import type { StreamAdapter } from "./StreamAdapter";
import { QueuedReads } from "./queuedReads";

type TcpAdapterConfig =
  { type: "tcp-server"; params: TcpServerParams } | { type: "tcp-client"; params: TcpClientParams };

export class TcpAdapter implements StreamAdapter {
  public readonly type: "tcp-server" | "tcp-client";
  private server?: net.Server;
  private socket?: net.Socket;
  private sockets = new Set<net.Socket>();
  private status: StreamAdapterStatus["status"] = "idle";
  private error?: string;
  private readonly reads = new QueuedReads();
  private reconnectTimer?: NodeJS.Timeout;

  public constructor(
    public readonly id: string,
    public readonly mode: StreamMode,
    private readonly config: TcpAdapterConfig
  ) {
    this.type = config.type;
  }

  public async open(): Promise<void> {
    this.status = "connecting";
    try {
      if (this.config.type === "tcp-server") {
        await this.openServer(this.config.params);
      } else {
        await this.openClient(this.config.params);
      }
      this.status = "connected";
    } catch (error) {
      this.markError(error instanceof Error ? error : new Error(String(error)));
      await this.close().catch(() => undefined);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.reconnectTimer != undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.reads.close();
    this.socket?.destroy();
    this.socket = undefined;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    if (this.server != undefined) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    this.status = "idle";
  }

  public async read(maxBytes: number): Promise<Buffer | undefined> {
    return await this.reads.read(maxBytes);
  }

  public async write(data: Buffer): Promise<void> {
    if (this.config.type === "tcp-server") {
      const sockets = Array.from(this.sockets);
      if (sockets.length === 0) {
        throw new Error(`${this.id} has no active TCP clients`);
      }
      await Promise.all(sockets.map((socket) => this.writeToSocket(socket, data)));
      return;
    }
    if (this.mode === "output" && (this.socket == undefined || this.socket.destroyed)) {
      // Output client retries connection in the background; drop data while disconnected.
      return;
    }
    if (this.socket == undefined || this.socket.destroyed) {
      throw new Error(`${this.id} has no active TCP connection`);
    }
    await this.writeToSocket(this.socket, data);
  }

  public getStatus(): StreamAdapterStatus {
    return {
      id: this.id,
      type: this.type,
      mode: this.mode,
      status: this.status,
      error: this.error
    };
  }

  public getClients(): number {
    return this.sockets.size;
  }

  public getBoundPort(): number {
    const address = this.server?.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("TCP server is not listening on an IP port");
    }
    return address.port;
  }

  private async openServer(params: TcpServerParams): Promise<void> {
    this.server = net.createServer((socket) => this.attachSocket(socket));
    this.server.on("error", (error) => this.markError(error));
    const host = params.host && params.host.length > 0 ? params.host : "0.0.0.0";
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(params.port, host, () => {
        this.server?.off("error", reject);
        resolve();
      });
    });
  }

  private async openClient(params: TcpClientParams): Promise<void> {
    if (this.mode === "output") {
      await this.openOutputClient(params);
      return;
    }

    const socket = net.createConnection({ host: params.host, port: params.port });
    this.attachSocket(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
    if (params.connectMessage != undefined && params.connectMessage.length > 0) {
      await this.write(decodeEscapeSequences(params.connectMessage));
    }
  }

  private async openOutputClient(params: TcpClientParams): Promise<void> {
    this.status = "connecting";
    this.error = undefined;
    const connected = await this.attemptOutputConnection(params);
    if (!connected) {
      this.scheduleOutputRetry(params);
    }
  }

  private attemptOutputConnection(params: TcpClientParams): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.status === "idle") {
        resolve(false);
        return;
      }
      const socket = net.createConnection({ host: params.host, port: params.port });
      let settled = false;

      const cleanup = (): void => {
        socket.off("connect", onConnect);
        socket.off("error", onError);
      };

      const onConnect = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        this.attachOutputSocket(socket);
        this.status = "connected";
        this.error = undefined;
        if (params.connectMessage != undefined && params.connectMessage.length > 0) {
          this.write(decodeEscapeSequences(params.connectMessage)).catch(() => undefined);
        }
        resolve(true);
      };

      const onError = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        socket.destroy();
        resolve(false);
      };

      socket.once("connect", onConnect);
      socket.once("error", onError);
    });
  }

  private scheduleOutputRetry(params: TcpClientParams): void {
    this.reconnectTimer = setTimeout(() => {
      void this.attemptOutputConnection(params).then((connected) => {
        if (!connected && this.status !== "idle") {
          this.scheduleOutputRetry(params);
        }
      });
    }, 3000);
  }

  private attachOutputSocket(socket: net.Socket): void {
    this.socket?.destroy();
    this.socket = socket;
    socket.on("error", () => {
      socket.destroy();
    });
    socket.on("close", () => {
      if (this.socket === socket) {
        this.socket = undefined;
      }
      if (this.status !== "idle") {
        this.status = "connecting";
        const params = this.config.params as TcpClientParams;
        this.scheduleOutputRetry(params);
      }
    });
  }

  private attachSocket(socket: net.Socket): void {
    if (this.config.type === "tcp-client") {
      this.socket?.destroy();
      this.socket = socket;
    } else {
      this.sockets.add(socket);
      if (this.status !== "connected") {
        this.status = "connected";
        this.error = undefined;
      }
      socket.on("close", () => {
        this.sockets.delete(socket);
        if (this.sockets.size === 0 && this.status !== "idle") {
          this.status = "idle";
        }
      });
    }
    socket.on("data", (chunk) => this.reads.push(chunk));
    socket.on("error", (error) => this.markError(error));
    if (this.config.type === "tcp-client") {
      socket.on("close", () => {
        if (this.status !== "idle") {
          this.status = "idle";
        }
      });
    }
  }

  private writeToSocket(socket: net.Socket, data: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      socket.write(data, (error) => {
        if (error != undefined) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private markError(error: Error): void {
    this.error = error.message;
    this.status = "error";
  }
}

function decodeEscapeSequences(value: string): Buffer {
  const decoded = value
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
  return Buffer.from(decoded, "utf-8");
}
