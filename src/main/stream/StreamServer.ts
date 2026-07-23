import { setTimeout as delay } from "node:timers/promises";
import type { StreamDataEntry, StreamStatus } from "../../shared/stream";
import type { StreamAdapter } from "./adapters/StreamAdapter";
import { StreamStatistics } from "./statistics/StreamStatistics";

export interface StreamServerOptions {
  bufferSize?: number;
  idleDelayMs?: number;
  statusInterval?: number;
}

type StatusListener = (status: StreamStatus) => void;
type DataListener = (entry: StreamDataEntry) => void;

export class StreamServer {
  private readonly statistics: StreamStatistics;
  private readonly listeners = new Set<StatusListener>();
  private readonly dataListeners = new Set<DataListener>();
  private running = false;
  private loopPromise?: Promise<void>;
  private statusTimer?: NodeJS.Timeout;
  private readonly bufferSize: number;
  private readonly idleDelayMs: number;
  private readonly statusInterval: number;

  public constructor(
    private readonly input: StreamAdapter,
    private readonly outputs: StreamAdapter[],
    options: StreamServerOptions = {}
  ) {
    this.bufferSize = options.bufferSize ?? 4096;
    this.idleDelayMs = options.idleDelayMs ?? 5;
    this.statusInterval = options.statusInterval ?? 1000;
    this.statistics = new StreamStatistics(
      { id: input.id, type: input.type },
      outputs.map((output) => ({ id: output.id, type: output.type }))
    );
  }

  public async start(): Promise<void> {
    if (this.running) {
      return;
    }

    const opened: StreamAdapter[] = [];
    try {
      this.statistics.setInputStatus("connecting");
      await this.input.open();
      opened.push(this.input);
      this.statistics.setInputStatus("connected");

      for (const [index, output] of this.outputs.entries()) {
        this.statistics.setOutputStatus(index, "connecting");
        await output.open();
        opened.push(output);
        this.syncOutputStatus(index, output);
      }
    } catch (error) {
      this.running = false;
      const current = opened.length === 0 ? this.input : this.outputs[opened.length - 1];
      await current?.close().catch(() => undefined);
      for (const adapter of opened.reverse()) {
        await adapter.close().catch(() => undefined);
      }
      this.emitStatus();
      throw error;
    }

    this.running = true;
    this.loopPromise = this.runLoop();
    this.statusTimer = setInterval(() => this.emitStatus(), this.statusInterval);
    this.emitStatus();
  }

  public async stop(): Promise<void> {
    if (!this.running && this.loopPromise == undefined) {
      return;
    }

    this.running = false;
    if (this.statusTimer != undefined) {
      clearInterval(this.statusTimer);
      this.statusTimer = undefined;
    }

    await this.loopPromise?.catch(() => undefined);
    this.loopPromise = undefined;

    await this.input.close().catch((error: unknown) => {
      this.statistics.setInputStatus("error", this.toErrorMessage(error));
    });

    await Promise.all(
      this.outputs.map(async (output, index) => {
        try {
          await output.close();
          this.statistics.setOutputStatus(index, "idle");
        } catch (error) {
          this.statistics.setOutputStatus(index, "error", this.toErrorMessage(error));
        }
      })
    );
    this.statistics.setInputStatus("idle");
    this.emitStatus();
  }

  public getStatus(): StreamStatus {
    this.syncInputStatus();
    for (const [index, output] of this.outputs.entries()) {
      this.syncOutputStatus(index, output);
    }
    return this.statistics.snapshot(this.running);
  }

  private syncInputStatus(): void {
    if (!this.running || this.input.type !== "file") {
      return;
    }
    if (this.input.getStatus().status === "idle") {
      this.statistics.setInputStatus("idle");
    }
  }

  private syncOutputStatus(index: number, output: StreamAdapter): void {
    const adapterStatus = output.getStatus().status;
    if (adapterStatus === "error") {
      return;
    }
    if (output.type === "tcp-server") {
      const clients = output.getClients();
      const currentStatus = this.statistics.getOutputStatus(index);
      this.statistics.setOutputClients(index, clients);
      if (clients > 0) {
        this.statistics.setOutputStatus(index, "connected");
      } else if (currentStatus !== "waiting") {
        this.statistics.setOutputStatus(index, "idle");
      }
      return;
    }
    this.statistics.setOutputStatus(index, adapterStatus);
  }

  public onStatus(callback: StatusListener): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  public onData(callback: DataListener): () => void {
    this.dataListeners.add(callback);
    return () => {
      this.dataListeners.delete(callback);
    };
  }

  private async runLoop(): Promise<void> {
    while (this.running) {
      try {
        const data = await this.input.read(this.bufferSize);
        if (data == undefined || data.length === 0) {
          await delay(this.idleDelayMs);
          continue;
        }

        this.statistics.markInputBytes(data.length);
        this.emitData(data);
        await Promise.all(
          this.outputs.map(async (output, index) => {
            if (output.type === "tcp-server" && output.getClients() === 0) {
              this.statistics.setOutputStatus(index, "waiting");
              return;
            }
            try {
              await output.write(data);
              this.statistics.markOutputBytes(index, data.length);
              this.statistics.setOutputStatus(index, "connected");
            } catch (error) {
              this.statistics.setOutputStatus(index, "error", this.toErrorMessage(error));
            }
          })
        );
        // Status is broadcast on the statusTimer interval; emitting per chunk
        // would flood IPC and re-render the windows for every read.
      } catch (error) {
        this.statistics.setInputStatus("error", this.toErrorMessage(error));
        this.emitStatus();
        await delay(this.idleDelayMs);
      }
    }
  }

  private emitStatus(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  private emitData(data: Buffer): void {
    const entry: StreamDataEntry = {
      time: new Date().toISOString(),
      data: Array.from(data)
    };
    this.dataListeners.forEach((listener) => listener(entry));
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
