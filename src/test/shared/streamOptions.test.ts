import { defaultStreamConfig } from "../../shared/stream";
import {
  streamOptionLimits,
  sanitizeStreamOption,
  updateStreamOptions,
  type StreamOptionKey
} from "../../shared/streamOptions";

describe("shared stream option limits", () => {
  it("defines reusable bounds and defaults for every stream option", () => {
    const keys: StreamOptionKey[] = ["bufferSize", "reconnectInterval", "inactiveTimeout", "statusInterval"];

    for (const key of keys) {
      expect(streamOptionLimits[key].default).toBe(defaultStreamConfig.options[key]);
    }
  });

  it("sanitizes values with the same bounds used by main-process validation", () => {
    expect(sanitizeStreamOption("bufferSize", 0)).toBe(256);
    expect(sanitizeStreamOption("statusInterval", 99)).toBe(100);
    expect(sanitizeStreamOption("reconnectInterval", -1)).toBe(0);
    expect(sanitizeStreamOption("inactiveTimeout", 1_000_000)).toBe(300_000);
  });

  it("updates only supplied stream option keys", () => {
    const updated = updateStreamOptions(defaultStreamConfig.options, { bufferSize: 8192 });

    expect(updated.bufferSize).toBe(8192);
    expect(updated.statusInterval).toBe(defaultStreamConfig.options.statusInterval);
  });
});
