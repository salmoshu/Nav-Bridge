import { validateDuplicateClientEndpoints } from "../../main/config/validateStreamConfig";
import { defaultStreamConfig } from "../../shared/stream";

describe("validateDuplicateClientEndpoints", () => {
  it("rejects duplicate TCP client outputs to the same host and port", () => {
    expect(() =>
      validateDuplicateClientEndpoints(defaultStreamConfig.input, [
        {
          id: "output-1",
          type: "tcp-client",
          enabled: true,
          params: { host: "127.0.0.1", port: 2201 }
        },
        {
          id: "output-2",
          type: "tcp-client",
          enabled: true,
          params: { host: "127.0.0.1", port: 2201 }
        }
      ])
    ).toThrow("Duplicate TCP client endpoint 127.0.0.1:2201");
  });

  it("rejects duplicate UDP client outputs to the same host and port", () => {
    expect(() =>
      validateDuplicateClientEndpoints(defaultStreamConfig.input, [
        {
          id: "output-1",
          type: "udp-client",
          enabled: true,
          params: { host: "127.0.0.1", port: 2201 }
        },
        {
          id: "output-2",
          type: "udp-client",
          enabled: true,
          params: { host: "127.0.0.1", port: 2201 }
        }
      ])
    ).toThrow("Duplicate UDP client endpoint 127.0.0.1:2201");
  });

  it("allows UDP client outputs to the same port but different hosts", () => {
    expect(() =>
      validateDuplicateClientEndpoints(defaultStreamConfig.input, [
        {
          id: "output-1",
          type: "udp-client",
          enabled: true,
          params: { host: "192.168.1.10", port: 2201 }
        },
        {
          id: "output-2",
          type: "udp-client",
          enabled: true,
          params: { host: "192.168.1.11", port: 2201 }
        }
      ])
    ).not.toThrow();
  });

  it("ignores disabled outputs when checking duplicates", () => {
    expect(() =>
      validateDuplicateClientEndpoints(defaultStreamConfig.input, [
        {
          id: "output-1",
          type: "udp-client",
          enabled: false,
          params: { host: "127.0.0.1", port: 2201 }
        },
        {
          id: "output-2",
          type: "udp-client",
          enabled: true,
          params: { host: "127.0.0.1", port: 2201 }
        }
      ])
    ).not.toThrow();
  });
});
