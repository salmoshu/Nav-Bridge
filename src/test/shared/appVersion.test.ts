import fs from "node:fs";
import path from "node:path";

describe("application version", () => {
  it("uses a numeric release version without a date suffix", () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"));
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
