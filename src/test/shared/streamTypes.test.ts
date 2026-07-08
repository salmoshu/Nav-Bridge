import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("StreamType", () => {
  it("does not include a blank endpoint type", () => {
    const source = fs.readFileSync(path.join(repoRoot, "src/shared/stream.ts"), "utf-8");

    expect(source).not.toContain('export type StreamType = "" |');
  });
});
