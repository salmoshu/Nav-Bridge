import fs from "node:fs";
import path from "node:path";
import { formatAscii, formatHex, formatStreams } from "../../renderer/components/MonitorApp";
import type { StreamDataEntry, StreamStatus } from "../../shared/stream";

const repoRoot = path.resolve(__dirname, "../../..");

function makeStatus(
  input: Partial<StreamStatus["input"]>,
  outputs: Partial<StreamStatus["outputs"][number]>[] = []
): StreamStatus {
  return {
    running: true,
    input: {
      id: "input",
      type: "tcp-server",
      status: "idle",
      bytes: 0,
      bps: 0,
      ...input
    },
    outputs: outputs.map((output, index) => ({
      id: `output-${index + 1}`,
      type: "udp-client",
      status: "idle",
      bytes: 0,
      bps: 0,
      ...output
    }))
  };
}

describe("formatStreams", () => {
  it("shows a placeholder when status is missing", () => {
    expect(formatStreams(undefined)).toBe("No stream status");
  });

  it("renders an input stream section with indented key/value pairs", () => {
    const status = makeStatus({
      status: "connected",
      uptime: 12.5,
      bytes: 1536,
      bps: 1135
    });

    const text = formatStreams(status);

    expect(text).toContain("[STREAM 0]");
    expect(text).toMatch(/Role\s*:\s*Input/);
    expect(text).toMatch(/Type\s*:\s*tcp-server/);
    expect(text).toMatch(/Status\s*:\s*connected/);
    expect(text).toMatch(/Uptime\s*:\s*12\.5s/);
    expect(text).toMatch(/Bytes\s*:\s*1\.50 KB/);
    expect(text).toMatch(/Bps\s*:\s*1,135/);
  });

  it("renders output stream sections", () => {
    const status = makeStatus({ status: "connected", uptime: 5 }, [
      { status: "connected" },
      { status: "error", error: "timeout" }
    ]);

    const text = formatStreams(status);

    expect(text).toContain("[STREAM 1]");
    expect(text).toMatch(/Role\s*:\s*Output/);
    expect(text).toContain("[STREAM 2]");
    expect(text).toMatch(/Error\s*:\s*timeout/);
  });

  it("renders server client counts", () => {
    const status = makeStatus({ status: "connected", uptime: 10 }, [
      { type: "tcp-server", status: "connected", clients: 2 }
    ]);

    const text = formatStreams(status);

    expect(text).toMatch(/Clients\s*:\s*2/);
  });

  it("omits optional fields when not present", () => {
    const status = makeStatus({ status: "idle" });

    const text = formatStreams(status);

    expect(text).not.toContain("Uptime");
    expect(text).not.toContain("Clients");
    expect(text).not.toContain("Error");
  });
});

describe("formatHex", () => {
  it("returns an empty string when no data is available", () => {
    expect(formatHex([])).toBe("");
  });

  it("renders bytes as uppercase hex", () => {
    const entries: StreamDataEntry[] = [{ time: "2026-01-01T00:00:00.000Z", data: [0, 255, 16, 31] }];
    expect(formatHex(entries)).toBe("00 FF 10 1F  ");
  });

  it("fixes 32 bytes per line", () => {
    const data = Array.from({ length: 40 }, (_, index) => index);
    const entries: StreamDataEntry[] = [{ time: "2026-01-01T00:00:00.000Z", data }];
    const lines = formatHex(entries).split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0].startsWith("00 01 02 03")).toBe(true);
    expect(lines[1].startsWith("20 21 22 23")).toBe(true);
    expect(lines[0].trimEnd().split("  ")).toHaveLength(8);
  });

  it("groups bytes by four with an extra space between groups", () => {
    const data = Array.from({ length: 8 }, (_, index) => index);
    const entries: StreamDataEntry[] = [{ time: "2026-01-01T00:00:00.000Z", data }];

    expect(formatHex(entries)).toBe("00 01 02 03  04 05 06 07  ");
  });

  it("concatenates data across multiple entries", () => {
    const entries: StreamDataEntry[] = [
      { time: "2026-01-01T00:00:00.000Z", data: [0x48, 0x65, 0x6c, 0x6c] },
      { time: "2026-01-01T00:00:00.001Z", data: [0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64] }
    ];

    expect(formatHex(entries)).toBe("48 65 6C 6C  6F 20 57 6F  72 6C 64  ");
  });
});

