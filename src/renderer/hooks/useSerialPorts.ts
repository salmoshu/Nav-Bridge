import { useCallback, useEffect, useState } from "react";
import type { SerialPortInfo } from "../../shared/ipc";
import { useNavBridgeAPI } from "./useNavBridgeAPI";

export function useSerialPorts() {
  const api = useNavBridgeAPI();
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.listSerialPorts();
      setPorts(result);
    } catch (listError: unknown) {
      const message = listError instanceof Error ? listError.message : String(listError);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ports, loading, error, refresh };
}
