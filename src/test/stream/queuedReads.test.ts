import { QueuedReads } from "../../main/stream/adapters/queuedReads";

describe("QueuedReads", () => {
  it("returns data immediately when a chunk is already queued", async () => {
    const reads = new QueuedReads();
    reads.push(Buffer.from("hello"));
    await expect(reads.read(1024)).resolves.toEqual(Buffer.from("hello"));
  });

  it("resolves a waiting read when data is pushed", async () => {
    const reads = new QueuedReads();
    const readPromise = reads.read(1024, 100);
    reads.push(Buffer.from("world"));
    await expect(readPromise).resolves.toEqual(Buffer.from("world"));
  });

  it("removes stale waiters after timeout so data is not lost", async () => {
    const reads = new QueuedReads();

    // Several reads time out before any data arrives.
    await expect(reads.read(1024, 10)).resolves.toBeUndefined();
    await expect(reads.read(1024, 10)).resolves.toBeUndefined();
    await expect(reads.read(1024, 10)).resolves.toBeUndefined();

    // Data arrives after all waiters have timed out.
    reads.push(Buffer.from("delayed"));

    // The next read must see the stored chunk instead of resolving a stale waiter.
    await expect(reads.read(1024)).resolves.toEqual(Buffer.from("delayed"));
  });

  it("splits a chunk that exceeds maxBytes", async () => {
    const reads = new QueuedReads();
    reads.push(Buffer.from("abcdef"));
    const first = await reads.read(3);
    const second = await reads.read(3);
    expect(first).toEqual(Buffer.from("abc"));
    expect(second).toEqual(Buffer.from("def"));
  });

  it("drops further pushes after close", async () => {
    const reads = new QueuedReads();
    reads.close();
    reads.push(Buffer.from("ignored"));
    await expect(reads.read(1024)).resolves.toBeUndefined();
  });
});
