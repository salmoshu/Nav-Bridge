import { SerialPort } from "serialport";
import type { SerialParams, StreamAdapterStatus, StreamMode } from "../../../shared/stream";
import type { StreamAdapter } from "./StreamAdapter";
import { QueuedReads } from "./queuedReads";

export class SerialAdapter implements StreamAdapter {
  public readonly type = "serial";
  private port?: SerialPort;
  private status: StreamAdapterStatus["status"] = "idle";
  private error?: string;
  private readonly reads = new QueuedReads();

  public constructor(
    public readonly id: string,
    public readonly mode: StreamMode,
    private readonly params: SerialParams
  ) {}

  public async open(): Promise<void> {
    this.status = "connecting";
    try {
      this.port = new SerialPort({
        path: this.params.port,
        baudRate: this.params.baudRate,
        dataBits: this.params.dataBits,
        parity: this.params.parity,
        stopBits: this.params.stopBits,
        rtscts: this.params.flowControl === "rtscts",
        autoOpen: false
      });
      this.port.on("data", (chunk: Buffer) => this.reads.push(chunk));
      this.port.on("error", (error) => {
        this.error = error.message;
        this.status = "error";
      });
      await new Promise<void>((resolve, reject) =>
        this.port?.open((error) => (error ? reject(error) : resolve()))
      );
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
    if (this.port != undefined && this.port.isOpen) {
      await new Promise<void>((resolve, reject) =>
        this.port?.close((error) => (error ? reject(error) : resolve()))
      );
    }
    this.port = undefined;
    this.status = "idle";
  }

  public async read(maxBytes: number): Promise<Buffer | undefined> {
    return await this.reads.read(maxBytes);
  }

  public async write(data: Buffer): Promise<void> {
    if (this.port == undefined || !this.port.isOpen) {
      throw new Error(`${this.id} serial port is not open`);
    }
    await new Promise<void>((resolve, reject) => {
      this.port?.write(data, (error) => {
        if (error != undefined) {
          reject(error);
          return;
        }
        this.port?.drain((drainError) => (drainError ? reject(drainError) : resolve()));
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

  public getClients(): number {
    return 0;
  }
}
