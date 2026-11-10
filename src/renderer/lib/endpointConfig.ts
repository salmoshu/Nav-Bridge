import type { SerialPortInfo } from "../../shared/ipc";
import type {
  FileParams,
  NtripClientParams,
  SerialParams,
  StreamEndpoint,
  StreamEndpointParams,
  StreamMode,
  StreamType
} from "../../shared/stream";

export const endpointTypes: StreamType[] = [
  "tcp-server",
  "tcp-client",
  "ntrip-client",
  "udp-server",
  "udp-client",
  "serial",
  "file"
];

export const networkTypes: StreamType[] = [
  "tcp-server",
  "tcp-client",
  "ntrip-client",
  "udp-server",
  "udp-client"
];

export const serverTypes: StreamType[] = ["tcp-server", "udp-server"];

export const clientTypes: StreamType[] = ["tcp-client", "ntrip-client", "udp-client"];

export const baudRates = [9600, 19200, 38400, 57600, 115200, 230400];

export const parityOptions: SerialParams["parity"][] = ["none", "even", "odd"];

export const dataBitsOptions: SerialParams["dataBits"][] = [7, 8];

export const stopBitsOptions: SerialParams["stopBits"][] = [1, 2];

export const flowControlOptions: SerialParams["flowControl"][] = ["none", "rtscts"];

export function allowedEndpointTypes(mode: StreamMode): StreamType[] {
  if (mode === "input") {
    return ["tcp-server", "tcp-client", "ntrip-client", "udp-server", "serial", "file"];
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

export function isServerEndpoint(endpoint: { type: StreamType }): boolean {
  return serverTypes.includes(endpoint.type);
}

export function isClientEndpoint(endpoint: { type: StreamType }): boolean {
  return clientTypes.includes(endpoint.type);
}

function clientEndpointDisplay(endpoint: StreamEndpoint): string {
  const params = endpoint.params as unknown as Record<string, unknown>;
  const host = endpointHost(endpoint);
  return `${host}:${params.port}`;
}

function serverEndpointDisplay(endpoint: StreamEndpoint): string {
  const params = endpoint.params as unknown as Record<string, unknown>;
  return `0.0.0.0:${params.port ?? ""}`;
}

function networkEndpointDisplay(endpoint: StreamEndpoint): string {
  return isServerEndpoint(endpoint) ? serverEndpointDisplay(endpoint) : clientEndpointDisplay(endpoint);
}

export function endpointSummary(endpoint: StreamEndpoint): string {
  const { type } = endpoint;

  switch (type) {
    case "tcp-server":
      return `TCP server ${networkEndpointDisplay(endpoint)}`;
    case "tcp-client":
      return `TCP client ${networkEndpointDisplay(endpoint)}`;
    case "ntrip-client":
      return `NTRIP client ${endpointPath(endpoint)}`;
    case "udp-server":
      return `UDP server ${networkEndpointDisplay(endpoint)}`;
    case "udp-client":
      return `UDP client ${networkEndpointDisplay(endpoint)}`;
    case "serial":
      return `Serial ${endpointPath(endpoint)}${paramsSerialTcpSummary(endpoint)}`;
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
    case "ntrip-client": {
      const ntrip = endpoint.params as NtripClientParams;
      const host = ntrip.host.includes(":") ? `[${ntrip.host}]` : ntrip.host;
      return `${host}:${ntrip.port}/${ntrip.mountpoint.replace(/^\/+/, "")}`;
    }
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
      return "0.0.0.0";
    case "tcp-client":
    case "ntrip-client":
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
    case "ntrip-client":
      return { host: "", port: 2101, mountpoint: "", username: "", password: "" } satisfies NtripClientParams;
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
      return { host: "0.0.0.0", port: 2101 };
    case "tcp-client":
    case "udp-client":
      return { host: "127.0.0.1", port: 2201 };
    default:
      throw new Error(`Unsupported stream type: ${type}`);
  }
}

function paramsSerialTcpSummary(endpoint: StreamEndpoint): string {
  const port = (endpoint.params as SerialParams).outputTcpPort;
  return endpoint.id !== "input" && port ? ` (RX → TCP :${port})` : "";
}

export function parseNtripAddress(
  value: string
): Pick<NtripClientParams, "host" | "port" | "mountpoint"> | undefined {
  const match = /^(\[[^\]]+\]|[^/:]+):(\d+)\/(.*)$/.exec(value);
  if (match == undefined) return undefined;
  const host = match[1].replace(/^\[|\]$/g, "");
  const port = Number(match[2]);
  if (port < 1 || port > 65535) return undefined;
  return { host, port, mountpoint: match[3] };
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
