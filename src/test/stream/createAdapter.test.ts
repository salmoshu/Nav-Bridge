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
});
