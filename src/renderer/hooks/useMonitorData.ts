import { useCallback, useEffect, useState } from "react";
import type { LogEntry, StreamDataEntry, StreamStatus } from "../../shared/stream";
import { MAX_MONITOR_DATA_ENTRIES, MAX_MONITOR_LOG_ENTRIES, pushMonitorEntry } from "../lib/monitorLimits";
import { useNavBridgeAPI } from "./useNavBridgeAPI";

export function useMonitorData() {
  const api = useNavBridgeAPI();
  const [status, setStatus] = useState<StreamStatus>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dataEntries, setDataEntries] = useState<StreamDataEntry[]>([]);

  const clear = useCallback(async (): Promise<void> => {
    setLogs([]);
    setDataEntries([]);
    await api.clearMonitorCache();
  }, [api]);

  useEffect(() => {
    const removeStatus = api.onStatus(setStatus);
    const removeLog = api.onLog((log) =>
      setLogs((current) => pushMonitorEntry(current, log, MAX_MONITOR_LOG_ENTRIES))
    );
    const removeData = api.onData((entry) =>
      setDataEntries((current) => pushMonitorEntry(current, entry, MAX_MONITOR_DATA_ENTRIES))
    );
    return () => {
      removeStatus();
      removeLog();
      removeData();
    };
  }, [api]);

  return { status, logs, dataEntries, clear };
}
