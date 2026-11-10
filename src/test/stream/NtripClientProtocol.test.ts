import net from "node:net";
import { mkdtemp, readFile, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NtripClientAdapter } from "../../main/stream/adapters/NtripClientAdapter";
import { FileAdapter } from "../../main/stream/adapters/FileAdapter";
import { StreamServer } from "../../main/stream/StreamServer";
import { listen, waitFor } from "./networkHelpers";

describe("NTRIP protocol and recovery", () => {
  const sockets = new Set<net.Socket>();
  const adapters: NtripClientAdapter[] = [];
  const servers: net.Server[] = [];

  afterEach(async () => {
    await Promise.all(adapters.splice(0).map((adapter) => adapter.close()));
    for (const socket of sockets) socket.destroy();
    sockets.clear();
    await Promise.all(
      servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
    );
  });

  async function setup(handler: (socket: net.Socket, request: string) => void, options = {}) {
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.setNoDelay(true);
      let request = "";
      const receive = (data: Buffer): void => {
        request += data.toString("ascii");
        if (request.includes("\r\n\r\n")) {
          socket.off("data", receive);
          handler(socket, request);
        }
      };
      socket.on("data", receive);
    });
    servers.push(server);
    const adapter = new NtripClientAdapter(
      "input",
      "input",
      {
        host: "127.0.0.1",
        port: await listen(server),
        mountpoint: "/RTCM3",
        ...options
      },
      { reconnectInterval: 20, inactiveTimeout: 1000, ...options }
    );
    adapters.push(adapter);
    return adapter;
  }

  async function readBytes(adapter: NtripClientAdapter, length: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const deadline = Date.now() + 2000;
    let count = 0;
    while (count < length && Date.now() < deadline) {
      const chunk = await adapter.read(1024);
      if (chunk != undefined) {
        chunks.push(chunk);
        count += chunk.length;
      }
    }
    return Buffer.concat(chunks);
  }

  it("accepts an RTKLIB ICY response with binary data immediately after its single status line", async () => {
    let request = "";
    const adapter = await setup((socket, text) => {
      request = text;
      socket.write(Buffer.concat([Buffer.from("ICY 200 OK\r\n"), Buffer.from([0xd3, 0, 13, 10, 1])]));
    });
    await adapter.open();
    expect(request).toContain("GET /RTCM3 HTTP/1.0");
    expect(request).not.toContain("Authorization:");
    expect(await readBytes(adapter, 5)).toEqual(Buffer.from([0xd3, 0, 13, 10, 1]));
  });

  it("forwards only correction bytes through StreamServer into a file output", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nav-bridge-ntrip-"));
    const file = join(directory, "corrections.rtcm3");
    const corrections = Buffer.from([0xd3, 0, 3, 0x42, 13, 10]);
    const input = await setup((socket) => {
      socket.write(
        Buffer.concat([Buffer.from("HTTP/1.1 200 OK\r\nContent-Type: gnss/data\r\n\r\n"), corrections])
      );
    });
    const output = new FileAdapter("output-1", "output", { path: file, timeTag: false });
    const bridge = new StreamServer(input, [output], { statusInterval: 100 });
    try {
      await bridge.start();
      await waitFor(() => bridge.getStatus().outputs[0].bytes === corrections.length);
      expect(await readFile(file)).toEqual(corrections);
      expect(bridge.getStatus().input).toMatchObject({
        type: "ntrip-client",
        status: "connected",
        bytes: corrections.length
      });
    } finally {
      await bridge.stop();
      await rm(file, { force: true });
      await rmdir(directory);
    }
  });

  it("handles a fragmented ICY status and optional empty line", async () => {
    const adapter = await setup((socket) => {
      socket.write("ICY 20");
      setTimeout(() => {
        if (socket.destroyed) return;
        socket.write("0 OK\r\n\r");
        setTimeout(() => {
          if (!socket.destroyed) socket.write(Buffer.from([10, 0xd3, 0, 1]));
        }, 5);
      }, 5);
    });
    await adapter.open();
    expect(await readBytes(adapter, 3)).toEqual(Buffer.from([0xd3, 0, 1]));
  });

  it("decodes HTTP chunk sizes and boundaries without forwarding HTTP framing", async () => {
    const adapter = await setup((socket) => {
      socket.write("HTTP/1.1 200 OK\r\nContent-Type: gnss/data\r\nTransfer-Encoding: chunked\r\n\r\n3\r");
      setTimeout(() => {
        if (socket.destroyed) return;
        socket.write(
          Buffer.concat([Buffer.from("\n"), Buffer.from([0xd3, 0, 1]), Buffer.from("\r\n2;ext=1\r\n")])
        );
        setTimeout(() => {
          if (!socket.destroyed) socket.write(Buffer.from([2, 3, 13, 10]));
        }, 5);
      }, 5);
    });
    await adapter.open();
    expect(await readBytes(adapter, 5)).toEqual(Buffer.from([0xd3, 0, 1, 2, 3]));
  });

  it.each([
    "SOURCETABLE 200 OK\r\n\r\nSTR;RTCM3",
    "HTTP/1.1 200 OK\r\nContent-Type: gnss/sourcetable\r\n\r\nSTR;RTCM3",
    "HTTP/1.0 404 Not Found\r\n\r\n"
  ])("rejects a non-stream caster response: %s", async (response) => {
    const adapter = await setup((socket) => socket.write(response));
    await expect(adapter.open()).rejects.toThrow("NTRIP connection rejected");
    expect(adapter.getStatus().status).toBe("error");
  });

  it("bounds the response header buffer", async () => {
    const adapter = await setup((socket) => socket.write(`HTTP/1.1 200 OK\r\nX-Fill: ${"x".repeat(17000)}`));
    await expect(adapter.open()).rejects.toThrow("headers are too large");
  });

  it("times out a caster that accepts TCP but never answers", async () => {
    const adapter = await setup(() => {}, { inactiveTimeout: 30 });
    await expect(adapter.open()).rejects.toThrow(/timeout|timed out/);
  });

  it("supports disabling the stream inactivity timeout", async () => {
    const adapter = await setup(
      (socket) => {
        socket.write("ICY 200 OK\r\n");
        setTimeout(() => {
          if (!socket.destroyed) socket.write("late-data");
        }, 30);
      },
      { inactiveTimeout: 0 }
    );
    await adapter.open();
    expect(await readBytes(adapter, 9)).toEqual(Buffer.from("late-data"));
    expect(adapter.getStatus().status).toBe("connected");
  });

  it("reconnects and sends a fresh authenticated request after the caster disconnects", async () => {
    let connections = 0;
    let firstSocket: net.Socket | undefined;
    const requests: string[] = [];
    const adapter = await setup(
      (socket, request) => {
        connections++;
        requests.push(request);
        firstSocket ??= socket;
        socket.write(`ICY 200 OK\r\n${connections}`);
      },
      { username: "user", password: "pass" }
    );
    await adapter.open();
    expect(await readBytes(adapter, 1)).toEqual(Buffer.from("1"));
    firstSocket!.destroy();
    await waitFor(() => connections >= 2);
    expect(await readBytes(adapter, 1)).toEqual(Buffer.from("2"));
    expect(requests[1]).toContain("Authorization: Basic dXNlcjpwYXNz");
    await adapter.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(connections).toBe(2);
    expect(adapter.getStatus().status).toBe("idle");
  });
});
