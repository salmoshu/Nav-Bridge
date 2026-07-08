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
  private status: StreamAdapterStatus["status"] = "idle";
  private error?: string;
  private readonly reads = new QueuedReads();

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
    this.reads.close();
    this.socket?.destroy();
    this.socket = undefined;
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
    if (this.socket == undefined || this.socket.destroyed) {
      throw new Error(`${this.id} has no active TCP connection`);
    }
    await new Promise<void>((resolve, reject) => {
      this.socket?.write(data, (error) => {
        if (error != undefined) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
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
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(params.port, params.host ?? "0.0.0.0", () => {
        this.server?.off("error", reject);
        resolve();
      });
    });
  }

  private async openClient(params: TcpClientParams): Promise<void> {
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

  private attachSocket(socket: net.Socket): void {
    this.socket?.destroy();
    this.socket = socket;
    socket.on("data", (chunk) => this.reads.push(chunk));
    socket.on("error", (error) => this.markError(error));
    socket.on("close", () => {
      if (this.status !== "idle") {
        this.status = "idle";
      }
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
