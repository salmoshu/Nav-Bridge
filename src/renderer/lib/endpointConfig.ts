import type { SerialPortInfo } from "../../shared/ipc";
import type {
  FileParams,
  SerialParams,
  StreamEndpoint,
  StreamEndpointParams,
  StreamMode,
  StreamType
} from "../../shared/stream";

export const endpointTypes: StreamType[] = [
  "tcp-server",
  "tcp-client",
  "udp-server",
  "udp-client",
  "serial",
  "file"
];

export const networkTypes: StreamType[] = ["tcp-server", "tcp-client", "udp-server", "udp-client"];

export const baudRates = [9600, 19200, 38400, 57600, 115200, 230400];

export const parityOptions: SerialParams["parity"][] = ["none", "even", "odd"];

export const dataBitsOptions: SerialParams["dataBits"][] = [7, 8];

export const stopBitsOptions: SerialParams["stopBits"][] = [1, 2];

export const flowControlOptions: SerialParams["flowControl"][] = ["none", "rtscts"];

export function allowedEndpointTypes(mode: StreamMode): StreamType[] {
  if (mode === "input") {
    return ["tcp-server", "tcp-client", "udp-server", "serial", "file"];
  }
  return ["tcp-server", "tcp-client", "udp-client", "serial", "file"];
}

export function isSerialEndpoint(endpoint: { type: StreamType }): boolean {
  return endpoint.type === "serial";
}

export function isNetworkEndpoint(endpoint: { type: StreamType }): boolean {
  return networkTypes.includes(endpoint.type);
}

export function isFileEndpoint(endpoint: { type: StreamType }): boolean {
  return endpoint.type === "file";
}

function networkEndpointDisplay(endpoint: StreamEndpoint): string {
  const params = endpoint.params as unknown as Record<string, unknown>;
  const host = endpointHost(endpoint);
  return `${host}:${params.port}`;
}

export function endpointSummary(endpoint: StreamEndpoint): string {
  const { type } = endpoint;

  switch (type) {
    case "tcp-server":
      return `TCP server ${networkEndpointDisplay(endpoint)}`;
    case "tcp-client":
      return `TCP client ${networkEndpointDisplay(endpoint)}`;
    case "udp-server":
      return `UDP server ${networkEndpointDisplay(endpoint)}`;
    case "udp-client":
      return `UDP client ${networkEndpointDisplay(endpoint)}`;
    case "serial":
      return `Serial ${endpointPath(endpoint)}`;
    case "file":
      return `File ${endpointPath(endpoint)}`;
    default:
      return type;
  }
}

export function endpointPath(endpoint: StreamEndpoint): string {
  const { type } = endpoint;
  const params = endpoint.params as unknown as Record<string, unknown>;

  switch (type) {
    case "tcp-server":
    case "tcp-client":
    case "udp-server":
    case "udp-client":
      return networkEndpointDisplay(endpoint);
    case "serial":
      return `${params.port}@${params.baudRate}`;
    case "file":
      return typeof params.path === "string" ? params.path : "";
    default:
      return type;
  }
}

export function formatLogDialogTitle(endpoint: StreamEndpoint | undefined): string {
  if (endpoint == undefined) {
    return "Global logs";
  }
  const role = endpoint.id === "input" ? "Input" : "Output";
  return `Logs for ${role} (${endpointPath(endpoint)})`;
}

export function formatSerialPortLabel(port: SerialPortInfo): string {
  if (port.friendlyName != undefined && port.friendlyName.length > 0) {
    return port.friendlyName;
  }
  const parts = [port.path];
  if (port.manufacturer != undefined && port.manufacturer.length > 0) {
    parts.push(port.manufacturer);
  }
  if (port.serialNumber != undefined && port.serialNumber.length > 0) {
    parts.push(port.serialNumber);
  }
  return parts.join(" - ");
}

export function formatEndpointType(type: StreamType): string {
  const [protocol, role] = type.split("-");
  const upperProtocol = protocol.toUpperCase();
  if (role === undefined) {
    return protocol.charAt(0).toUpperCase() + protocol.slice(1);
  }
  return `${upperProtocol} ${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

export function endpointHost(endpoint: StreamEndpoint): string {
  const { type } = endpoint;
  const params = endpoint.params as unknown as Record<string, unknown>;

  switch (type) {
    case "tcp-server":
    case "udp-server":
      return typeof params.host === "string" && params.host.length > 0 ? params.host : "0.0.0.0";
    case "tcp-client":
    case "udp-client":
      return typeof params.host === "string" ? params.host : "";
    case "serial":
      return typeof params.port === "string" ? params.port : String(params.port ?? "");
    case "file":
      return typeof params.path === "string" ? params.path : "";
    default:
      return "";
  }
}

export function defaultParamsForType(type: StreamType): StreamEndpointParams {
  switch (type) {
    case "serial":
      return {
        port: "",
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      };
    case "file":
      return {
        path: "",
        timeTag: false,
        replaySpeed: 1,
        startOffset: 0,
        filePositionBytes: 4
      } satisfies FileParams;
    case "tcp-server":
    case "udp-server":
      return { host: "127.0.0.1", port: 2101 };
    case "tcp-client":
    case "udp-client":
      return { host: "127.0.0.1", port: 2201 };
    default:
      throw new Error(`Unsupported stream type: ${type}`);
  }
}

export function createEndpointWithType(endpoint: StreamEndpoint, type: StreamType): StreamEndpoint {
  return {
    ...endpoint,
    type,
    params: defaultParamsForType(type)
  };
}

export function createDefaultEndpoint(id: string, type: StreamType): StreamEndpoint {
  return {
    id,
    type,
    enabled: true,
    params: defaultParamsForType(type)
  };
}
