import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileAdapter } from "../../main/stream/adapters/FileAdapter";
import { StreamServer } from "../../main/stream/StreamServer";

async function createTempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "nav-bridge-file-server-"));
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

describe("StreamServer with file endpoints", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("runs file input with no outputs", async () => {
    const filePath = path.join(tempDir, "input.bin");
    await writeFile(filePath, Buffer.from("hello"));
    const input = new FileAdapter("input", "input", { path: filePath, timeTag: false });
    const server = new StreamServer(input, [], { statusInterval: 50 });

    const statuses: unknown[] = [];
    server.onStatus((status) => statuses.push(status));
    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await server.stop();

    expect(statuses.length).toBeGreaterThan(0);
  });

  it("runs file input to file output", async () => {
    const inputPath = path.join(tempDir, "input.bin");
    const outputPath = path.join(tempDir, "output.bin");
    await writeFile(inputPath, Buffer.from("hello"));
    const input = new FileAdapter("input", "input", { path: inputPath, timeTag: false });
    const output = new FileAdapter("output-1", "output", { path: outputPath, timeTag: false });
    const server = new StreamServer(input, [output], { statusInterval: 50 });

    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await server.stop();

    const { readFile } = await import("node:fs/promises");
    await expect(readFile(outputPath)).resolves.toEqual(Buffer.from("hello"));
  });

  it("reports a completed file input as idle without stopping outputs", async () => {
    const inputPath = path.join(tempDir, "input.bin");
    const outputPath = path.join(tempDir, "output.bin");
    await writeFile(inputPath, Buffer.from("hello"));
    const input = new FileAdapter("input", "input", { path: inputPath, timeTag: false });
    const output = new FileAdapter("output-1", "output", { path: outputPath, timeTag: false });
    const server = new StreamServer(input, [output], { idleDelayMs: 1, statusInterval: 50 });

    await server.start();
    try {
      await waitFor(() => server.getStatus().input.status === "idle");

      const status = server.getStatus();
      expect(status.running).toBe(true);
      expect(status.input.status).toBe("idle");
      expect(status.outputs[0]?.status).toBe("connected");
    } finally {
      await server.stop();
    }
  });
});
