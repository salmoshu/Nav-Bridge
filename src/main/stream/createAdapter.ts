import type {
  FileParams,
  SerialParams,
  StreamEndpoint,
  StreamMode,
  TcpClientParams,
  TcpServerParams,
  UdpClientParams,
  UdpServerParams
} from "../../shared/stream";
import type { StreamAdapter } from "./adapters/StreamAdapter";
import { FileAdapter } from "./adapters/FileAdapter";
import { SerialAdapter } from "./adapters/SerialAdapter";
import { TcpAdapter } from "./adapters/TcpAdapter";
import { UdpAdapter } from "./adapters/UdpAdapter";

export function createAdapter(endpoint: StreamEndpoint, mode: StreamMode): StreamAdapter {
  switch (endpoint.type) {
    case "tcp-server":
      return new TcpAdapter(endpoint.id, mode, {
        type: endpoint.type,
        params: endpoint.params as TcpServerParams
      });
    case "tcp-client":
      return new TcpAdapter(endpoint.id, mode, {
        type: endpoint.type,
        params: endpoint.params as TcpClientParams
      });
    case "udp-server":
      if (mode !== "input") {
        throw new Error("UDP server is only supported as an input endpoint");
      }
      return new UdpAdapter(endpoint.id, mode, {
        type: endpoint.type,
        params: endpoint.params as UdpServerParams
      });
    case "udp-client":
      if (mode !== "output") {
        throw new Error("UDP client is only supported as an output endpoint");
      }
      return new UdpAdapter(endpoint.id, mode, {
        type: endpoint.type,
        params: endpoint.params as UdpClientParams
      });
    case "serial":
      return new SerialAdapter(endpoint.id, mode, endpoint.params as SerialParams);
    case "file":
      return new FileAdapter(endpoint.id, mode, endpoint.params as FileParams);
    default:
      throw new Error(`Unsupported stream type: ${(endpoint as StreamEndpoint).type}`);
  }
}
