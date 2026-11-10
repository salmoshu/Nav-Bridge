import net from "node:net";
import type {
  NtripClientParams,
  StreamAdapterStatus,
  StreamMode,
  StreamOptions
} from "../../../shared/stream";
import type { StreamAdapter } from "./StreamAdapter";
import { QueuedReads } from "./queuedReads";

/** NTRIP v1 (ICY) and HTTP NTRIP streams, including chunked HTTP responses. */
export class NtripClientAdapter implements StreamAdapter {
  public readonly type = "ntrip-client";
  private socket?: net.Socket;
  private reads = new QueuedReads();
  private status: StreamAdapterStatus["status"] = "idle";
  private error?: string;
  private active = false;
  private reconnectTimer?: NodeJS.Timeout;
  private readonly reconnectInterval: number;
  private readonly inactiveTimeout: number;

  public constructor(
    public readonly id: string,
    public readonly mode: StreamMode,
    private readonly params: NtripClientParams,
    options: Partial<StreamOptions> = {}
  ) {
    this.reconnectInterval = options.reconnectInterval ?? 10000;
    this.inactiveTimeout = options.inactiveTimeout ?? 10000;
  }

  public async open(): Promise<void> {
    if (this.mode !== "input") {
      throw new Error("NTRIP client is only supported as an input endpoint");
    }
    this.active = true;
    this.reads = new QueuedReads();
    try {
      await this.connect();
    } catch (error) {
      await this.close();
      this.markError(error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    this.active = false;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.destroy();
    this.socket = undefined;
    this.reads.close();
    this.status = "idle";
  }

  public async read(maxBytes: number): Promise<Buffer | undefined> {
    return await this.reads.read(maxBytes);
  }

  public async write(data: Buffer): Promise<void> {
    const socket = this.socket;
    if (socket == undefined || socket.destroyed || this.status !== "connected") {
      throw new Error(`${this.id} has no active NTRIP connection`);
    }
    await new Promise<void>((resolve, reject) => {
      socket.write(data, (error) => (error ? reject(error) : resolve()));
    });
  }

  public getStatus(): StreamAdapterStatus {
    return { id: this.id, type: this.type, mode: this.mode, status: this.status, error: this.error };
  }

  public getClients(): number {
    return 0;
  }

  private async connect(): Promise<void> {
    const request = this.createRequest();
    this.status = "connecting";
    this.error = undefined;
    const socket = net.createConnection({ host: this.params.host, port: this.params.port });
    this.socket = socket;
    socket.setNoDelay(true);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let connected = false;
      const parser = new NtripResponseParser(
        () => {
          connected = true;
          settled = true;
          clearTimeout(handshakeTimer);
          this.status = "connected";
          this.error = undefined;
          resolve();
        },
        (data) => this.reads.push(data),
        () => socket.destroy()
      );
      const fail = (error: Error): void => {
        clearTimeout(handshakeTimer);
        this.markError(error);
        if (!settled) {
          settled = true;
          reject(error);
        }
        socket.destroy();
      };
      const handshakeTimer = setTimeout(
        () => fail(new Error("NTRIP connection timed out")),
        this.inactiveTimeout > 0 ? this.inactiveTimeout : 10000
      );

      socket.once("connect", () => socket.write(request));
      socket.on("data", (data) => {
        try {
          parser.push(data);
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      });
      socket.on("error", fail);
      socket.setTimeout(this.inactiveTimeout, () => fail(new Error("NTRIP stream inactive timeout")));
      socket.once("close", () => {
        clearTimeout(handshakeTimer);
        if (!settled) {
          settled = true;
          reject(new Error("NTRIP connection closed before a successful response"));
        }
        if (this.socket === socket) {
          this.socket = undefined;
        }
        if (this.active && connected) {
          this.status = this.reconnectInterval > 0 ? "connecting" : "error";
          this.error ??= "NTRIP connection closed";
          this.scheduleReconnect();
        }
      });
    });
  }

  private createRequest(): string {
    const mountpoint = this.params.mountpoint.replace(/^\/+/, "");
    const host = this.params.host.includes(":") ? `[${this.params.host}]` : this.params.host;
    const lines = [
      `GET /${encodeURI(mountpoint).replace(/[?#]/g, encodeURIComponent)} HTTP/1.0`,
      `Host: ${host}:${this.params.port}`,
      "User-Agent: NTRIP Nav-Bridge",
      "Accept: */*",
      "Accept-Encoding: identity",
      "Connection: close"
    ];
    if (this.params.username || this.params.password) {
      const credentials = Buffer.from(`${this.params.username ?? ""}:${this.params.password ?? ""}`);
      lines.push(`Authorization: Basic ${credentials.toString("base64")}`);
    }
    return `${lines.join("\r\n")}\r\n\r\n`;
  }

  private scheduleReconnect(): void {
    if (!this.active || this.reconnectInterval <= 0 || this.reconnectTimer != undefined) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.active) {
        void this.connect().catch((error: unknown) => {
          if (this.active) {
            this.markError(error);
            this.scheduleReconnect();
          }
        });
      }
    }, this.reconnectInterval);
    this.reconnectTimer.unref();
  }

  private markError(error: unknown): void {
    this.status = "error";
    this.error = error instanceof Error ? error.message : String(error);
  }
}

