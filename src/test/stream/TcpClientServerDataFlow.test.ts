import net from "node:net";
import { TcpAdapter } from "../../main/stream/adapters/TcpAdapter";
import { StreamServer } from "../../main/stream/StreamServer";

describe("TCP client input + TCP server output data flow", () => {
  it("forwards data from a TCP client input to a connected TCP server output", async () => {
    const externalServer = net.createServer((socket) => {
      const interval = setInterval(() => {
        socket.write(Buffer.from("hello-from-external"));
      }, 20);
      socket.on("close", () => clearInterval(interval));
    });
    await new Promise<void>((resolve) => externalServer.listen(0, "127.0.0.1", resolve));
    const externalAddress = externalServer.address();
    if (typeof externalAddress === "string" || externalAddress == undefined) {
      throw new Error("Expected TCP address object");
    }

    const input = new TcpAdapter("input", "input", {
      type: "tcp-client",
      params: { host: "127.0.0.1", port: externalAddress.port }
    });

    const output = new TcpAdapter("output-1", "output", {
      type: "tcp-server",
      params: { host: "127.0.0.1", port: 0 }
    });

    const server = new StreamServer(input, [output], {
      bufferSize: 4096,
      statusInterval: 1000
    });

    const dataEntries: Array<{ endpointId: string; direction: "input" | "output" }> = [];
    server.onData((entry) => {
      dataEntries.push({ endpointId: entry.endpointId, direction: entry.direction });
    });

    await server.start();

    // Wait for input to connect
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Connect a client to the output TCP server
    const outputPort = output.getBoundPort();
    const outputClient = net.createConnection({ host: "127.0.0.1", port: outputPort });
    outputClient.on("error", () => undefined);
    await new Promise<void>((resolve) => outputClient.once("connect", resolve));

    // Wait for data to be forwarded
    await new Promise((resolve) => setTimeout(resolve, 500));

    const inputEntries = dataEntries.filter((entry) => entry.endpointId === "input");
    const outputEntries = dataEntries.filter((entry) => entry.endpointId === "output-1");

    expect(inputEntries.length).toBeGreaterThan(0);
    expect(outputEntries.length).toBeGreaterThan(0);

    outputClient.destroy();
    await server.stop();
    await new Promise<void>((resolve) => externalServer.close(() => resolve()));
  });
});
