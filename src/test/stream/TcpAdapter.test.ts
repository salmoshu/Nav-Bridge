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

  it("returns to connected status when a client connects after all clients disconnected", async () => {
    const output = new TcpAdapter("tcp-output", "output", {
      type: "tcp-server",
      params: { host: "127.0.0.1", port: 0 }
    });
    await output.open();
    const port = output.getBoundPort();

    const client1 = net.createConnection({ host: "127.0.0.1", port });
    await new Promise<void>((resolve) => client1.once("connect", resolve));
    expect(output.getStatus().status).toBe("connected");

    client1.destroy();
    await new Promise<void>((resolve) => client1.once("close", resolve));
    expect(output.getStatus().status).toBe("idle");

    const client2 = net.createConnection({ host: "127.0.0.1", port });
    await new Promise<void>((resolve) => client2.once("connect", resolve));
    expect(output.getStatus().status).toBe("connected");

    client2.destroy();
    await output.close();
  });

  it("sends connectMessage after TCP client connection", async () => {
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
      params: { host: "127.0.0.1", port: address.port, connectMessage: "GET / HTTP/1.0\\r\\n\\r\\n" }
    });
    await output.open();

    await expect(received).resolves.toEqual(Buffer.from("GET / HTTP/1.0\r\n\r\n"));
    await output.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("does not throw when the TCP server is unavailable in output mode", async () => {
    // Use an address that is not accepting connections.
    const output = new TcpAdapter("tcp-output", "output", {
      type: "tcp-client",
      params: { host: "127.0.0.1", port: 0 }
    });
    await expect(output.open()).resolves.toBeUndefined();
    expect(output.getStatus().status).not.toBe("error");

    // Writing while disconnected should not throw.
    await expect(output.write(Buffer.from("ignored"))).resolves.toBeUndefined();

    await output.close();
  });
});
