import { useEffect, useRef, useState } from "react";
import type { StreamStatus } from "../../shared/stream";

const UPDATE_INTERVAL_MS = 100;

export function useSmoothUptime(status: StreamStatus | undefined): number | undefined {
  const input = status?.input;
  const baseUptime = input?.status === "connected" ? input.uptime : undefined;

  const baseUptimeRef = useRef(baseUptime ?? 0);
  const baseTimeRef = useRef(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    baseUptimeRef.current = baseUptime ?? 0;
    baseTimeRef.current = Date.now();
  }, [baseUptime]);

  useEffect(() => {
    if (baseUptime == undefined) {
      return;
    }

    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
    }, UPDATE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [baseUptime]);

  if (baseUptime == undefined) {
    return undefined;
  }

  // Reference `tick` so React re-renders on each interval, even though the
  // computed value is derived from `Date.now()`.
  void tick;

  return baseUptimeRef.current + (Date.now() - baseTimeRef.current) / 1000;
}
