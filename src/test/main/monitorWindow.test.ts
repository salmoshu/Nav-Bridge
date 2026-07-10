import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("MonitorWindow log buffering", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/monitor/MonitorWindow.ts"), "utf-8");

  it("keeps a bounded log buffer for replay", () => {
    expect(source).toContain("monitorLogBuffer");
    expect(source).toContain("MAX_MONITOR_LOG_ENTRIES");
    expect(source).toContain("pushMonitorEntry");
  });

  it("flushes buffered logs after the window finishes loading", () => {
    expect(source).toContain('"did-finish-load"');
    expect(source).toContain("flushMonitorLogs");
    expect(source).toContain("monitorReady = true");
  });

  it("only sends logs when the monitor window is ready", () => {
    expect(source).toMatch(/if\s*\(\s*monitorReady\s*&&/);
  });
});

describe("MonitorWindow data buffering", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/monitor/MonitorWindow.ts"), "utf-8");

  it("keeps a bounded data buffer for replay", () => {
    expect(source).toContain("monitorDataBuffer");
    expect(source).toContain("MAX_MONITOR_DATA_ENTRIES");
    expect(source).toContain("pushMonitorEntry");
  });

  it("flushes buffered data after the window finishes loading", () => {
    expect(source).toContain('"did-finish-load"');
    expect(source).toContain("flushMonitorData");
    expect(source).toContain("monitorReady = true");
  });

  it("only sends data when the monitor window is ready", () => {
    expect(source).toMatch(/if\s*\(\s*monitorReady\s*&&/);
  });
});

describe("main process lifecycle logs", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/index.ts"), "utf-8");

  it("logs application start and stop to the monitor", () => {
    expect(source).toContain('logToMonitor("info", "Application started")');
    expect(source).toContain('logToMonitor("info", "Application stopped")');
  });

  it("logs uncaught exceptions and unhandled rejections", () => {
    expect(source).toContain('"uncaughtException"');
    expect(source).toContain('"unhandledRejection"');
    expect(source).toContain('logToMonitor("error"');
  });
});

describe("MonitorWindow z-order", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/monitor/MonitorWindow.ts"), "utf-8");

  it("creates the monitor as an independent top-level window", () => {
    expect(source).not.toContain("parent,");
    expect(source).not.toMatch(/createMonitorWindow\(\s*parent\s*:/);
  });

  it("focuses an existing monitor window when reopened", () => {
    expect(source).toContain("monitorWindow.focus()");
  });

  it("exposes a way to sync always-on-top with the main window", () => {
    expect(source).toContain("setMonitorAlwaysOnTop");
    expect(source).toContain("monitorWindow.setAlwaysOnTop(alwaysOnTop)");
  });
});

describe("MonitorWindow clear cache", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/monitor/MonitorWindow.ts"), "utf-8");

  it("exposes a clearMonitorCache function", () => {
    expect(source).toContain("export function clearMonitorCache");
  });

  it("clears both log and data buffers", () => {
    expect(source).toContain("monitorLogBuffer.length = 0");
    expect(source).toContain("monitorDataBuffer.length = 0");
  });
});

describe("window z-order handling", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/index.ts"), "utf-8");

  it("moves a focused window to the top of the z-order", () => {
    expect(source).toContain('"browser-window-focus"');
    expect(source).toContain("window.moveTop()");
  });
});
