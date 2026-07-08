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

  it("reserves enough width for the actions column to host configure, delete and log buttons", () => {
    const columns = endpointGridColumns.split(" ");
    const actionsIndex = 7;
    expect(columns[actionsIndex]).toMatch(/^\d+px$/);
    expect(Number.parseInt(columns[actionsIndex], 10)).toBeGreaterThanOrEqual(60);
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
    expect(source.indexOf("<SettingsIcon")).toBeLessThan(source.indexOf("<ArticleIcon"));
    expect(source.indexOf("<ArticleIcon")).toBeLessThan(source.indexOf("<DeleteIcon"));
  });
});
