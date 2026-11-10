import { validateStreamConfig } from "../../main/config/validateStreamConfig";
import { defaultStreamConfig, type StreamEndpoint, type SerialParams } from "../../shared/stream";

const ntrip: StreamEndpoint = {
  id: "input",
  enabled: true,
  type: "ntrip-client",
  params: { host: "caster.example.com", port: 2101, mountpoint: "RTCM3", username: "user", password: "pass" }
};
const serial: SerialParams = {
  port: "COM3",
  baudRate: 115200,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: "none",
  outputTcpPort: 3000
};
function serialOutput(id = "output-1", params = serial): StreamEndpoint {
  return { id, enabled: true, type: "serial", params };
}

describe("NTRIP and serial outlet validation", () => {
  it("accepts an NTRIP input connected to a serial output", () => {
    expect(() =>
      validateStreamConfig({ ...defaultStreamConfig, input: ntrip, outputs: [serialOutput()] })
    ).not.toThrow();
  });

  it.each([
    [{ host: "" }, "ntrip-client.host"],
    [{ port: 0 }, "ntrip-client.port"],
    [{ port: 65536 }, "ntrip-client.port"],
    [{ mountpoint: "" }, "ntrip-client.mountpoint"],
    [{ mountpoint: "/" }, "ntrip-client.mountpoint"],
    [{ host: "caster\r\nInjected: 1" }, "control characters"],
    [{ mountpoint: "RTCM3\r\nInjected: 1" }, "control characters"]
  ])("rejects invalid NTRIP parameters %p", (patch, message) => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: { ...ntrip, params: { ...ntrip.params, ...patch } }
      })
    ).toThrow(message);
  });

  it("rejects NTRIP output endpoints", () => {
    expect(() =>
      validateStreamConfig({ ...defaultStreamConfig, outputs: [{ ...ntrip, id: "output-1" }] })
    ).toThrow("only supported as an input");
  });

  it("rejects conflicts between a serial TCP outlet and the input listener", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [serialOutput("output-1", { ...serial, outputTcpPort: 2101 })]
      })
    ).toThrow("TCP server port 2101 is used by multiple enabled endpoints");
  });

  it("rejects conflicts between serial outlets and other TCP outputs", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [
          serialOutput(),
          { id: "output-2", type: "tcp-server", enabled: true, params: { port: 3000 } }
        ]
      })
    ).toThrow("TCP server port 3000 is used by multiple enabled endpoints");
    expect(() =>
      validateStreamConfig({ ...defaultStreamConfig, outputs: [serialOutput(), serialOutput("output-2")] })
    ).toThrow("TCP server port 3000");
  });

  it("ignores disabled serial outlets and permits sharing the numeric port with UDP", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: { ...defaultStreamConfig.input, type: "udp-server", params: { port: 3000 } },
        outputs: [serialOutput(), { ...serialOutput("output-2"), enabled: false }]
      })
    ).not.toThrow();
  });

  it.each([-1, 65536, 1.5, Number.NaN])("rejects invalid serial outlet port %s", (outputTcpPort) => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        outputs: [serialOutput("output-1", { ...serial, outputTcpPort })]
      })
    ).toThrow("serial.outputTcpPort");
  });
});
