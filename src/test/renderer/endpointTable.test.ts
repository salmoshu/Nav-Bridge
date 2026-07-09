import { endpointGridColumns } from "../../renderer/components/EndpointTable";
import { formatBytes, getByteUnit } from "../../renderer/lib/formatBytes";

describe("formatBytes", () => {
  it("shows raw bytes with B suffix below 1 KB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("shows KB with two decimals between 1 KB and 1 MB", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1536)).toBe("1.50 KB");
  });

  it("shows MB with two decimals between 1 MB and 1 GB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.50 MB");
  });

  it("shows GB with two decimals above 1 GB", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
    expect(formatBytes(2.75 * 1024 * 1024 * 1024)).toBe("2.75 GB");
  });
});

describe("getByteUnit", () => {
  it("returns B below 1 KB", () => {
    expect(getByteUnit(0)).toBe("B");
    expect(getByteUnit(1023)).toBe("B");
  });

  it("returns KB between 1 KB and 1 MB", () => {
    expect(getByteUnit(1024)).toBe("KB");
    expect(getByteUnit(1024 * 1024 - 1)).toBe("KB");
  });

  it("returns MB between 1 MB and 1 GB", () => {
    expect(getByteUnit(1024 * 1024)).toBe("MB");
    expect(getByteUnit(1024 * 1024 * 1024 - 1)).toBe("MB");
  });

  it("returns GB at or above 1 GB", () => {
    expect(getByteUnit(1024 * 1024 * 1024)).toBe("GB");
    expect(getByteUnit(1024 * 1024 * 1024 * 2)).toBe("GB");
  });
});

describe("endpointGridColumns", () => {
  it("keeps Info flexible while allocating enough width to Type", () => {
    const columns = endpointGridColumns.split(" ");
    const typeIndex = 3;
    const infoIndex = 4;
    expect(columns[typeIndex]).toMatch(/^\d+px$/);
    expect(Number.parseInt(columns[typeIndex], 10)).toBeGreaterThanOrEqual(76);
    expect(columns[infoIndex]).toContain("minmax");
    expect(columns[infoIndex]).toContain("1fr");
  });

  it("allocates more width to Bytes than Bps to avoid overflow", () => {
    const columns = endpointGridColumns.split(" ");
    const bytesIndex = 5;
    const bpsIndex = 6;
    expect(columns[bytesIndex]).toMatch(/^\d+px$/);
    expect(columns[bpsIndex]).toMatch(/^\d+px$/);
    const bytesWidth = Number.parseInt(columns[bytesIndex], 10);
    const bpsWidth = Number.parseInt(columns[bpsIndex], 10);
    expect(bytesWidth).toBeGreaterThan(bpsWidth);
    expect(bytesWidth).toBeGreaterThanOrEqual(72);
  });

  it("reserves enough width for the actions column to host configure and delete buttons", () => {
    const columns = endpointGridColumns.split(" ");
    const actionsIndex = 7;
    expect(columns[actionsIndex]).toMatch(/^\d+px$/);
    expect(Number.parseInt(columns[actionsIndex], 10)).toBeGreaterThanOrEqual(50);
  });

  it("limits outputs to five so total streams are at most six", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("const MAX_OUTPUTS = 5");
  });

  it("shows a dynamic bytes unit hint in the Bytes header", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("bytesUnit");
    expect(source).toContain("getByteUnit");
    expect(source).toMatch(/\(\{\s*bytesUnit\s*\}\)/);
  });

  it("uses title case for the Add Output button", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("Add Output");
    expect(source).toContain('textTransform: "none"');
    expect(source).not.toContain("Add output");
  });

  it("shows stream monitor icon near export and removes per-row data actions", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("onShowSystemLogs");
    expect(source.indexOf("View stream monitor")).toBeLessThan(source.indexOf("Export configuration"));
    expect(source).toContain("DataObjectIcon");
    expect(source).not.toContain("View data");
    expect(source).not.toContain("onShowData");
  });

  it("adds concrete enabled UDP client outputs instead of blank endpoint types", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain('createDefaultEndpoint(`output-${nextIndex}`, "udp-client")');
    expect(source).not.toContain('createDefaultEndpoint(`output-${nextIndex}`, "")');
    expect(source).not.toContain('<MenuItem key="" value="">');
    expect(source).not.toContain("disabled={isBlank}");
  });

  it("renders a single editable Path string in the Path cell", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain(
      "<EndpointPathEditor endpoint={endpoint} disabled={disabled} onChange={onChange} />"
    );
    expect(source).toContain("function EndpointPathEditor");
    expect(source).toContain("value={endpointPath(endpoint)}");
    expect(source).toContain('"host:port"');
    expect(source).toContain('"port@baudRate"');
    expect(source).toContain('"file path"');
    expect(source).toContain("parseClientPath");
    expect(source).toContain("parseServerPort");
    expect(source).toContain("parseSerialPath");
    expect(source).toContain("isFileEndpoint");
  });

  it("allows file endpoints to be edited as a plain path in the Path cell", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("isFileEndpoint(endpoint)");
    expect(source).toContain("params: { ...params, path: value }");
  });

  it("disables endpoint editing and adding while the server is running", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("const disabled = status?.running ?? false;");
    expect(source).toContain("disabled={disabled}");
    expect(source).toContain(
      "<EndpointPathEditor endpoint={endpoint} disabled={disabled} onChange={onChange} />"
    );
  });

  it("keeps the status dot in the first cell and delete as the last row action", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    const circleIndex = source.indexOf("<CircleIcon");
    const indexBadgeIndex = source.indexOf("width: 18");
    expect(circleIndex).toBeGreaterThanOrEqual(0);
    expect(indexBadgeIndex).toBeGreaterThanOrEqual(0);
    expect(circleIndex).toBeLessThan(indexBadgeIndex);
    expect(source.indexOf("<SettingsIcon")).toBeLessThan(source.indexOf("<DeleteIcon"));
  });
});