class NtripResponseParser {
  private pending = Buffer.alloc(0);
  private response: "headers" | "icy-prefix" | "body" = "headers";
  private chunked = false;
  private chunkRemaining?: number;
  private chunkTerminator = false;
  private ended = false;

  public constructor(
    private readonly onConnected: () => void,
    private readonly onData: (data: Buffer) => void,
    private readonly onEnd: () => void
  ) {}

  public push(data: Buffer): void {
    if (this.ended) return;
    this.pending = Buffer.concat([this.pending, data]);
    if (this.response === "headers") {
      const lineEnd = this.pending.indexOf("\r\n");
      if (lineEnd < 0) {
        this.checkHeaderSize();
        return;
      }
      const status = this.pending.toString("ascii", 0, lineEnd);
      if (status === "ICY 200 OK") {
        // RTKLIB v1 casters start binary data immediately after this single line.
        this.pending = this.pending.subarray(lineEnd + 2);
        this.response = "icy-prefix";
        this.onConnected();
      } else {
        if (!/^HTTP\/1\.[01] 200(?: |$)/.test(status)) {
          throw new Error(`NTRIP connection rejected: ${status.slice(0, 160)}`);
        }
        const headerEnd = this.pending.indexOf("\r\n\r\n");
        if (headerEnd < 0) {
          this.checkHeaderSize();
          return;
        }
        if (headerEnd > 16384) {
          throw new Error("NTRIP response headers are too large");
        }
        const headers = this.pending.toString("ascii", 0, headerEnd);
        if (/^content-type:\s*(?:gnss\/sourcetable|text\/html)/im.test(headers)) {
          throw new Error("NTRIP connection rejected: caster did not return a correction stream");
        }
        this.chunked = /^transfer-encoding:.*\bchunked\b/im.test(headers);
        this.pending = this.pending.subarray(headerEnd + 4);
        this.response = "body";
        this.onConnected();
      }
    }
    if (this.response === "icy-prefix") {
      // Some casters add an empty header line; it may arrive in separate packets.
      if (this.pending.length === 0 || (this.pending.length === 1 && this.pending[0] === 13)) {
        return;
      }
      if (this.pending[0] === 13 && this.pending[1] === 10) {
        this.pending = this.pending.subarray(2);
      }
      this.response = "body";
    }
    if (this.chunked) {
      this.decodeChunks();
    } else if (this.pending.length > 0) {
      this.onData(this.pending);
      this.pending = Buffer.alloc(0);
    }
  }

  private checkHeaderSize(): void {
    if (this.pending.length > 16384) {
      throw new Error("NTRIP response headers are too large");
    }
  }

  private decodeChunks(): void {
    while (!this.ended) {
      if (this.chunkTerminator) {
        if (this.pending.length < 2) return;
        if (this.pending[0] !== 13 || this.pending[1] !== 10) {
          throw new Error("Invalid NTRIP chunk terminator");
        }
        this.pending = this.pending.subarray(2);
        this.chunkTerminator = false;
      }
      if (this.chunkRemaining == undefined) {
        const lineEnd = this.pending.indexOf("\r\n");
        if (lineEnd < 0) {
          if (this.pending.length > 1024) throw new Error("Invalid NTRIP chunk header");
          return;
        }
        const size = this.pending.toString("ascii", 0, lineEnd).split(";", 1)[0];
        if (!/^[0-9a-f]+$/i.test(size) || !Number.isSafeInteger(Number.parseInt(size, 16))) {
          throw new Error("Invalid NTRIP chunk size");
        }
        this.chunkRemaining = Number.parseInt(size, 16);
        this.pending = this.pending.subarray(lineEnd + 2);
        if (this.chunkRemaining === 0) {
          this.ended = true;
          this.pending = Buffer.alloc(0);
          this.onEnd();
          return;
        }
      }
      if (this.pending.length === 0) return;
      const length = Math.min(this.chunkRemaining, this.pending.length);
      this.onData(this.pending.subarray(0, length));
      this.pending = this.pending.subarray(length);
      this.chunkRemaining -= length;
      if (this.chunkRemaining === 0) {
        this.chunkRemaining = undefined;
        this.chunkTerminator = true;
      }
    }
  }
}
