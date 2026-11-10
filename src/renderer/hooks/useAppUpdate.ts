import { useCallback, useEffect, useRef, useState } from "react";
import type { AppUpdateState } from "../../shared/update";
import { getUpdateErrorMessage } from "../../shared/updateError";
import { useNavBridgeAPI } from "./useNavBridgeAPI";

export function useAppUpdate() {
  const api = useNavBridgeAPI();
  const [state, setState] = useState<AppUpdateState>({ phase: "idle", currentVersion: __APP_VERSION__ });
  const revision = useRef(0);
  const handleError = useCallback((error: unknown): void => {
    setState((current) => ({ ...current, phase: "error", error: getUpdateErrorMessage(error) }));
  }, []);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const unsubscribe = api.onUpdateStateChange((next) => {
      revision.current++;
      receivedEvent = true;
      if (active) setState(next);
    });
    void api
      .getUpdateState()
      .then((next) => {
        if (active && !receivedEvent) setState(next);
      })
      .catch((error: unknown) => {
        if (active) handleError(error);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [api, handleError]);

  const checkForUpdates = useCallback(async (): Promise<void> => {
    const currentRevision = revision.current;
    try {
      const next = await api.checkForUpdates();
      if (revision.current === currentRevision) setState(next);
    } catch (error) {
      handleError(error);
    }
  }, [api, handleError]);
  const installUpdate = useCallback(async (): Promise<void> => {
    const currentRevision = revision.current;
    try {
      const next = await api.installUpdate();
      if (revision.current === currentRevision) setState(next);
    } catch (error) {
      handleError(error);
    }
  }, [api, handleError]);
  return { state, checkForUpdates, installUpdate };
}
