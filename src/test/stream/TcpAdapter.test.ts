import net from "node:net";
import { TcpAdapter } from "../../main/stream/adapters/TcpAdapter";

describe("TcpAdapter", () => {
  it("accepts a client and reads bytes in TCP server input mode", async () => {
    const input = new TcpAdapter("tcp-input", "input", {
      type: "tcp-server",
      params: { host: "127.0.0.1", port: 0 }
    });
    await input.open();
    const port = input.getBoundPort();

    const client = net.createConnection({ host: "127.0.0.1", port });
    await new Promise<void>((resolve) => client.once("connect", resolve));
    client.write(Buffer.from("abc"));

    const data = await input.read(1024);
    client.destroy();
    await input.close();

    expect(data?.toString()).toBe("abc");
  });

  it("writes bytes to a connected TCP server in output client mode", async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("Expected TCP address object");
    }
    const received = new Promise<Buffer>((resolve) => {
      server.once("connection", (socket) => socket.once("data", resolve));
    });

    const output = new TcpAdapter("tcp-output", "output", {
      type: "tcp-client",
      params: { host: "127.0.0.1", port: address.port }
    });
    await output.open();
    await output.write(Buffer.from("xyz"));

    await expect(received).resolves.toEqual(Buffer.from("xyz"));
    await output.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
