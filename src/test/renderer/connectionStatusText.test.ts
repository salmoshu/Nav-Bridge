import {
  buildStatusLine,
  formatCompactStatus,
  formatMetricLabel,
  formatMetricValue
} from "../../renderer/lib/connectionStatusText";
import type { StreamStatus } from "../../shared/stream";

function makeStatus(
  input: Partial<StreamStatus["input"]>,
  outputs: Partial<StreamStatus["outputs"][number]>[] = []
): StreamStatus {
  return {
    running: true,
    input: {
      id: "input",
      type: "tcp-client",
      status: "idle",
      bytes: 0,
      bps: 0,
      ...input
    },
    outputs: outputs.map((output, index) => ({
      id: `output-${index + 1}`,
      type: "tcp-client",
      status: "idle",
      bytes: 0,
      bps: 0,
      ...output
    }))
  };
}

describe("formatCompactStatus", () => {
  it("returns an empty string when status is undefined", () => {
    expect(formatCompactStatus(undefined)).toBe("");
  });

  it("shows input uptime when connected", () => {
    const status = makeStatus({ status: "connected", uptime: 25 });
    expect(formatCompactStatus(status)).toBe("(0)25.0s");
  });

  it("shows waiting for idle and connecting outputs", () => {
    const status = makeStatus({ status: "connecting" }, [{ status: "idle" }]);
    expect(formatCompactStatus(status)).toBe("(0)waiting(1)waiting");
  });

  it("shows client count for connected server outputs", () => {
    const status = makeStatus({ status: "connected", uptime: 10 }, [
      { type: "tcp-server", status: "connected", clients: 2 },
      { type: "tcp-server", status: "idle" }
    ]);
    expect(formatCompactStatus(status)).toBe("(0)10.0s(1)2clients(2)waiting");
  });

  it("shows singular client count", () => {
    const status = makeStatus({ status: "connected", uptime: 5 }, [
      { type: "udp-server", status: "connected", clients: 1 }
    ]);
    expect(formatCompactStatus(status)).toBe("(0)5.0s(1)1client");
  });

  it("shows waiting state for server outputs with data but no clients", () => {
    const status = makeStatus({ status: "connected", uptime: 10 }, [
      { type: "tcp-server", status: "waiting" }
    ]);
    expect(formatCompactStatus(status)).toBe("(0)10.0s(1)waiting");
  });

  it("shows error state", () => {
    const status = makeStatus({ status: "error", error: "connection refused" });
    expect(formatCompactStatus(status)).toBe("(0)error");
  });
});

describe("buildStatusLine", () => {
  it("returns a default idle line when status is undefined", () => {
    expect(buildStatusLine(undefined)).toBe("(0)idle");
  });

  it("shows input uptime when connected", () => {
    const status = makeStatus({ status: "connected", uptime: 25 });
    expect(buildStatusLine(status)).toBe("(0)25.0s");
  });

  it("shows raw status for idle and connecting server outputs", () => {
    const status = makeStatus({ status: "idle" }, [
      { type: "tcp-server", status: "connecting" }
    ]);
    expect(buildStatusLine(status)).toBe("(0)idle(1)connecting");
  });

  it("hides client outputs from the status line", () => {
    const status = makeStatus({ status: "connected", uptime: 10 }, [
      { type: "tcp-client", status: "connected" },
      { type: "udp-client", status: "connecting" }
    ]);
    expect(buildStatusLine(status)).toBe("(0)10.0s");
  });

  it("shows waiting for TCP server outputs with data but no clients", () => {
    const status = makeStatus({ status: "connected", uptime: 10 }, [
      { type: "tcp-server", status: "waiting" }
    ]);
    expect(buildStatusLine(status)).toBe("(0)10.0s(1)waiting");
  });

  it("shows client count for connected server outputs", () => {
    const status = makeStatus({ status: "connected", uptime: 10 }, [
      { type: "tcp-server", status: "connected", clients: 2 },
      { type: "tcp-server", status: "idle" }
    ]);
    expect(buildStatusLine(status)).toBe("(0)10.0s(1)2clients(2)idle");
  });

  it("uses the provided smooth uptime for the input stream", () => {
    const status = makeStatus({ status: "connected", uptime: 10 });
    expect(buildStatusLine(status, 10.7)).toBe("(0)10.7s");
  });

  it("ignores smooth uptime when input is not connected", () => {
    const status = makeStatus({ status: "idle" });
    expect(buildStatusLine(status, 99)).toBe("(0)idle");
  });
});

describe("formatMetricLabel", () => {
  it("wraps the index in parentheses", () => {
    expect(formatMetricLabel(0)).toBe("(0)");
    expect(formatMetricLabel(3)).toBe("(3)");
  });
});

describe("formatMetricValue", () => {
  it("shows uptime for connected input", () => {
    const metric = {
      id: "input",
      type: "tcp-client" as const,
      status: "connected" as const,
      bytes: 0,
      bps: 0,
      uptime: 12.5
    };
    expect(formatMetricValue(metric, 0)).toBe("12.5s");
  });

  it("shows client count for connected server output", () => {
    const metric = {
      id: "out",
      type: "tcp-server" as const,
      status: "connected" as const,
      bytes: 0,
      bps: 0,
      clients: 3
    };
    expect(formatMetricValue(metric, 1)).toBe("3clients");
  });

  it("shows raw status for idle output", () => {
    const metric = { id: "out", type: "tcp-client" as const, status: "idle" as const, bytes: 0, bps: 0 };
    expect(formatMetricValue(metric, 1)).toBe("idle");
  });

  it("shows waiting status for server output", () => {
    const metric = {
      id: "out",
      type: "tcp-server" as const,
      status: "waiting" as const,
      bytes: 0,
      bps: 0
    };
    expect(formatMetricValue(metric, 1)).toBe("waiting");
  });
});
