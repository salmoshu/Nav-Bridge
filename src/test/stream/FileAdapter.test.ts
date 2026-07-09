import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileAdapter } from "../../main/stream/adapters/FileAdapter";

async function createTempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "nav-bridge-file-adapter-"));
}

function createRtklibTag(entries: Array<{ tick: number; position: number }>, filePositionBytes = 4): Buffer {
  const header = Buffer.alloc(64);
  header.write("TIMETAG RTKLIB test", 0, "ascii");
  header.writeUInt32LE(0, 60);
  const startTime = Buffer.alloc(12);
  startTime.writeUInt32LE(0, 0);
  startTime.writeDoubleLE(0, 4);
  const records = entries.map((entry) => {
    const record = Buffer.alloc(4 + filePositionBytes);
    record.writeUInt32LE(entry.tick, 0);
    if (filePositionBytes === 4) {
      record.writeUInt32LE(entry.position, 4);
    } else {
      record.writeBigUInt64LE(BigInt(entry.position), 4);
    }
    return record;
  });
  return Buffer.concat([header, startTime, ...records]);
}

describe("FileAdapter", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads a plain file as an input stream", async () => {
    const filePath = path.join(tempDir, "input.bin");
    await writeFile(filePath, Buffer.from("abcdef"));
    const adapter = new FileAdapter("input", "input", { path: filePath, timeTag: false });

    await adapter.open();
    await expect(adapter.read(2)).resolves.toEqual(Buffer.from("ab"));
    await expect(adapter.read(10)).resolves.toEqual(Buffer.from("cdef"));
    await expect(adapter.read(10)).resolves.toBeUndefined();
    await adapter.close();
  });

  it("replays a time-tagged file according to RTKLIB tag records", async () => {
    const filePath = path.join(tempDir, "tagged.bin");
    await writeFile(filePath, Buffer.from("abcdef"));
    await writeFile(
      `${filePath}.tag`,
      createRtklibTag([
        { tick: 50, position: 2 },
        { tick: 100, position: 6 }
      ])
    );
    const adapter = new FileAdapter("input", "input", {
      path: filePath,
      timeTag: true,
      replaySpeed: 1,
      startOffset: 0,
      filePositionBytes: 4
    });

    await adapter.open();
    await expect(adapter.read(10)).resolves.toEqual(Buffer.from("ab"));
    await expect(adapter.read(10)).resolves.toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 70));
    await expect(adapter.read(10)).resolves.toEqual(Buffer.from("cdef"));
    await adapter.close();
  });

  it("falls back to the full file when a RTKLIB time-tag file has no records", async () => {
    const filePath = path.join(tempDir, "empty-tag.bin");
    await writeFile(filePath, Buffer.from("abcdef"));
    await writeFile(`${filePath}.tag`, createRtklibTag([]));
    const adapter = new FileAdapter("input", "input", {
      path: filePath,
      timeTag: true,
      replaySpeed: 1,
      startOffset: 0,
      filePositionBytes: 4
    });

    await adapter.open();
    await expect(adapter.read(10)).resolves.toEqual(Buffer.from("abcdef"));
    await adapter.close();
  });

  it("replays a time-tagged file with 8-byte file positions", async () => {
    const filePath = path.join(tempDir, "tagged-8-byte.bin");
    await writeFile(filePath, Buffer.from("abcdef"));
    await writeFile(`${filePath}.tag`, createRtklibTag([{ tick: 20, position: 3 }], 8));
    const adapter = new FileAdapter("input", "input", {
      path: filePath,
      timeTag: true,
      replaySpeed: 1,
      startOffset: 0,
      filePositionBytes: 8
    });

    await adapter.open();
    await expect(adapter.read(10)).resolves.toEqual(Buffer.from("abc"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    await expect(adapter.read(10)).resolves.toEqual(Buffer.from("def"));
    await adapter.close();
  });

  it("writes a RTKLIB-compatible time tag file for output streams", async () => {
    const filePath = path.join(tempDir, "output.bin");
    const adapter = new FileAdapter("output-1", "output", {
      path: filePath,
      timeTag: true,
      filePositionBytes: 4
    });

    await adapter.open();
    await adapter.write(Buffer.from("abc"));
    await adapter.write(Buffer.from("de"));
    await adapter.close();

    await expect(readFile(filePath)).resolves.toEqual(Buffer.from("abcde"));
    const tag = await readFile(`${filePath}.tag`);
    expect(tag.subarray(0, 14).toString("ascii")).toBe("TIMETAG RTKLIB");
    expect(tag.length).toBe(64 + 12 + 8 * 2);
    expect(tag.readUInt32LE(64 + 12 + 4)).toBe(3);
    expect(tag.readUInt32LE(64 + 12 + 8 + 4)).toBe(5);
  });

  it("removes a stale time tag when writing a plain output file", async () => {
    const filePath = path.join(tempDir, "plain-output.bin");
    await writeFile(`${filePath}.tag`, createRtklibTag([{ tick: 0, position: 1 }]));
    const adapter = new FileAdapter("output-1", "output", {
      path: filePath,
      timeTag: false
    });

    await adapter.open();
    await adapter.write(Buffer.from("abc"));
    await adapter.close();

    await expect(stat(`${filePath}.tag`)).rejects.toThrow();
  });
});
