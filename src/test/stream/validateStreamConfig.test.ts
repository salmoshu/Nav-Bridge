import { validateStreamConfig } from "../../main/config/validateStreamConfig";
import { defaultStreamConfig } from "../../shared/stream";

describe("validateStreamConfig", () => {
  it("rejects non-positive buffer sizes", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        options: { ...defaultStreamConfig.options, bufferSize: 0 }
      })
    ).toThrow("bufferSize must be a positive integer");
  });

  it("rejects invalid endpoint ports", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          ...defaultStreamConfig.input,
          params: { host: "127.0.0.1", port: 70000 }
        }
      })
    ).toThrow("tcp-server.port must be a port");
  });

  it("rejects duplicate TCP server ports across input and outputs", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [
          {
            id: "output-1",
            type: "tcp-server",
            enabled: true,
            params: { host: "127.0.0.1", port: 2101 }
          }
        ]
      })
    ).toThrow("TCP server port 2101 is used by multiple enabled endpoints");
  });

  it("rejects duplicate UDP server ports between two outputs", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [
          {
            id: "output-1",
            type: "udp-server",
            enabled: true,
            params: { host: "127.0.0.1", port: 3000 }
          },
          {
            id: "output-2",
            type: "udp-server",
            enabled: true,
            params: { host: "0.0.0.0", port: 3000 }
          }
        ]
      })
    ).toThrow("UDP server port 3000 is used by multiple enabled endpoints");
  });

  it("allows the same port on a server and a client endpoint", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [
          {
            id: "output-1",
            type: "tcp-client",
            enabled: true,
            params: { host: "127.0.0.1", port: 2101 }
          }
        ]
      })
    ).not.toThrow();
  });

  it("allows TCP and UDP servers to use the same numeric port", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          ...defaultStreamConfig.input,
          params: { host: "127.0.0.1", port: 2101 }
        },
        outputs: [
          {
            id: "output-1",
            type: "udp-server",
            enabled: true,
            params: { host: "127.0.0.1", port: 2101 }
          }
        ]
      })
    ).not.toThrow();
  });

  it("ignores disabled server outputs when checking port conflicts", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [
          {
            id: "output-1",
            type: "tcp-server",
            enabled: false,
            params: { host: "127.0.0.1", port: 2101 }
          },
          {
            id: "output-2",
            type: "udp-client",
            enabled: true,
            params: { host: "127.0.0.1", port: 2201 }
          }
        ]
      })
    ).not.toThrow();
  });
});
