import net from "node:net";

/** Broadcast-only TCP outlet. Slow clients never block the serial data path. */
export class ReceivedStreamTcpServer {
  private server?: net.Server;
  private readonly clients = new Set<net.Socket>();

  public constructor(private readonly onError?: (error: Error) => void) {}

  public async open(port: number): Promise<void> {
    const server = net.createServer((socket) => {
      socket.setNoDelay(true);
      this.clients.add(socket);
      socket.on("error", () => socket.destroy());
      socket.once("close", () => this.clients.delete(socket));
      // This port only outputs serial RX; client input is deliberately discarded.
      socket.resume();
    });
    this.server = server;
    server.maxConnections = 64;
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "0.0.0.0", () => {
        server.off("error", reject);
        server.on("error", (error) => this.onError?.(error));
        resolve();
      });
    });
  }

  public write(data: Buffer): void {
    for (const client of this.clients) {
      if (client.destroyed) continue;
      if (client.writableLength + data.length > 1024 * 1024) {
        client.destroy();
        continue;
      }
      client.write(data);
    }
  }

  public getClients(): number {
    return this.clients.size;
  }

  public getBoundPort(): number {
    const address = this.server?.address();
    if (address == undefined || typeof address === "string") {
      throw new Error("Received stream TCP server is not listening");
    }
    return address.port;
  }

  public async close(): Promise<void> {
    for (const client of this.clients) client.destroy();
    this.clients.clear();
    const server = this.server;
    this.server = undefined;
    if (server != undefined) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
}
