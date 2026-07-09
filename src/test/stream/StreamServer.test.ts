import net from "node:net";
import { TcpAdapter } from "../../main/stream/adapters/TcpAdapter";
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

  public pushRead(data: Buffer): void {
    this.reads.push(data);
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

  public getClients(): number {
    return 0;
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition");
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

  it("emits input data entries with raw bytes", async () => {
    const input = new MemoryAdapter("input", "tcp-server", "input", [Buffer.from("abc")]);
    const outputA = new MemoryAdapter("out-a", "tcp-client", "output");
    const outputB = new MemoryAdapter("out-b", "udp-client", "output");
    const server = new StreamServer(input, [outputA, outputB], {
      bufferSize: 16,
      idleDelayMs: 1
    });
    const entries: Array<{ data: number[] }> = [];

    server.onData((entry) => entries.push(entry));

    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await server.stop();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.data).toEqual([0x61, 0x62, 0x63]);
  });

  it("counts and emits data from a real TCP client input after the server sends payload", async () => {
    const sourceServer = net.createServer((socket) => {
      socket.write(Buffer.from("hello"));
    });
    await new Promise<void>((resolve) => sourceServer.listen(0, "127.0.0.1", resolve));
    const address = sourceServer.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("Expected TCP address object");
    }

    const input = new TcpAdapter("input", "input", {
      type: "tcp-client",
      params: { host: "127.0.0.1", port: address.port }
    });
    const output = new MemoryAdapter("output-1", "udp-client", "output");
    const server = new StreamServer(input, [output], {
      bufferSize: 16,
      idleDelayMs: 1
    });
    const entries: Array<{ data: number[] }> = [];

    server.onData((entry) => entries.push(entry));
    await server.start();
    await waitFor(() => server.getStatus().input.bytes === 5);
    await server.stop();
    await new Promise<void>((resolve) => sourceServer.close(() => resolve()));

    expect(output.written.map((chunk) => chunk.toString())).toEqual(["hello"]);
    expect(server.getStatus().input.bytes).toBe(5);
    expect(entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ data: [0x68, 0x65, 0x6c, 0x6c, 0x6f] })])
    );
  });

  it("keeps a TCP server output idle at start and waiting when data has no clients", async () => {
    const input = new MemoryAdapter("input", "tcp-server", "input", []);
    const output = new TcpAdapter("output-1", "output", {
      type: "tcp-server",
      params: { host: "127.0.0.1", port: 0 }
    });

    const server = new StreamServer(input, [output], {
      bufferSize: 16,
      idleDelayMs: 1,
      statusInterval: 50
    });

    await server.start();
    expect(server.getStatus().outputs[0]?.status).toBe("idle");

    input.pushRead(Buffer.from("abc"));
    await waitFor(() => server.getStatus().input.bytes === 3);
    await waitFor(() => server.getStatus().outputs[0]?.status === "waiting");

    await server.stop();

    const status = server.getStatus();
    expect(status.outputs[0]?.status).not.toBe("error");
    expect(status.outputs[0]?.bytes).toBe(0);
    await output.close();
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
