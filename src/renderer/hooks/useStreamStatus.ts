import { useEffect, useState } from "react";
import type { StreamStatus } from "../../shared/stream";
import { useNavBridgeAPI } from "./useNavBridgeAPI";

export function useStreamStatus() {
  const api = useNavBridgeAPI();
  const [status, setStatus] = useState<StreamStatus>();

  useEffect(() => {
    const removeStatus = api.onStatus(setStatus);
    return () => {
      removeStatus();
    };
  }, [api]);

  return { status };
}
