export class QueuedReads {
  private readonly chunks: Buffer[] = [];
  private readonly waiters: Array<(chunk: Buffer | undefined) => void> = [];
  private closed = false;

  public push(chunk: Buffer): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter != undefined) {
      waiter(chunk);
      return;
    }
    this.chunks.push(Buffer.from(chunk));
  }

  public async read(maxBytes: number, timeoutMs = 20): Promise<Buffer | undefined> {
    const chunk = this.chunks.shift();
    if (chunk != undefined) {
      if (chunk.length <= maxBytes) {
        return chunk;
      }
      this.chunks.unshift(chunk.subarray(maxBytes));
      return chunk.subarray(0, maxBytes);
    }
    if (this.closed) {
      return undefined;
    }

    return await new Promise<Buffer | undefined>((resolve) => {
      const waiter = (next: Buffer | undefined): void => {
        clearTimeout(timer);
        resolve(next);
      };
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        resolve(undefined);
      }, timeoutMs);

      this.waiters.push(waiter);
    });
  }

  public close(): void {
    this.closed = true;
    while (this.waiters.length > 0) {
      this.waiters.shift()?.(undefined);
    }
    this.chunks.length = 0;
  }
}
