import { defaultStreamConfig } from "../../shared/stream";
import {
  sanitizeStreamOption,
  updateStreamOptions,
  type StreamOptionKey
} from "../../renderer/lib/streamOptions";

describe("streamOptions", () => {
  describe("sanitizeStreamOption", () => {
    it("parses numeric strings to integers", () => {
      expect(sanitizeStreamOption("bufferSize", "4096")).toBe(4096);
      expect(sanitizeStreamOption("statusInterval", "1000")).toBe(1000);
    });

    it("truncates fractional values to integers", () => {
      expect(sanitizeStreamOption("bufferSize", "4096.9")).toBe(4096);
      expect(sanitizeStreamOption("statusInterval", 1000.8)).toBe(1000);
    });

    it("rejects non-numeric values and returns the default", () => {
      expect(sanitizeStreamOption("bufferSize", "not-a-number")).toBe(defaultStreamConfig.options.bufferSize);
      expect(sanitizeStreamOption("reconnectInterval", undefined)).toBe(
        defaultStreamConfig.options.reconnectInterval
      );
    });

    it("clamps values to the configured minimum", () => {
      expect(sanitizeStreamOption("bufferSize", 0)).toBe(256);
      expect(sanitizeStreamOption("statusInterval", -1)).toBe(100);
      expect(sanitizeStreamOption("reconnectInterval", -10)).toBe(0);
    });

    it("clamps values to the configured maximum", () => {
      expect(sanitizeStreamOption("bufferSize", 10_000_000)).toBe(1_048_576);
      expect(sanitizeStreamOption("inactiveTimeout", 10_000_000)).toBe(300_000);
    });
  });

  describe("updateStreamOptions", () => {
    it("updates only the supplied keys", () => {
      const updated = updateStreamOptions(defaultStreamConfig.options, { bufferSize: 8192 });
      expect(updated.bufferSize).toBe(8192);
      expect(updated.statusInterval).toBe(defaultStreamConfig.options.statusInterval);
    });

    it("sanitizes invalid values back to defaults", () => {
      const updated = updateStreamOptions(defaultStreamConfig.options, {
        bufferSize: "bad",
        statusInterval: -5
      } as unknown as Partial<typeof defaultStreamConfig.options>);
      expect(updated.bufferSize).toBe(defaultStreamConfig.options.bufferSize);
      expect(updated.statusInterval).toBe(100);
    });

    it("does not mutate the original options", () => {
      const original = { ...defaultStreamConfig.options };
      const updated = updateStreamOptions(original, { bufferSize: 2048 });
      expect(original.bufferSize).toBe(defaultStreamConfig.options.bufferSize);
      expect(updated.bufferSize).toBe(2048);
    });
  });

  describe("StreamOptionKey coverage", () => {
    const keys: StreamOptionKey[] = ["bufferSize", "reconnectInterval", "inactiveTimeout", "statusInterval"];

    it("has limits and defaults for every option key", () => {
      for (const key of keys) {
        expect(typeof sanitizeStreamOption(key, 1)).toBe("number");
      }
    });
  });
});
