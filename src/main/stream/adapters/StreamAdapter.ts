import type { StreamAdapterStatus, StreamMode, StreamType } from "../../../shared/stream";

export interface StreamAdapter {
  readonly id: string;
  readonly type: StreamType;
  readonly mode: StreamMode;
  open(): Promise<void>;
  close(): Promise<void>;
  read(maxBytes: number): Promise<Buffer | undefined>;
  write(data: Buffer): Promise<void>;
  getStatus(): StreamAdapterStatus;
}
