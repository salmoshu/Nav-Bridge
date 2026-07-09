import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileAdapter } from "../../main/stream/adapters/FileAdapter";
import { StreamServer } from "../../main/stream/StreamServer";

async function createTempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "nav-bridge-file-large-"));
}

describe("StreamServer with large file data", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("streams a 1 MB file without stack overflow", async () => {
    const inputPath = path.join(tempDir, "input.bin");
    const outputPath = path.join(tempDir, "output.bin");
    const size = 1024 * 1024;
    await writeFile(inputPath, Buffer.alloc(size, 0x41));

    const input = new FileAdapter("input", "input", { path: inputPath, timeTag: false });
    const output = new FileAdapter("output-1", "output", { path: outputPath, timeTag: false });
    const server = new StreamServer(input, [output], { bufferSize: 4096, statusInterval: 50 });

    await server.start();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await server.stop();

    const out = await readFile(outputPath);
    expect(out.length).toBe(size);
  });
});
