import type {
  FileParams,
  NtripClientParams,
  SerialParams,
  StreamConfig,
  StreamEndpoint,
  TcpClientParams,
  TcpServerParams,
  UdpClientParams,
  UdpServerParams
} from "../../shared/stream";
import { streamOptionLimits, type StreamOptionKey } from "../../shared/streamOptions";

export function validateStreamConfig(config: StreamConfig): void {
  if (config.version !== "0.0.1") {
    throw new Error("Unsupported config version");
  }
  if (!config.input.enabled) {
    throw new Error("Input stream must be enabled");
  }
  assertStreamOption(config.options.bufferSize, "bufferSize");
  assertStreamOption(config.options.statusInterval, "statusInterval");
  assertStreamOption(config.options.reconnectInterval, "reconnectInterval");
  assertStreamOption(config.options.inactiveTimeout, "inactiveTimeout");
  validateEndpoint(config.input.id, config.input.type, config.input.params);
  config.outputs
    .filter((output) => output.enabled)
    .forEach((output) => {
      if (output.type === "ntrip-client") {
        throw new Error("NTRIP client is only supported as an input endpoint");
      }
      validateEndpoint(output.id, output.type, output.params);
    });
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
    case "ntrip-client":
      validateNtripParams(params as NtripClientParams);
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
    case "file":
      validateFileParams(params as FileParams);
      return;
    default:
      throw new Error(`Unsupported stream type: ${type}`);
  }
}

function validateServerParams(params: TcpServerParams | UdpServerParams, type: string): void {
  assertPort(params.port, `${type}.port`);
}

function validateServerPortConflicts(input: StreamEndpoint, outputs: StreamEndpoint[]): void {
  const seen = new Map<string, string>();
  for (const endpoint of [input, ...outputs.filter((output) => output.enabled)]) {
    const serialTcpPort =
      endpoint.type === "serial" && endpoint !== input
        ? (endpoint.params as SerialParams).outputTcpPort
        : undefined;
    const type = serialTcpPort ? "tcp-server" : endpoint.type;
    if (type !== "tcp-server" && type !== "udp-server") continue;
    const port = serialTcpPort ?? (endpoint.params as TcpServerParams | UdpServerParams).port;
    // Port 0 asks the OS to assign an available port and cannot conflict in advance.
    if (port === 0) continue;
    const key = `${type}:${port}`;
    const existing = seen.get(key);
    if (existing != undefined) {
      throw new Error(`${formatServerType(type)} port ${port} is used by multiple enabled endpoints`);
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

function validateNtripParams(params: NtripClientParams): void {
  validateClientParams(params, "ntrip-client");
  if (params.port === 0) throw new Error("ntrip-client.port must be between 1 and 65535");
  assertNonEmpty(params.mountpoint, "ntrip-client.mountpoint");
  if (params.mountpoint.replace(/^\/+/, "").trim().length === 0) {
    throw new Error("ntrip-client.mountpoint is required");
  }
  if (/[\s\x00-\x1f\x7f]/.test(params.host) || /[\x00-\x1f\x7f]/.test(params.mountpoint)) {
    throw new Error("NTRIP host and mountpoint must not contain control characters or host whitespace");
  }
  for (const key of ["username", "password"] as const) {
    if (params[key] != undefined && typeof params[key] !== "string") {
      throw new Error(`ntrip-client.${key} must be a string`);
    }
  }
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
  if (params.outputTcpPort != undefined) {
    assertPort(params.outputTcpPort, "serial.outputTcpPort");
  }
}

function validateFileParams(params: FileParams): void {
  assertNonEmpty(params.path, "file.path");
  if (typeof params.timeTag !== "boolean") {
    throw new Error("file.timeTag must be a boolean");
  }
  if (params.replaySpeed != undefined && (!Number.isFinite(params.replaySpeed) || params.replaySpeed <= 0)) {
    throw new Error("file.replaySpeed must be a positive number");
  }
  if (params.startOffset != undefined && (!Number.isFinite(params.startOffset) || params.startOffset < 0)) {
    throw new Error("file.startOffset must be zero or positive");
  }
  if (
    params.filePositionBytes != undefined &&
    params.filePositionBytes !== 4 &&
    params.filePositionBytes !== 8
  ) {
    throw new Error("file.filePositionBytes must be 4 or 8");
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

function assertStreamOption(value: number, name: StreamOptionKey): void {
  const limits = streamOptionLimits[name];
  if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
    throw new Error(`${name} must be between ${limits.min} and ${limits.max}`);
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}
