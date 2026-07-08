import {
  allowedEndpointTypes,
  createDefaultEndpoint,
  defaultParamsForType,
  endpointHost,
  endpointInfo,
  endpointSummary,
  formatEndpointType,
  formatLogDialogTitle,
  formatSerialPortLabel
} from "../../renderer/lib/endpointConfig";
import type { SerialPortInfo } from "../../shared/ipc";
import type { StreamEndpoint } from "../../shared/stream";

describe("endpointSummary", () => {
  it("summarises a serial endpoint", () => {
    const endpoint: StreamEndpoint = {
      id: "input",
      type: "serial",
      enabled: true,
      params: {
        port: "COM3",
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      }
    };
    expect(endpointSummary(endpoint)).toBe("Serial COM3@115200");
  });

  it("summarises a TCP server endpoint with host and port", () => {
    const endpoint: StreamEndpoint = {
      id: "input",
      type: "tcp-server",
      enabled: true,
      params: { host: "0.0.0.0", port: 2101 }
    };
    expect(endpointSummary(endpoint)).toBe("TCP server 0.0.0.0:2101");
  });

  it("summarises a TCP client endpoint", () => {
    const endpoint: StreamEndpoint = {
      id: "output-1",
      type: "tcp-client",
      enabled: true,
      params: { host: "192.168.1.10", port: 2101 }
    };
    expect(endpointSummary(endpoint)).toBe("TCP client 192.168.1.10:2101");
  });

  it("summarises a UDP server endpoint with host and port", () => {
    const endpoint: StreamEndpoint = {
      id: "input",
      type: "udp-server",
      enabled: true,
      params: { host: "127.0.0.1", port: 2101 }
    };
    expect(endpointSummary(endpoint)).toBe("UDP server 127.0.0.1:2101");
  });

  it("summarises a UDP client endpoint", () => {
    const endpoint: StreamEndpoint = {
      id: "output-1",
      type: "udp-client",
      enabled: true,
      params: { host: "127.0.0.1", port: 2201 }
    };
    expect(endpointSummary(endpoint)).toBe("UDP client 127.0.0.1:2201");
  });
});

describe("endpointInfo", () => {
  it("returns host:port for TCP/UDP server endpoints, defaulting host to 0.0.0.0", () => {
    const tcpServer: StreamEndpoint = {
      id: "input",
      type: "tcp-server",
      enabled: true,
      params: { host: "", port: 2101 }
    };
    expect(endpointInfo(tcpServer)).toBe("0.0.0.0:2101");

    const udpServer: StreamEndpoint = {
      id: "input",
      type: "udp-server",
      enabled: true,
      params: { host: "127.0.0.1", port: 2101 }
    };
    expect(endpointInfo(udpServer)).toBe("127.0.0.1:2101");
  });

  it("returns host:port for TCP/UDP client endpoints", () => {
    const tcpClient: StreamEndpoint = {
      id: "output-1",
      type: "tcp-client",
      enabled: true,
      params: { host: "192.168.1.10", port: 2101 }
    };
    expect(endpointInfo(tcpClient)).toBe("192.168.1.10:2101");

    const udpClient: StreamEndpoint = {
      id: "output-1",
      type: "udp-client",
      enabled: true,
      params: { host: "127.0.0.1", port: 2201 }
    };
    expect(endpointInfo(udpClient)).toBe("127.0.0.1:2201");
  });

  it("returns port and baudRate for serial endpoints", () => {
    const serial: StreamEndpoint = {
      id: "input",
      type: "serial",
      enabled: true,
      params: {
        port: "COM3",
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      }
    };
    expect(endpointInfo(serial)).toBe("COM3@115200");
  });
});

describe("formatLogDialogTitle", () => {
  it("includes endpoint role and info", () => {
    const input: StreamEndpoint = {
      id: "input",
      type: "tcp-server",
      enabled: true,
      params: { host: "0.0.0.0", port: 2101 }
    };
    expect(formatLogDialogTitle(input)).toBe("Logs for Input (0.0.0.0:2101)");

    const output: StreamEndpoint = {
      id: "output-1",
      type: "udp-client",
      enabled: true,
      params: { host: "127.0.0.1", port: 2201 }
    };
    expect(formatLogDialogTitle(output)).toBe("Logs for Output (127.0.0.1:2201)");
  });

  it("indicates global logs when endpoint is missing", () => {
    expect(formatLogDialogTitle(undefined)).toBe("Global logs");
  });
});

