import { StreamStatistics } from "../../main/stream/statistics/StreamStatistics";

describe("StreamStatistics", () => {
  it("tracks total bytes and byte rate over the configured interval", () => {
    let now = 0;
    const stats = new StreamStatistics(
      { id: "input", type: "tcp-server" },
      [{ id: "out", type: "udp-client" }],
      () => now,
      1000
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

  it("keeps the previous bps until the next interval elapses", () => {
    let now = 0;
    const stats = new StreamStatistics({ id: "input", type: "tcp-server" }, [], () => now, 1000);

    stats.markInputBytes(100);
    now += 1000;
    stats.snapshot(true);
    stats.markInputBytes(50);
    now += 100;

    const snapshot = stats.snapshot(true);

    expect(snapshot.input.bps).toBe(800);
  });

  it("updates bps when bytes arrive after the interval", () => {
    let now = 0;
    const stats = new StreamStatistics({ id: "input", type: "tcp-server" }, [], () => now, 1000);

    stats.markInputBytes(100);
    now += 1000;
    const first = stats.snapshot(true);
    expect(first.input.bps).toBe(800);

    stats.markInputBytes(100);
    now += 1000;
    const second = stats.snapshot(true);

    expect(second.input.bytes).toBe(200);
    expect(second.input.bps).toBe(800);
  });

  it("reports input uptime after the input becomes connected", () => {
    let now = 0;
    const stats = new StreamStatistics({ id: "input", type: "tcp-client" }, [], () => now, 1000);

    stats.setInputStatus("connected");
    now += 2500;
    const snapshot = stats.snapshot(true);

    expect(snapshot.input.status).toBe("connected");
    expect(snapshot.input.uptime).toBe(2.5);
  });

  it("clears uptime when the input is disconnected", () => {
    let now = 0;
    const stats = new StreamStatistics({ id: "input", type: "tcp-client" }, [], () => now, 1000);

    stats.setInputStatus("connected");
    now += 1000;
    stats.setInputStatus("idle");
    const snapshot = stats.snapshot(true);

    expect(snapshot.input.uptime).toBeUndefined();
  });

  it("reports client count for server outputs", () => {
    const stats = new StreamStatistics(
      { id: "input", type: "tcp-client" },
      [{ id: "out", type: "tcp-server" }],
      () => 0,
      1000
    );

    stats.setOutputStatus(0, "connected");
    stats.setOutputClients(0, 2);
    const snapshot = stats.snapshot(true);

    expect(snapshot.outputs[0].clients).toBe(2);
  });
});
