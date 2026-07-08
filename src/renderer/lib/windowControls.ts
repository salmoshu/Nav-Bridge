import { ipcChannels } from "../../shared/ipc";

export type WindowControlId = "minimize" | "toggleAlwaysOnTop" | "close";

export interface WindowControlButton {
  id: WindowControlId;
  label: string;
  channel: string;
}

export const windowControlButtons: readonly WindowControlButton[] = [
  { id: "minimize", label: "Minimize", channel: ipcChannels.minimizeWindow },
  { id: "toggleAlwaysOnTop", label: "Always on top", channel: ipcChannels.toggleAlwaysOnTop },
  { id: "close", label: "Close", channel: ipcChannels.closeWindow }
];

export function getWindowControlButton(id: WindowControlId): WindowControlButton | undefined {
  return windowControlButtons.find((button) => button.id === id);
}
