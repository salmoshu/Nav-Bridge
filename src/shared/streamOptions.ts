import { defaultStreamConfig, type StreamOptions } from "./stream";

export type StreamOptionKey = keyof StreamOptions;

export interface StreamOptionLimits {
  min: number;
  max: number;
  default: number;
}

export const streamOptionLimits: Record<StreamOptionKey, StreamOptionLimits> = {
  bufferSize: { min: 256, max: 1024 * 1024, default: defaultStreamConfig.options.bufferSize },
  reconnectInterval: { min: 0, max: 300_000, default: defaultStreamConfig.options.reconnectInterval },
  inactiveTimeout: { min: 0, max: 300_000, default: defaultStreamConfig.options.inactiveTimeout },
  statusInterval: { min: 100, max: 60_000, default: defaultStreamConfig.options.statusInterval }
};

export function sanitizeStreamOption(key: StreamOptionKey, value: unknown): number {
  const limits = streamOptionLimits[key];
  const number = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(number)) {
    return limits.default;
  }
  return Math.max(limits.min, Math.min(limits.max, Math.trunc(number)));
}

export function updateStreamOptions(current: StreamOptions, partial: Partial<StreamOptions>): StreamOptions {
  const entries = Object.entries(partial) as [StreamOptionKey, unknown][];
  const updated = { ...current };
  for (const [key, value] of entries) {
    if (key in streamOptionLimits) {
      updated[key] = sanitizeStreamOption(key, value);
    }
  }
  return updated;
}
