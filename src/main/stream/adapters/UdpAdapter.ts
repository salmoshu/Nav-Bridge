import dgram from "node:dgram";
import type {
  StreamAdapterStatus,
  StreamMode,
  UdpClientParams,
  UdpServerParams
} from "../../../shared/stream";
import type { StreamAdapter } from "./StreamAdapter";
import { QueuedReads } from "./queuedReads";

type UdpAdapterConfig =
  { type: "udp-server"; params: UdpServerParams } | { type: "udp-client"; params: UdpClientParams };

export class UdpAdapter implements StreamAdapter {
  public readonly type: "udp-server" | "udp-client";
  private socket?: dgram.Socket;
  private status: StreamAdapterStatus["status"] = "idle";
  private error?: string;
  private readonly reads = new QueuedReads();

  public constructor(
    public readonly id: string,
    public readonly mode: StreamMode,
    private readonly config: UdpAdapterConfig
  ) {
    this.type = config.type;
  }

  public async open(): Promise<void> {
    this.status = "connecting";
    try {
      this.socket = dgram.createSocket("udp4");
      this.socket.on("message", (message) => this.reads.push(message));
      this.socket.on("error", (error) => {
        this.error = error.message;
        this.status = "error";
      });

      if (this.config.type === "udp-server") {
        await new Promise<void>((resolve, reject) => {
          const onError = (error: Error): void => {
            this.socket?.off("listening", onListening);
            reject(error);
          };
          const onListening = (): void => {
            this.socket?.off("error", onError);
            resolve();
          };
          this.socket?.once("error", onError);
          this.socket?.once("listening", onListening);
          this.socket?.bind(this.config.params.port, this.config.params.host ?? "0.0.0.0");
        });
      }
      this.status = "connected";
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.status = "error";
      await this.close().catch(() => undefined);
      throw error;
    }
  }

  public async close(): Promise<void> {
    this.reads.close();
    if (this.socket != undefined) {
      const socket = this.socket;
      this.socket = undefined;
      try {
        await new Promise<void>((resolve) => socket.close(() => resolve()));
      } catch {
        // Node throws if close is called before bind/listen completed.
      }
    }
    this.status = "idle";
  }

  public async read(maxBytes: number): Promise<Buffer | undefined> {
    return await this.reads.read(maxBytes);
  }

  public async write(data: Buffer): Promise<void> {
    if (this.config.type !== "udp-client") {
      throw new Error("UDP server endpoints are read-only in v0.0.1");
    }
    if (this.socket == undefined) {
      throw new Error(`${this.id} is not open`);
    }
    await new Promise<void>((resolve, reject) => {
      this.socket?.send(data, this.config.params.port, this.config.params.host, (error) => {
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
    const address = this.socket?.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("UDP socket is not bound to an IP port");
    }
    return address.port;
  }
}
