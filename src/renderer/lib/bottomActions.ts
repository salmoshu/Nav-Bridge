export type BottomActionId = "startStop" | "options" | "exit";

export interface BottomAction {
  id: BottomActionId;
  label: string;
  disabled: boolean;
  variant: "contained" | "outlined";
}

export const bottomActionIds: readonly BottomActionId[] = ["startStop", "options", "exit"];

export function getBottomActionLabel(id: BottomActionId, running: boolean): string {
  switch (id) {
    case "startStop":
      return running ? "Stop" : "Start";
    case "options":
      return "Options";
    case "exit":
      return "Exit";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function getBottomActions(running: boolean): BottomAction[] {
  return bottomActionIds.map((id) => ({
    id,
    label: getBottomActionLabel(id, running),
    disabled: false,
    variant: id === "startStop" ? "contained" : "outlined"
  }));
}
