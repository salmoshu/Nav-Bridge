import type { StreamStatus, StreamType } from "../../../shared/stream";

interface MetricSeed {
  id: string;
  type: StreamType;
}

interface Counter extends MetricSeed {
  bytes: number;
  bps: number;
  status: "idle" | "connecting" | "connected" | "waiting" | "error";
  connectedAt?: number;
  clients?: number;
  error?: string;
  rateBytes: number;
  rateTime: number;
}

export class StreamStatistics {
  private input: Counter;
  private outputs: Counter[];

  public constructor(
    input: MetricSeed,
    outputs: MetricSeed[],
    private readonly now: () => number = Date.now,
    private readonly rateIntervalMs: number = 1000
  ) {
    const startTime = this.now();
    this.input = this.createCounter(input, startTime);
    this.outputs = outputs.map((output) => this.createCounter(output, startTime));
  }

  public setInputStatus(status: Counter["status"], error?: string): void {
    if (status === "connected" && this.input.status !== "connected") {
      this.input.connectedAt = this.now();
    } else if (status !== "connected") {
      this.input.connectedAt = undefined;
    }
    this.input.status = status;
    this.input.error = error;
  }

  public setOutputStatus(index: number, status: Counter["status"], error?: string): void {
    const output = this.outputs[index];
    if (output == undefined) {
      return;
    }
    if (status === "connected" && output.status !== "connected") {
      output.connectedAt = this.now();
    } else if (status !== "connected") {
      output.connectedAt = undefined;
      output.clients = undefined;
    }
    output.status = status;
    output.error = error;
  }

  public setOutputClients(index: number, clients: number): void {
    const output = this.outputs[index];
    if (output != undefined) {
      output.clients = clients;
    }
  }

  public getOutputStatus(index: number): Counter["status"] | undefined {
    return this.outputs[index]?.status;
  }

  public getOutputClients(index: number): number | undefined {
    return this.outputs[index]?.clients;
  }

  public markInputBytes(bytes: number): void {
    this.input.bytes += bytes;
    this.updateInputRate();
  }

  public markOutputBytes(index: number, bytes: number): void {
    const output = this.outputs[index];
    if (output != undefined) {
      output.bytes += bytes;
      this.updateOutputRate(output);
    }
  }

  public snapshot(running: boolean): StreamStatus {
    this.updateInputRate();
    this.outputs.forEach((output) => this.updateOutputRate(output));
    return {
      running,
      input: this.snapshotCounter(this.input),
      outputs: this.outputs.map((output) => this.snapshotCounter(output))
    };
  }

  private createCounter(seed: MetricSeed, startTime: number): Counter {
    return {
      ...seed,
      bytes: 0,
      bps: 0,
      status: "idle",
      rateBytes: 0,
      rateTime: startTime
    };
  }

  private snapshotCounter(counter: Counter): import("../../../shared/stream").StreamMetric {
    const snapshot: import("../../../shared/stream").StreamMetric = { ...counter };
    delete (snapshot as Partial<Pick<Counter, "connectedAt" | "rateBytes" | "rateTime">>).connectedAt;
    delete (snapshot as Partial<Pick<Counter, "connectedAt" | "rateBytes" | "rateTime">>).rateBytes;
    delete (snapshot as Partial<Pick<Counter, "connectedAt" | "rateBytes" | "rateTime">>).rateTime;
    if (counter.connectedAt != undefined) {
      snapshot.uptime = Math.round(((this.now() - counter.connectedAt) / 1000) * 10) / 10;
    }
    return snapshot;
  }

  private updateInputRate(): void {
    const currentTime = this.now();
    const elapsedMs = currentTime - this.input.rateTime;
    if (elapsedMs < this.rateIntervalMs) {
      return;
    }
    const delta = this.input.bytes - this.input.rateBytes;
    this.input.bps = Math.round((delta * 8 * 1000) / elapsedMs);
    this.input.rateBytes = this.input.bytes;
    this.input.rateTime = currentTime;
  }

  private updateOutputRate(output: Counter): void {
    const currentTime = this.now();
    const elapsedMs = currentTime - output.rateTime;
    if (elapsedMs < this.rateIntervalMs) {
      return;
    }
    const delta = output.bytes - output.rateBytes;
    output.bps = Math.round((delta * 8 * 1000) / elapsedMs);
    output.rateBytes = output.bytes;
    output.rateTime = currentTime;
  }
}
