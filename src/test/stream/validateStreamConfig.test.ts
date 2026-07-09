import { validateStreamConfig } from "../../main/config/validateStreamConfig";
import { defaultStreamConfig } from "../../shared/stream";

describe("validateStreamConfig", () => {
  it("accepts a config with no enabled outputs", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: []
      })
    ).not.toThrow();
  });

  it("rejects non-positive buffer sizes", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        options: { ...defaultStreamConfig.options, bufferSize: 0 }
      })
    ).toThrow("bufferSize must be between 256 and 1048576");
  });

  it("uses shared stream option bounds for main-process validation", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        options: { ...defaultStreamConfig.options, statusInterval: 99 }
      })
    ).toThrow("statusInterval must be between 100 and 60000");

    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        options: { ...defaultStreamConfig.options, reconnectInterval: 0, inactiveTimeout: 0 }
      })
    ).not.toThrow();
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

  it("rejects file endpoints without a path", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          id: "input",
          type: "file",
          enabled: true,
          params: { path: "", timeTag: true }
        }
      })
    ).toThrow("file.path is required");
  });

  it("accepts a time-tagged file input endpoint", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          id: "input",
          type: "file",
          enabled: true,
          params: {
            path: "capture.rtcm3",
            timeTag: true,
            replaySpeed: 2,
            startOffset: 0,
            filePositionBytes: 8
          }
        }
      })
    ).not.toThrow();
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

  it("allows TCP and UDP server hosts to be empty (binds to 0.0.0.0)", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          ...defaultStreamConfig.input,
          type: "tcp-server",
          params: { host: "", port: 2101 }
        }
      })
    ).not.toThrow();

    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          ...defaultStreamConfig.input,
          type: "udp-server",
          params: { host: "", port: 2101 }
        }
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

  it("ignores disabled outputs with legacy invalid endpoint types", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [
          defaultStreamConfig.outputs[0],
          {
            id: "legacy-blank-output",
            type: "",
            enabled: false,
            params: {}
          } as never
        ]
      })
    ).not.toThrow();
  });
});
