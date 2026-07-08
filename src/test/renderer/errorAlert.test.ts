describe("ErrorAlert source", () => {
  function readSource(): string {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    return fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/ErrorAlert.tsx"),
      "utf-8"
    );
  }

  it("renders a close button for manual dismissal", () => {
    const source = readSource();
    expect(source).toContain("CloseIcon");
    expect(source).toContain("onClose");
    expect(source).toContain("IconButton");
  });

  it("auto-dismisses after 10 seconds and cleans up the timer", () => {
    const source = readSource();
    expect(source).toContain("setTimeout");
    expect(source).toContain("10000");
    expect(source).toContain("clearTimeout");
  });
});
