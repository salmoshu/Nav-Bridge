import net from "node:net";
import { once } from "node:events";
import { TcpAdapter } from "../../main/stream/adapters/TcpAdapter";
import { StreamServer } from "../../main/stream/StreamServer";
import { connect, listen, waitFor } from "./networkHelpers";

describe("TCP client input + TCP server output data flow", () => {
  it("forwards data from a TCP client input to a connected TCP server output", async () => {
    let externalSocket: net.Socket | undefined;
    let tearingDown = false;
    const errors: Error[] = [];
    const externalServer = net.createServer((socket) => {
      externalSocket = socket;
      socket.on("error", (error: NodeJS.ErrnoException) => {
        // Windows may reset a socket that is destroyed during test teardown.
        if (!tearingDown || error.code !== "ECONNRESET") errors.push(error);
      });
    });
    const externalPort = await listen(externalServer);

    const input = new TcpAdapter("input", "input", {
      type: "tcp-client",
      params: { host: "127.0.0.1", port: externalPort }
    });

    const output = new TcpAdapter("output-1", "output", {
      type: "tcp-server",
      params: { host: "127.0.0.1", port: 0 }
    });

    const server = new StreamServer(input, [output], {
      bufferSize: 4096,
      statusInterval: 1000
    });

    const dataEntries: Array<{ data: number[] }> = [];
    server.onData((entry) => {
      dataEntries.push({ data: entry.data });
    });

    let outputClient: net.Socket | undefined;
    try {
      await server.start();
      outputClient = await connect(output.getBoundPort());
      await waitFor(() => output.getClients() === 1 && externalSocket != undefined);
      const received = once(outputClient, "data");
      const message = Buffer.from("hello-from-external");
      externalSocket!.write(message);
      expect((await received)[0]).toEqual(message);
      await waitFor(() => server.getStatus().outputs[0].bytes === message.length);
      expect(dataEntries).toEqual([{ data: Array.from(message) }]);
      expect(server.getStatus().outputs[0].status).toBe("connected");
    } finally {
      tearingDown = true;
      externalSocket?.end();
      outputClient?.end();
      await server.stop();
      externalSocket?.destroy();
      outputClient?.destroy();
      await new Promise<void>((resolve) => externalServer.close(() => resolve()));
    }
    expect(errors).toEqual([]);
  });
});
