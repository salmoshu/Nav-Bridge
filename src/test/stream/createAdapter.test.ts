import { createAdapter } from "../../main/stream/createAdapter";
import type { StreamEndpoint } from "../../shared/stream";

describe("createAdapter", () => {
  it("rejects UDP client as an input endpoint", () => {
    const endpoint: StreamEndpoint = {
      id: "input",
      type: "udp-client",
      enabled: true,
      params: { host: "127.0.0.1", port: 2101 }
    };

    expect(() => createAdapter(endpoint, "input")).toThrow("UDP client is only supported as an output");
  });

  it("rejects UDP server as an output endpoint", () => {
    const endpoint: StreamEndpoint = {
      id: "output",
      type: "udp-server",
      enabled: true,
      params: { host: "127.0.0.1", port: 2101 }
    };

    expect(() => createAdapter(endpoint, "output")).toThrow("UDP server is only supported as an input");
  });

  it("creates file adapters for input and output endpoints", () => {
    const endpoint: StreamEndpoint = {
      id: "input",
      type: "file",
      enabled: true,
      params: { path: "data.rtcm", timeTag: true }
    };

    expect(createAdapter(endpoint, "input").type).toBe("file");
    expect(createAdapter({ ...endpoint, id: "output-1" }, "output").type).toBe("file");
  });
});
