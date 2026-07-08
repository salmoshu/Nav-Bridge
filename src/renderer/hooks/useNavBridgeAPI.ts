import type { NavBridgeAPI } from "../../shared/ipc";

export function useNavBridgeAPI(): NavBridgeAPI {
  const api = window.navBridge;
  if (api == undefined) {
    throw new Error(
      "Nav-Bridge preload API is not available. Please check that the preload script loaded correctly."
    );
  }
  return api;
}
