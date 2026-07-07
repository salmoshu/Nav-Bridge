import type { StreamStatus, StreamType } from "../../../shared/stream";

interface MetricSeed {
  id: string;
  type: StreamType;
}

interface Counter extends MetricSeed {
  bytes: number;
  lastBytes: number;
  bps: number;
  status: "idle" | "connecting" | "connected" | "error";
  error?: string;
}

export class StreamStatistics {
  private input: Counter;
  private outputs: Counter[];
  private lastSampleTime: number;

  public constructor(
    input: MetricSeed,
    outputs: MetricSeed[],
    private readonly now: () => number = Date.now
  ) {
    this.input = this.createCounter(input);
    this.outputs = outputs.map((output) => this.createCounter(output));
    this.lastSampleTime = this.now();
  }

  public setInputStatus(status: Counter["status"], error?: string): void {
    this.input.status = status;
    this.input.error = error;
  }

  public setOutputStatus(index: number, status: Counter["status"], error?: string): void {
    const output = this.outputs[index];
    if (output == undefined) {
      return;
    }
    output.status = status;
    output.error = error;
  }

  public markInputBytes(bytes: number): void {
    this.input.bytes += bytes;
  }

  public markOutputBytes(index: number, bytes: number): void {
    const output = this.outputs[index];
    if (output != undefined) {
      output.bytes += bytes;
    }
  }

  public snapshot(running: boolean): StreamStatus {
    this.recalculateRates();
    return {
      running,
      input: { ...this.input },
      outputs: this.outputs.map((output) => ({ ...output }))
    };
  }

  private createCounter(seed: MetricSeed): Counter {
    return {
      ...seed,
      bytes: 0,
      lastBytes: 0,
      bps: 0,
      status: "idle"
    };
  }

  private recalculateRates(): void {
    const currentTime = this.now();
    const elapsedMs = currentTime - this.lastSampleTime;
    if (elapsedMs <= 0) {
      return;
    }

    const update = (counter: Counter): void => {
      const delta = counter.bytes - counter.lastBytes;
      counter.bps = Math.round((delta * 8 * 1000) / elapsedMs);
      counter.lastBytes = counter.bytes;
    };

    update(this.input);
    this.outputs.forEach(update);
    this.lastSampleTime = currentTime;
  }
}
