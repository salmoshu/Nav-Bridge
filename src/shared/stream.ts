export type StreamType = "tcp-server" | "tcp-client" | "udp-server" | "udp-client" | "serial";
export type StreamMode = "input" | "output";
export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface TcpServerParams {
  port: number;
  host?: string;
}

export interface TcpClientParams {
  host: string;
  port: number;
}

export interface UdpServerParams {
  port: number;
  host?: string;
}

export interface UdpClientParams {
  host: string;
  port: number;
}

export interface SerialParams {
  port: string;
  baudRate: number;
  dataBits: 7 | 8;
  parity: "none" | "even" | "odd";
  stopBits: 1 | 2;
  flowControl: "none" | "rtscts";
}

export type StreamEndpointParams =
  TcpServerParams | TcpClientParams | UdpServerParams | UdpClientParams | SerialParams;

export interface StreamEndpoint {
  id: string;
  type: StreamType;
  enabled: boolean;
  params: StreamEndpointParams;
}

export interface StreamOptions {
  bufferSize: number;
  reconnectInterval: number;
  inactiveTimeout: number;
  statusInterval: number;
}

export interface StreamConfig {
  version: "0.0.1";
  input: StreamEndpoint;
  outputs: StreamEndpoint[];
  options: StreamOptions;
}

export interface StreamAdapterStatus {
  id: string;
  type: StreamType;
  mode: StreamMode;
  status: ConnectionStatus;
  error?: string;
}

export interface StreamMetric {
  id: string;
  type: StreamType;
  status: ConnectionStatus;
  bytes: number;
  bps: number;
  error?: string;
}

export interface StreamStatus {
  running: boolean;
  input: StreamMetric;
  outputs: StreamMetric[];
}

export interface LogEntry {
  time: string;
  level: "info" | "warn" | "error";
  message: string;
}

export const defaultStreamConfig: StreamConfig = {
  version: "0.0.1",
  input: {
    id: "input",
    type: "tcp-server",
    enabled: true,
    params: { host: "127.0.0.1", port: 2101 }
  },
  outputs: [
    {
      id: "output-1",
      type: "udp-client",
      enabled: true,
      params: { host: "127.0.0.1", port: 2201 }
    }
  ],
  options: {
    bufferSize: 4096,
    reconnectInterval: 10000,
    inactiveTimeout: 10000,
    statusInterval: 1000
  }
};
