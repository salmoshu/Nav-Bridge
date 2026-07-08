import net from "node:net";
import { TcpAdapter } from "../../main/stream/adapters/TcpAdapter";
import { StreamServer } from "../../main/stream/StreamServer";

describe("TCP client input with low frequency data", () => {
  it("reads and forwards data that arrives once per second", async () => {
    const server = net.createServer((socket) => {
      const message = "2024/04/26 04:11:15.000   39.980719389  116.476653374    53.5707\r\n";
      socket.write(Buffer.from(message));
      const interval = setInterval(() => {
        socket.write(Buffer.from(message));
      }, 1000);
      socket.on("close", () => clearInterval(interval));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("Expected TCP address object");
    }

    const input = new TcpAdapter("input", "input", {
      type: "tcp-client",
      params: { host: "127.0.0.1", port: address.port }
    });

    const serverInstance = new StreamServer(input, [], {
      bufferSize: 4096,
      statusInterval: 500
    });

    const dataEntries: Array<{ endpointId: string; bytes: number }> = [];
    serverInstance.onData((entry) => {
      dataEntries.push({ endpointId: entry.endpointId, bytes: entry.bytes });
    });

    await serverInstance.start();

    // Wait for data to arrive
    await new Promise((resolve) => setTimeout(resolve, 2500));

    await serverInstance.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(dataEntries.length).toBeGreaterThan(0);
    expect(dataEntries[0].bytes).toBeGreaterThan(0);
  });
});
