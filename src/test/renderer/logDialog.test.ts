import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("LogDialog", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/components/LogDialog.tsx"), "utf-8");

  it("uses compact chip corners for endpoint type and status metrics", () => {
    expect(source).toContain("metricChipSx");
    expect(source).toContain("borderRadius: 1");
    expect(source).toContain("formatEndpointType(endpoint.type)");
    expect(source).toContain("Status:");
    expect(source).toContain("Bytes:");
    expect(source).toContain("BPS:");
  });
});
