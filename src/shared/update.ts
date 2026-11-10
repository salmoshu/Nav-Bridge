export type AppUpdatePhase =
  | "idle"
  | "checking"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "error"
  | "unsupported";

export interface AppUpdateState {
  phase: AppUpdatePhase;
  currentVersion: string;
  availableVersion?: string;
  progress?: number;
  error?: string;
}
