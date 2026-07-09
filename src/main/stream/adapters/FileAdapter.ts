import { mkdir, open, readFile, rm, type FileHandle } from "node:fs/promises";
import path from "node:path";
import type { FileParams, StreamAdapterStatus, StreamMode } from "../../../shared/stream";
import type { StreamAdapter } from "./StreamAdapter";

const timeTagHeaderLength = 64;
const timeTagStartTimeLength = 12;
const timeTagRecordsOffset = timeTagHeaderLength + timeTagStartTimeLength;

interface TimeTagEntry {
  tick: number;
  position: number;
}

export class FileAdapter implements StreamAdapter {
  public readonly type = "file";
  private handle?: FileHandle;
  private tagHandle?: FileHandle;
  private status: StreamAdapterStatus["status"] = "idle";
  private error?: string;
  private position = 0;
  private fileSize = 0;
  private openTimeMs = 0;
  private allowedPosition = 0;
  private nextTagIndex = 0;
  private nextTagTick = 0;
  private tagPosition = timeTagRecordsOffset;
  private readonly tagEntries: TimeTagEntry[] = [];
  private readonly filePositionBytes: 4 | 8;

  public constructor(
    public readonly id: string,
    public readonly mode: StreamMode,
    private readonly params: FileParams
  ) {
    this.filePositionBytes = params.filePositionBytes ?? 4;
  }

  public async open(): Promise<void> {
    this.status = "connecting";
    try {
      if (this.mode === "input") {
        await this.openInput();
      } else {
        await this.openOutput();
      }
      this.status = "connected";
      this.error = undefined;
    } catch (error) {
      this.markError(error);
      await this.close().catch(() => undefined);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.handle?.close().catch(() => undefined);
    await this.tagHandle?.close().catch(() => undefined);
    this.handle = undefined;
    this.tagHandle = undefined;
    this.status = "idle";
  }

  public async read(maxBytes: number): Promise<Buffer | undefined> {
    if (this.mode !== "input") {
      throw new Error("File output endpoints are write-only");
    }
    if (this.handle == undefined) {
      throw new Error(`${this.id} is not open`);
    }
    this.updateAllowedPosition();
    const available = Math.min(maxBytes, this.allowedPosition - this.position);
    if (available <= 0) {
      if (this.position >= this.fileSize) {
        this.status = "idle";
      }
      return undefined;
    }

    const buffer = Buffer.alloc(available);
    const result = await this.handle.read(buffer, 0, available, this.position);
    if (result.bytesRead <= 0) {
      this.status = "idle";
      return undefined;
    }
    this.position += result.bytesRead;
    return buffer.subarray(0, result.bytesRead);
  }

  public async write(data: Buffer): Promise<void> {
    if (this.mode !== "output") {
      throw new Error("File input endpoints are read-only");
    }
    if (this.handle == undefined) {
      throw new Error(`${this.id} is not open`);
    }
    await this.handle.write(data, 0, data.length, this.position);
    this.position += data.length;
    if (this.tagHandle != undefined) {
      await this.writeTimeTagRecord();
    }
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

  private async openInput(): Promise<void> {
    this.handle = await open(this.params.path, "r");
    const stat = await this.handle.stat();
    this.fileSize = stat.size;
    this.position = 0;
    this.allowedPosition = this.params.timeTag ? 0 : this.fileSize;
    this.openTimeMs = Date.now();
    this.nextTagIndex = 0;
    this.nextTagTick = 0;

    if (this.params.timeTag) {
      const entries = await readRtklibTimeTag(this.params);
      this.tagEntries.length = 0;
      for (const entry of entries) {
        this.tagEntries.push(entry);
      }
    }
  }

  private async openOutput(): Promise<void> {
    await mkdir(path.dirname(this.params.path), { recursive: true });
    this.handle = await open(this.params.path, "w");
    this.position = 0;
    this.fileSize = 0;
    this.openTimeMs = Date.now();
    if (this.params.timeTag) {
      this.tagHandle = await open(`${this.params.path}.tag`, "w");
      await this.tagHandle.write(createTimeTagHeader(this.openTimeMs), 0, timeTagRecordsOffset, 0);
      this.tagPosition = timeTagRecordsOffset;
    } else {
      await rm(`${this.params.path}.tag`, { force: true });
    }
  }

  private updateAllowedPosition(): void {
    if (!this.params.timeTag) {
      this.allowedPosition = this.fileSize;
      return;
    }
    const replaySpeed = this.params.replaySpeed ?? 1;
    const startOffsetMs = (this.params.startOffset ?? 0) * 1000;
    const elapsedMs = (Date.now() - this.openTimeMs) * replaySpeed + startOffsetMs;

    while (this.nextTagTick <= elapsedMs) {
      if (this.nextTagIndex >= this.tagEntries.length) {
        this.nextTagTick = Number.POSITIVE_INFINITY;
        this.allowedPosition = this.fileSize;
        break;
      }
      this.allowedPosition = Math.min(this.fileSize, this.tagEntries[this.nextTagIndex].position);
      this.nextTagTick = this.tagEntries[this.nextTagIndex].tick;
      this.nextTagIndex++;
    }
  }

  private async writeTimeTagRecord(): Promise<void> {
    if (this.tagHandle == undefined) {
      return;
    }
    const record = Buffer.alloc(4 + this.filePositionBytes);
    record.writeUInt32LE((Date.now() - this.openTimeMs) >>> 0, 0);
    if (this.filePositionBytes === 4) {
      if (this.position > 0xffffffff) {
        throw new Error("File position exceeds 32-bit RTKLIB time-tag limit");
      }
      record.writeUInt32LE(this.position, 4);
    } else {
      record.writeBigUInt64LE(BigInt(this.position), 4);
    }
    await this.tagHandle.write(record, 0, record.length, this.tagPosition);
    this.tagPosition += record.length;
  }

  private markError(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
    this.status = "error";
  }
}

async function readRtklibTimeTag(params: FileParams): Promise<TimeTagEntry[]> {
  const tagPath = `${params.path}.tag`;
  const filePositionBytes = params.filePositionBytes ?? 4;
  const tag = await readFile(tagPath);
  if (tag.length < timeTagRecordsOffset) {
    throw new Error(`RTKLIB time-tag file is too short: ${tagPath}`);
  }
  const headerText = tag.subarray(0, 14).toString("ascii");
  if (headerText !== "TIMETAG RTKLIB") {
    throw new Error(`Invalid RTKLIB time-tag header: ${tagPath}`);
  }

  const entries: TimeTagEntry[] = [];
  for (
    let offset = timeTagRecordsOffset;
    offset + 4 + filePositionBytes <= tag.length;
    offset += 4 + filePositionBytes
  ) {
    const tick = tag.readUInt32LE(offset);
    const position =
      filePositionBytes === 4 ? tag.readUInt32LE(offset + 4) : Number(tag.readBigUInt64LE(offset + 4));
    if (!Number.isSafeInteger(position)) {
      throw new Error(`RTKLIB time-tag file position is too large: ${tagPath}`);
    }
    entries.push({ tick, position });
  }
  return entries;
}

function createTimeTagHeader(openTimeMs: number): Buffer {
  const header = Buffer.alloc(timeTagRecordsOffset);
  header.write("TIMETAG RTKLIB Nav-Bridge", 0, "ascii");
  header.writeUInt32LE(openTimeMs >>> 0, 60);
  const nowSeconds = Math.floor(openTimeMs / 1000);
  header.writeUInt32LE(nowSeconds, 64);
  header.writeDoubleLE(0, 68);
  return header;
}