describe("defaultParamsForType", () => {
  it("returns serial defaults", () => {
    expect(defaultParamsForType("serial")).toEqual({
      port: "",
      baudRate: 115200,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      flowControl: "none"
    });
  });

  it("returns TCP server defaults", () => {
    expect(defaultParamsForType("tcp-server")).toEqual({ host: "127.0.0.1", port: 2101 });
  });

  it("returns TCP client defaults", () => {
    expect(defaultParamsForType("tcp-client")).toEqual({ host: "127.0.0.1", port: 2201 });
  });

  it("returns UDP server defaults", () => {
    expect(defaultParamsForType("udp-server")).toEqual({ host: "127.0.0.1", port: 2101 });
  });

  it("returns UDP client defaults", () => {
    expect(defaultParamsForType("udp-client")).toEqual({ host: "127.0.0.1", port: 2201 });
  });

});

describe("createDefaultEndpoint", () => {
  it("creates an enabled endpoint for a concrete type", () => {
    const endpoint = createDefaultEndpoint("output-2", "tcp-client");
    expect(endpoint.type).toBe("tcp-client");
    expect(endpoint.enabled).toBe(true);
  });
});

describe("allowedEndpointTypes", () => {
  it("excludes udp-client for input mode", () => {
    expect(allowedEndpointTypes("input")).not.toContain("udp-client");
    expect(allowedEndpointTypes("input")).toContain("udp-server");
  });

  it("excludes udp-server for output mode", () => {
    expect(allowedEndpointTypes("output")).not.toContain("udp-server");
    expect(allowedEndpointTypes("output")).toContain("udp-client");
  });
});

describe("formatSerialPortLabel", () => {
  it("returns the port path when no extra metadata is present", () => {
    const port: SerialPortInfo = { path: "COM3" };
    expect(formatSerialPortLabel(port)).toBe("COM3");
  });

  it("combines path, manufacturer and serialNumber in order", () => {
    const port: SerialPortInfo = {
      path: "COM3",
      manufacturer: "FTDI",
      serialNumber: "ABC123"
    };
    expect(formatSerialPortLabel(port)).toBe("COM3 - FTDI - ABC123");
  });

  it("skips missing manufacturer and serialNumber", () => {
    const port: SerialPortInfo = { path: "/dev/ttyUSB0", serialNumber: "XYZ" };
    expect(formatSerialPortLabel(port)).toBe("/dev/ttyUSB0 - XYZ");
  });
});

describe("formatEndpointType", () => {
  it("formats TCP and UDP types with uppercase protocol", () => {
    expect(formatEndpointType("tcp-server")).toBe("TCP Server");
    expect(formatEndpointType("tcp-client")).toBe("TCP Client");
    expect(formatEndpointType("udp-server")).toBe("UDP Server");
    expect(formatEndpointType("udp-client")).toBe("UDP Client");
  });

  it("formats serial with capitalised first letter", () => {
    expect(formatEndpointType("serial")).toBe("Serial");
  });
});

describe("endpointHost", () => {
  it("returns host for network endpoints", () => {
    const client: StreamEndpoint = {
      id: "output-1",
      type: "tcp-client",
      enabled: true,
      params: { host: "192.168.1.10", port: 2101 }
    };
    expect(endpointHost(client)).toBe("192.168.1.10");
  });

  it("returns 0.0.0.0 for server endpoints with empty host", () => {
    const server: StreamEndpoint = {
      id: "input",
      type: "tcp-server",
      enabled: true,
      params: { host: "", port: 2101 }
    };
    expect(endpointHost(server)).toBe("0.0.0.0");
  });

  it("returns port for serial endpoints", () => {
    const serial: StreamEndpoint = {
      id: "input",
      type: "serial",
      enabled: true,
      params: {
        port: "COM3",
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      }
    };
    expect(endpointHost(serial)).toBe("COM3");
  });
});
