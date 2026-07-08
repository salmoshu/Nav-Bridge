import { useEffect, useState } from "react";
import type { LogEntry, StreamDataEntry, StreamStatus } from "../../shared/stream";
import { useNavBridgeAPI } from "./useNavBridgeAPI";

export function useStreamStatus() {
  const api = useNavBridgeAPI();
  const [status, setStatus] = useState<StreamStatus>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dataEntries, setDataEntries] = useState<StreamDataEntry[]>([]);

  useEffect(() => {
    const removeStatus = api.onStatus(setStatus);
    const removeLog = api.onLog((log) => setLogs((current) => [log, ...current].slice(0, 200)));
    const removeData = api.onData((entry) => setDataEntries((current) => [entry, ...current].slice(0, 200)));
    return () => {
      removeStatus();
      removeLog();
      removeData();
    };
  }, [api]);

  return { status, logs, dataEntries };
}
