import { mkdtemp, open, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileAdapter } from "../../main/stream/adapters/FileAdapter";

async function createTempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "nav-bridge-large-tag-"));
}

async function createLargeRtklibTag(tagPath: string, entryCount: number): Promise<void> {
  const header = Buffer.alloc(64);
  header.write("TIMETAG RTKLIB test", 0, "ascii");
  header.writeUInt32LE(0, 60);
  const startTime = Buffer.alloc(12);
  startTime.writeUInt32LE(0, 0);
  startTime.writeDoubleLE(0, 4);

  const recordSize = 4 + 4;
  const records = Buffer.alloc(entryCount * recordSize);
  for (let index = 0; index < entryCount; index++) {
    const offset = index * recordSize;
    records.writeUInt32LE(index, offset);
    records.writeUInt32LE(index, offset + 4);
  }

  const handle = await open(tagPath, "w");
  try {
    await handle.write(header, 0, header.length, 0);
    await handle.write(startTime, 0, startTime.length, header.length);
    await handle.write(records, 0, records.length, header.length + startTime.length);
  } finally {
    await handle.close();
  }
}

describe("FileAdapter with large time-tag files", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("opens a time-tagged file with 200,000 tag records without stack overflow", async () => {
    const filePath = path.join(tempDir, "tagged.bin");
    await writeFile(filePath, Buffer.alloc(200_000, 0x41));
    const tagPath = `${filePath}.tag`;
    await createLargeRtklibTag(tagPath, 200_000);

    const adapter = new FileAdapter("input", "input", {
      path: filePath,
      timeTag: true,
      replaySpeed: 1,
      startOffset: 0,
      filePositionBytes: 4
    });

    await expect(adapter.open()).resolves.toBeUndefined();
    await adapter.close();
  });
});
