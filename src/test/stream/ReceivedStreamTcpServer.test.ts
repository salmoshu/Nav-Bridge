import net from "node:net";
import { ReceivedStreamTcpServer } from "../../main/stream/adapters/ReceivedStreamTcpServer";

describe("ReceivedStreamTcpServer", () => {
  it("broadcasts serial bytes to connected TCP clients", async () => {
    const server = new ReceivedStreamTcpServer();
    await server.open(0);
    const port = server.getBoundPort();

    const client1 = net.createConnection({ host: "127.0.0.1", port });
    const client2 = net.createConnection({ host: "127.0.0.1", port });
    await Promise.all([
      new Promise<void>((resolve) => client1.once("connect", resolve)),
      new Promise<void>((resolve) => client2.once("connect", resolve))
    ]);

    const received1 = new Promise<Buffer>((resolve) => client1.once("data", resolve));
    const received2 = new Promise<Buffer>((resolve) => client2.once("data", resolve));
    server.write(Buffer.from("serial-data"));

    await expect(received1).resolves.toEqual(Buffer.from("serial-data"));
    await expect(received2).resolves.toEqual(Buffer.from("serial-data"));
    expect(server.getClients()).toBe(2);

    client1.destroy();
    client2.destroy();
    await server.close();
  });
});
