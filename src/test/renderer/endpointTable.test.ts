import { endpointGridColumns } from "../../renderer/components/EndpointTable";

describe("endpointGridColumns", () => {
  it("allocates more width to Type than before and keeps Info flexible", () => {
    const columns = endpointGridColumns.split(" ");
    const typeIndex = 3;
    const infoIndex = 4;
    expect(columns[typeIndex]).toMatch(/^\d+px$/);
    expect(Number.parseInt(columns[typeIndex], 10)).toBeGreaterThanOrEqual(100);
    expect(columns[infoIndex]).toContain("minmax");
    expect(columns[infoIndex]).toContain("1fr");
  });

  it("takes space from the Bytes and BPS columns to widen Info", () => {
    const columns = endpointGridColumns.split(" ");
    const bytesIndex = 5;
    const bpsIndex = 6;
    expect(columns[bytesIndex]).toMatch(/^\d+px$/);
    expect(columns[bpsIndex]).toMatch(/^\d+px$/);
    expect(columns[bytesIndex]).toBe(columns[bpsIndex]);
    expect(Number.parseInt(columns[bytesIndex], 10)).toBeLessThanOrEqual(40);
  });

  it("reserves enough width for the actions column to host configure, delete and data buttons", () => {
    const columns = endpointGridColumns.split(" ");
    const actionsIndex = 7;
    expect(columns[actionsIndex]).toMatch(/^\d+px$/);
    expect(Number.parseInt(columns[actionsIndex], 10)).toBeGreaterThanOrEqual(60);
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

  it("shows global logs near export and uses row actions for data", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointTable.tsx"),
      "utf-8"
    );

    expect(source).toContain("onShowSystemLogs");
    expect(source.indexOf("View system logs")).toBeLessThan(source.indexOf("Export configuration"));
    expect(source).toContain("DataObjectIcon");
    expect(source).toContain("View data");
    expect(source).not.toContain("View logs");
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
    expect(source.indexOf("<SettingsIcon")).toBeLessThan(source.indexOf("<DataObjectIcon"));
    expect(source.indexOf("<DataObjectIcon")).toBeLessThan(source.indexOf("<DeleteIcon"));
  });
});
