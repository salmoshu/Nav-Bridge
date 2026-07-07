import { useEffect, useState } from "react";
import type { LogEntry, StreamStatus } from "../../shared/stream";
import { useNavBridgeAPI } from "./useNavBridgeAPI";

export function useStreamStatus() {
  const api = useNavBridgeAPI();
  const [status, setStatus] = useState<StreamStatus>();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const removeStatus = api.onStatus(setStatus);
    const removeLog = api.onLog((log) => setLogs((current) => [log, ...current].slice(0, 200)));
    return () => {
      removeStatus();
      removeLog();
    };
  }, [api]);

  return { status, logs };
}
