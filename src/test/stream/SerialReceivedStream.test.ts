import { EventEmitter } from "node:events";
import net from "node:net";
import { SerialAdapter } from "../../main/stream/adapters/SerialAdapter";
import type { SerialParams } from "../../shared/stream";
import { connect, listen, waitFor } from "./networkHelpers";

interface MockPort extends EventEmitter {
  isOpen: boolean;
  writes: Buffer[];
}
const mockPorts: MockPort[] = [];
let mockOpenError: Error | undefined;

jest.mock("serialport", () => {
  const { EventEmitter: Emitter } = require("node:events");
  return {
    SerialPort: class extends Emitter {
      isOpen = false;
      writes: Buffer[] = [];
      constructor() {
        super();
        mockPorts.push(this as unknown as MockPort);
      }
      open(callback: (error?: Error) => void) {
        this.isOpen = mockOpenError == undefined;
        callback(mockOpenError);
      }
      close(callback: () => void) {
        this.isOpen = false;
        callback();
      }
      write(data: Buffer, callback: () => void) {
        this.writes.push(Buffer.from(data));
        callback();
      }
      drain(callback: () => void) {
        callback();
      }
    }
  };
});

const serialParams: SerialParams = {
  port: "COM3",
  baudRate: 115200,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: "none"
};

describe("serial output received stream", () => {
  let adapter: SerialAdapter;
  const clients: net.Socket[] = [];

  beforeEach(() => {
    mockPorts.length = 0;
    mockOpenError = undefined;
  });
  afterEach(async () => {
    for (const client of clients.splice(0)) client.destroy();
    await adapter?.close();
  });

  async function availablePort(): Promise<number> {
    const temporary = net.createServer();
    const port = await listen(temporary);
    await new Promise<void>((resolve) => temporary.close(() => resolve()));
    return port;
  }

  it("writes input data to the serial device and broadcasts only the device's RX to TCP clients", async () => {
    const port = await availablePort();
    adapter = new SerialAdapter("output-1", "output", { ...serialParams, outputTcpPort: port });
    await adapter.open();
    const client = await connect(port);
    const second = await connect(port);
    clients.push(client, second);
    await waitFor(() => adapter.getClients() === 2);
    await adapter.write(Buffer.from("corrections"));
    expect(mockPorts[0].writes).toEqual([Buffer.from("corrections")]);
    const received = new Promise<Buffer>((resolve) => client.once("data", resolve));
    const receivedSecond = new Promise<Buffer>((resolve) => second.once("data", resolve));
    mockPorts[0].emit("data", Buffer.from("$GPGGA,device-reply\r\n"));
    expect(await received).toEqual(Buffer.from("$GPGGA,device-reply\r\n"));
    expect(await receivedSecond).toEqual(Buffer.from("$GPGGA,device-reply\r\n"));
    client.write("must-not-reach-serial");
    expect(await adapter.read(1024)).toBeUndefined();
    expect(mockPorts[0].writes).toEqual([Buffer.from("corrections")]);
    await adapter.close();
    const rebound = net.createServer();
    await new Promise<void>((resolve) => rebound.listen(port, "0.0.0.0", resolve));
    await new Promise<void>((resolve) => rebound.close(() => resolve()));
  });

  it("releases its TCP port when opening the serial device fails", async () => {
    const port = await availablePort();
    mockOpenError = new Error("Device unavailable");
    adapter = new SerialAdapter("output-1", "output", { ...serialParams, outputTcpPort: port });
    await expect(adapter.open()).rejects.toThrow("Device unavailable");
    expect(adapter.getStatus().status).toBe("error");
    const rebound = net.createServer();
    await new Promise<void>((resolve) => rebound.listen(port, "0.0.0.0", resolve));
    await new Promise<void>((resolve) => rebound.close(() => resolve()));
  });

  it("does not open the serial device if its TCP outlet port is already in use", async () => {
    const occupied = net.createServer();
    await new Promise<void>((resolve) => occupied.listen(0, "0.0.0.0", resolve));
    const port = (occupied.address() as net.AddressInfo).port;
    adapter = new SerialAdapter("output-1", "output", { ...serialParams, outputTcpPort: port });
    try {
      await expect(adapter.open()).rejects.toThrow(/EADDRINUSE/);
      expect(mockPorts).toHaveLength(0);
    } finally {
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
  });

  it("preserves normal serial input reads", async () => {
    adapter = new SerialAdapter("input", "input", serialParams);
    await adapter.open();
    mockPorts[0].emit("data", Buffer.from("serial-input"));
    expect(await adapter.read(1024)).toEqual(Buffer.from("serial-input"));
  });
});
