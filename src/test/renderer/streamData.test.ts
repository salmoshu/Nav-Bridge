import fs from "node:fs";
import path from "node:path";
import {
  MAX_MONITOR_DATA_ENTRIES,
  MAX_MONITOR_LOG_ENTRIES,
  pushMonitorEntry
} from "../../renderer/lib/monitorLimits";

const repoRoot = path.resolve(__dirname, "../../..");

describe("monitor limits", () => {
  it("keeps data and log histories bounded to 2048 entries", () => {
    expect(MAX_MONITOR_DATA_ENTRIES).toBe(2048);
    expect(MAX_MONITOR_LOG_ENTRIES).toBe(2048);
  });

  it("drops oldest entries when the cap is exceeded", () => {
    const items = [1, 2, 3];
    expect(pushMonitorEntry(items, 4, 3)).toEqual([2, 3, 4]);
  });

  it("keeps all entries when below the cap", () => {
    const items = [1, 2];
    expect(pushMonitorEntry(items, 3, 5)).toEqual([1, 2, 3]);
  });
});

describe("useMonitorData hook", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/hooks/useMonitorData.ts"), "utf-8");

  it("subscribes to status, log and data updates", () => {
    expect(source).toContain("api.onStatus");
    expect(source).toContain("api.onLog");
    expect(source).toContain("api.onData");
  });

  it("uses the shared monitor limit constants", () => {
    expect(source).toContain("MAX_MONITOR_LOG_ENTRIES");
    expect(source).toContain("MAX_MONITOR_DATA_ENTRIES");
    expect(source).toContain("pushMonitorEntry");
  });
});

describe("useStreamStatus hook", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/hooks/useStreamStatus.ts"), "utf-8");

  it("only subscribes to status updates", () => {
    expect(source).toContain("api.onStatus");
    expect(source).not.toContain("api.onLog");
    expect(source).not.toContain("api.onData");
  });
});
