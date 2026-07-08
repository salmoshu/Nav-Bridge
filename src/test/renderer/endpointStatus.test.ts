import { buildStatusMap } from "../../renderer/lib/endpointStatus";
import type { StreamStatus } from "../../shared/stream";

const baseStatus: StreamStatus = {
  running: true,
  input: { id: "input", type: "tcp-server", status: "connected", bytes: 1024, bps: 128 },
  outputs: [
    { id: "output-1", type: "udp-client", status: "connected", bytes: 512, bps: 64 },
    { id: "output-2", type: "serial", status: "idle", bytes: 0, bps: 0 }
  ]
};

describe("buildStatusMap", () => {
  it("maps input and all outputs by id", () => {
    const map = buildStatusMap(baseStatus);
    expect(map.input).toEqual(baseStatus.input);
    expect(map["output-1"]).toEqual(baseStatus.outputs[0]);
    expect(map["output-2"]).toEqual(baseStatus.outputs[1]);
  });

  it("returns an idle fallback metric for unknown ids", () => {
    const map = buildStatusMap(baseStatus);
    expect(map["missing"]).toEqual({ id: "missing", type: "tcp-server", status: "idle", bytes: 0, bps: 0 });
  });

  it("handles missing status gracefully", () => {
    const map = buildStatusMap(undefined);
    expect(map["input"]).toEqual({ id: "input", type: "tcp-server", status: "idle", bytes: 0, bps: 0 });
  });
});