describe("formatAscii", () => {
  it("returns an empty string when no data is available", () => {
    expect(formatAscii([])).toBe("");
  });

  it("renders printable bytes as characters", () => {
    const entries: StreamDataEntry[] = [
      { time: "2026-01-01T00:00:00.000Z", data: [0x48, 0x65, 0x6c, 0x6c, 0x6f] }
    ];
    expect(formatAscii(entries)).toBe("Hello  ");
  });

  it("renders non-printable bytes as dots", () => {
    const entries: StreamDataEntry[] = [{ time: "2026-01-01T00:00:00.000Z", data: [0x48, 0x00, 0x7f] }];
    expect(formatAscii(entries)).toBe("H..  ");
  });

  it("strips trailing carriage return and line feed bytes", () => {
    const line = "2024/04/26 08:54:19.000   39.980719355";
    const data = [...Buffer.from(line, "ascii"), 0x0d, 0x0a];
    const entries: StreamDataEntry[] = [{ time: "2026-01-01T00:00:00.000Z", data }];

    expect(formatAscii(entries)).toBe(`${line}  `);
  });

  it("renders internal line endings as line breaks", () => {
    const entries: StreamDataEntry[] = [{ time: "2026-01-01T00:00:00.000Z", data: [0x61, 0x0d, 0x0a, 0x62] }];
    expect(formatAscii(entries)).toBe("a  \nb  ");
  });
});

describe("MonitorApp scrolling behavior", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/components/MonitorApp.tsx"), "utf-8");

  it("tracks whether the user has scrolled away from the bottom", () => {
    expect(source).toContain("autoScroll");
    expect(source).toContain("handleContentScroll");
    expect(source).toContain("onScroll={handleContentScroll}");
  });

  it("scrolls the container to the bottom when auto-scroll is enabled", () => {
    expect(source).toContain("scrollContentToBottom");
    expect(source).toContain("element.scrollTop = element.scrollHeight - element.clientHeight");
  });

  it("resumes auto-scroll when switching views", () => {
    expect(source).toContain("setAutoScroll(true)");
    expect(source).toMatch(/useEffect\(\s*\(\)\s*=>\s*\{\s*setAutoScroll\(true\)/);
  });

  it("freezes the streams status when paused", () => {
    expect(source).toContain("displayStatus");
    expect(source).toMatch(
      /const\s+streamsText\s*=\s*useMemo\(\s*\(\)\s*=>\s*formatStreams\(\s*displayStatus\s*\)/
    );
    expect(source).toMatch(/if\s*\(\s*!paused\s*\)\s*\{[\s\S]*?setDisplayStatus\(\s*status\s*\)/);
  });

  it("labels the hex view as HEX", () => {
    expect(source).toContain('{ value: "hex", label: "HEX" }');
  });
});

describe("MonitorApp clear behavior", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/components/MonitorApp.tsx"), "utf-8");

  it("accepts an onClear callback prop", () => {
    expect(source).toContain("onClear: () => void");
  });

  it("clears display state and invokes onClear when clearing the screen", () => {
    expect(source).toContain("setDisplayStatus(undefined)");
    expect(source).toContain("setDisplayData([])");
    expect(source).toContain("setDisplayLogs([])");
    expect(source).toMatch(/const\s+clear\s*=\s*\(\)\s*(?::\s*\w+\s*)?=>\s*\{[\s\S]*?onClear\(\)/);
  });
});
