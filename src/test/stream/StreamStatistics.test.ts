import { StreamStatistics } from "../../main/stream/statistics/StreamStatistics";

describe("StreamStatistics", () => {
  it("tracks total bytes and one-second byte rates", () => {
    let now = 1000;
    const stats = new StreamStatistics(
      { id: "input", type: "tcp-server" },
      [{ id: "out", type: "udp-client" }],
      () => now
    );

    stats.markInputBytes(5);
    stats.markOutputBytes(0, 7);
    now += 1000;

    const snapshot = stats.snapshot(true);

    expect(snapshot.input.bytes).toBe(5);
    expect(snapshot.input.bps).toBe(40);
    expect(snapshot.outputs[0].bytes).toBe(7);
    expect(snapshot.outputs[0].bps).toBe(56);
  });
});
