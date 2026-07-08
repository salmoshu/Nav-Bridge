import type {
  SerialParams,
  StreamConfig,
  StreamEndpoint,
  TcpClientParams,
  TcpServerParams,
  UdpClientParams,
  UdpServerParams
} from "../../shared/stream";

export function validateStreamConfig(config: StreamConfig): void {
  if (config.version !== "0.0.1") {
    throw new Error("Unsupported config version");
  }
  if (!config.input.enabled) {
    throw new Error("Input stream must be enabled");
  }
  if (config.outputs.filter((output) => output.enabled).length === 0) {
    throw new Error("At least one output stream is required");
  }
  assertPositiveInteger(config.options.bufferSize, "bufferSize");
  assertPositiveInteger(config.options.statusInterval, "statusInterval");
  assertPositiveInteger(config.options.reconnectInterval, "reconnectInterval");
  assertPositiveInteger(config.options.inactiveTimeout, "inactiveTimeout");
  validateEndpoint(config.input.id, config.input.type, config.input.params);
  config.outputs.forEach((output) => validateEndpoint(output.id, output.type, output.params));
  validateServerPortConflicts(config.input, config.outputs);
}

function validateEndpoint(id: string, type: string, params: unknown): void {
  if (id.trim().length === 0) {
    throw new Error("Endpoint id is required");
  }
  switch (type) {
    case "tcp-server":
      validateServerParams(params as TcpServerParams, type);
      return;
    case "tcp-client":
      validateClientParams(params as TcpClientParams, type);
      return;
    case "udp-server":
      validateServerParams(params as UdpServerParams, type);
      return;
    case "udp-client":
      validateClientParams(params as UdpClientParams, type);
      return;
    case "serial":
      validateSerialParams(params as SerialParams);
      return;
    default:
      throw new Error(`Unsupported stream type: ${type}`);
  }
}

function validateServerParams(params: TcpServerParams | UdpServerParams, type: string): void {
  assertPort(params.port, `${type}.port`);
  if (params.host != undefined) {
    assertNonEmpty(params.host, `${type}.host`);
  }
}

function validateServerPortConflicts(input: StreamEndpoint, outputs: StreamEndpoint[]): void {
  const servers = [input, ...outputs.filter((output) => output.enabled)].filter(
    (
      endpoint
    ): endpoint is StreamEndpoint & {
      type: "tcp-server" | "udp-server";
      params: TcpServerParams | UdpServerParams;
    } => endpoint.type === "tcp-server" || endpoint.type === "udp-server"
  );

  const seen = new Map<string, string>();
  for (const endpoint of servers) {
    const port = endpoint.params.port;
    const key = `${endpoint.type}:${port}`;
    const existing = seen.get(key);
    if (existing != undefined) {
      throw new Error(
        `${formatServerType(endpoint.type)} port ${port} is used by multiple enabled endpoints`
      );
    }
    seen.set(key, endpoint.id);
  }
}

function formatServerType(type: "tcp-server" | "udp-server"): string {
  return type === "tcp-server" ? "TCP server" : "UDP server";
}

export function validateDuplicateClientEndpoints(input: StreamEndpoint, outputs: StreamEndpoint[]): void {
  const clients = [input, ...outputs.filter((output) => output.enabled)].filter(
    (
      endpoint
    ): endpoint is StreamEndpoint & {
      type: "tcp-client" | "udp-client";
      params: TcpClientParams | UdpClientParams;
    } => endpoint.type === "tcp-client" || endpoint.type === "udp-client"
  );

  const seen = new Map<string, string>();
  for (const endpoint of clients) {
    const params = endpoint.params;
    const key = `${endpoint.type}:${params.host}:${params.port}`;
    const existing = seen.get(key);
    if (existing != undefined) {
      throw new Error(`Duplicate ${formatClientType(endpoint.type)} endpoint ${params.host}:${params.port}`);
    }
    seen.set(key, endpoint.id);
  }
}

function formatClientType(type: "tcp-client" | "udp-client"): string {
  return type === "tcp-client" ? "TCP client" : "UDP client";
}

function validateClientParams(params: TcpClientParams | UdpClientParams, type: string): void {
  assertNonEmpty(params.host, `${type}.host`);
  assertPort(params.port, `${type}.port`);
}

function validateSerialParams(params: SerialParams): void {
  assertNonEmpty(params.port, "serial.port");
  assertPositiveInteger(params.baudRate, "serial.baudRate");
  if (params.dataBits !== 7 && params.dataBits !== 8) {
    throw new Error("serial.dataBits must be 7 or 8");
  }
  if (params.parity !== "none" && params.parity !== "even" && params.parity !== "odd") {
    throw new Error("serial.parity is invalid");
  }
  if (params.stopBits !== 1 && params.stopBits !== 2) {
    throw new Error("serial.stopBits must be 1 or 2");
  }
  if (params.flowControl !== "none" && params.flowControl !== "rtscts") {
    throw new Error("serial.flowControl is invalid");
  }
}

function assertPort(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error(`${name} must be a port between 0 and 65535`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}
