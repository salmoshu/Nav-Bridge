import { StreamServer } from "../../main/stream/StreamServer";
import type { StreamAdapter } from "../../main/stream/adapters/StreamAdapter";
import type { StreamAdapterStatus, StreamMode, StreamType } from "../../shared/stream";

class MemoryAdapter implements StreamAdapter {
  public opened = false;
  public closed = false;
  public written: Buffer[] = [];
  private reads: Buffer[];

  public constructor(
    public readonly id: string,
    public readonly type: StreamType,
    public readonly mode: StreamMode,
    reads: Buffer[] = []
  ) {
    this.reads = [...reads];
  }

  public async open(): Promise<void> {
    this.opened = true;
  }

  public async close(): Promise<void> {
    this.closed = true;
  }

  public async read(): Promise<Buffer | undefined> {
    return this.reads.shift();
  }

  public async write(data: Buffer): Promise<void> {
    this.written.push(Buffer.from(data));
  }

  public getStatus(): StreamAdapterStatus {
    return {
      id: this.id,
      type: this.type,
      mode: this.mode,
      status: this.opened ? "connected" : "idle"
    };
  }
}

describe("StreamServer", () => {
  it("forwards each input chunk to all outputs and updates byte totals", async () => {
    const input = new MemoryAdapter("input", "tcp-server", "input", [
      Buffer.from("abc"),
      Buffer.from("defg")
    ]);
    const outputA = new MemoryAdapter("out-a", "tcp-client", "output");
    const outputB = new MemoryAdapter("out-b", "udp-client", "output");

    const server = new StreamServer(input, [outputA, outputB], {
      bufferSize: 16,
      idleDelayMs: 1
    });

    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await server.stop();

    expect(outputA.written.map((chunk) => chunk.toString())).toEqual(["abc", "defg"]);
    expect(outputB.written.map((chunk) => chunk.toString())).toEqual(["abc", "defg"]);
    expect(server.getStatus().input.bytes).toBe(7);
    expect(server.getStatus().outputs.map((output) => output.bytes)).toEqual([7, 7]);
  });

  it("rolls back opened adapters when startup fails", async () => {
    const input = new MemoryAdapter("input", "tcp-server", "input");
    const openedOutput = new MemoryAdapter("out-a", "tcp-client", "output");
    const failingOutput = new MemoryAdapter("out-b", "udp-client", "output");
    failingOutput.open = async () => {
      throw new Error("open failed");
    };

    const server = new StreamServer(input, [openedOutput, failingOutput]);

    await expect(server.start()).rejects.toThrow("open failed");
    expect(input.closed).toBe(true);
    expect(openedOutput.closed).toBe(true);
    expect(failingOutput.closed).toBe(true);
    expect(server.getStatus().running).toBe(false);
  });
});
