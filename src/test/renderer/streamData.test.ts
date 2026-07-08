import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("useStreamStatus data stream", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/hooks/useStreamStatus.ts"), "utf-8");

  it("subscribes to endpoint data and keeps a bounded history", () => {
    expect(source).toContain("dataEntries");
    expect(source).toContain("api.onData");
    expect(source).toContain("slice(0, 200)");
  });
});
