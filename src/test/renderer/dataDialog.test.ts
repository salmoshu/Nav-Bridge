import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("DataDialog", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/components/DataDialog.tsx"), "utf-8");

  it("renders per-endpoint realtime data entries rather than global logs", () => {
    expect(source).toContain("StreamDataEntry");
    expect(source).toContain("Data for");
    expect(source).toContain("entry.direction");
    expect(source).toContain("entry.preview");
    expect(source).toContain("No data");
  });
});
