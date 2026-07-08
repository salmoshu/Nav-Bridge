import type {
  SerialParams,
  StreamEndpoint,
  StreamEndpointParams,
  StreamMode,
  StreamType
} from "../../shared/stream";

export const endpointTypes: StreamType[] = ["tcp-server", "tcp-client", "udp-server", "udp-client", "serial"];

export const networkTypes: StreamType[] = ["tcp-server", "tcp-client", "udp-server", "udp-client"];

export const baudRates = [9600, 19200, 38400, 57600, 115200, 230400];

export const parityOptions: SerialParams["parity"][] = ["none", "even", "odd"];

export const dataBitsOptions: SerialParams["dataBits"][] = [7, 8];

export const stopBitsOptions: SerialParams["stopBits"][] = [1, 2];

export const flowControlOptions: SerialParams["flowControl"][] = ["none", "rtscts"];

export function allowedEndpointTypes(mode: StreamMode): StreamType[] {
  if (mode === "input") {
    return ["tcp-server", "tcp-client", "udp-server", "serial"];
  }
  return ["tcp-server", "tcp-client", "udp-client", "serial"];
}

export function isSerialEndpoint(endpoint: { type: StreamType }): boolean {
  return endpoint.type === "serial";
}

export function isNetworkEndpoint(endpoint: { type: StreamType }): boolean {
  return networkTypes.includes(endpoint.type);
}

export function endpointSummary(endpoint: StreamEndpoint): string {
  const { type } = endpoint;
  const params = endpoint.params as unknown as Record<string, unknown>;

  switch (type) {
    case "tcp-server":
      return `TCP server :${params.port}`;
    case "tcp-client":
      return `TCP client ${params.host}:${params.port}`;
    case "udp-server":
      return `UDP server :${params.port}`;
    case "udp-client":
      return `UDP client ${params.host}:${params.port}`;
    case "serial":
      return `Serial ${params.port} @ ${params.baudRate}`;
    default:
      return type;
  }
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
    default:
      return "";
  }
}

export function defaultParamsForType(type: StreamType): StreamEndpointParams {
  switch (type) {
    case "serial":
      return {
        port: "COM3",
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      };
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
