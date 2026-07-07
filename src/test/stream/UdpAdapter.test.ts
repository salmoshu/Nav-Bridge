import dgram from "node:dgram";
import { UdpAdapter } from "../../main/stream/adapters/UdpAdapter";

describe("UdpAdapter", () => {
  it("receives datagrams on a UDP server input", async () => {
    const input = new UdpAdapter("udp-input", "input", {
      type: "udp-server",
      params: { host: "127.0.0.1", port: 0 }
    });
    await input.open();
    const port = input.getBoundPort();
    const client = dgram.createSocket("udp4");

    await new Promise<void>((resolve, reject) => {
      client.send(Buffer.from("hello"), port, "127.0.0.1", (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const data = await input.read(1024);
    client.close();
    await input.close();

    expect(data?.toString()).toBe("hello");
  });

  it("sends datagrams from a UDP client output", async () => {
    const receiver = dgram.createSocket("udp4");
    await new Promise<void>((resolve) => receiver.bind(0, "127.0.0.1", resolve));
    const address = receiver.address();
    if (typeof address === "string") {
      throw new Error("Expected UDP address object");
    }

    const output = new UdpAdapter("udp-output", "output", {
      type: "udp-client",
      params: { host: "127.0.0.1", port: address.port }
    });
    await output.open();

    const received = new Promise<Buffer>((resolve) => receiver.once("message", resolve));
    await output.write(Buffer.from("world"));

    await expect(received).resolves.toEqual(Buffer.from("world"));
    await output.close();
    receiver.close();
  });

  it("rejects when a UDP server cannot bind", async () => {
    const occupied = dgram.createSocket("udp4");
    await new Promise<void>((resolve) => occupied.bind(0, "127.0.0.1", resolve));
    const address = occupied.address();
    if (typeof address === "string") {
      throw new Error("Expected UDP address object");
    }

    const input = new UdpAdapter("udp-input", "input", {
      type: "udp-server",
      params: { host: "127.0.0.1", port: address.port }
    });

    await expect(input.open()).rejects.toThrow();
    await input.close();
    occupied.close();
  });
});
