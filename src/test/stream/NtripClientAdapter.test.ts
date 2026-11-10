import net from "node:net";
import { NtripClientAdapter } from "../../main/stream/adapters/NtripClientAdapter";

describe("NtripClientAdapter", () => {
  it("sends an NTRIP request and exposes bytes after the response headers", async () => {
    const server = net.createServer((socket) => {
      socket.once("data", (request) => {
        const text = request.toString("ascii");
        expect(text).toContain("GET /MOUNT HTTP/1.0");
        expect(text).toContain("User-Agent: NTRIP Nav-Bridge");
        expect(text).toContain("Authorization: Basic dXNlcjpwYXNz");
        socket.write("ICY 200 OK\r\n\r\n");
        socket.write(Buffer.from([0xd3, 0x00, 0x01]));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("Expected TCP address object");
    }

    const adapter = new NtripClientAdapter("input", "input", {
      host: "127.0.0.1",
      port: address.port,
      mountpoint: "MOUNT",
      username: "user",
      password: "pass"
    });
    await adapter.open();

    await expect(adapter.read(1024)).resolves.toEqual(Buffer.from([0xd3, 0x00, 0x01]));
    expect(adapter.getStatus().status).toBe("connected");

    await adapter.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("rejects a caster response that is not successful", async () => {
    const server = net.createServer((socket) => {
      socket.once("data", () => socket.end("HTTP/1.0 401 Unauthorized\r\n\r\n"));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("Expected TCP address object");
    }

    const adapter = new NtripClientAdapter("input", "input", {
      host: "127.0.0.1",
      port: address.port,
      mountpoint: "MOUNT"
    });

    await expect(adapter.open()).rejects.toThrow("NTRIP connection rejected");
    expect(adapter.getStatus().status).toBe("error");
    await adapter.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
