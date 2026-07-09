export const MAX_MONITOR_LOG_ENTRIES = 2048;
export const MAX_MONITOR_DATA_ENTRIES = 2048;

export function pushMonitorEntry<T>(current: T[], entry: T, maxCount: number): T[] {
  const next = [...current, entry];
  if (next.length > maxCount) {
    return next.slice(next.length - maxCount);
  }
  return next;
}
