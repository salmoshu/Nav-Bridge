import { EventEmitter } from "node:events";
import type { UpdateCheckResult, UpdateInfo } from "electron-updater";

export class TestUpdateBackend extends EventEmitter {
  autoDownload = false;
  autoInstallOnAppQuit = true;
  allowPrerelease = true;
  allowDowngrade = true;
  checkForUpdates = jest.fn(async (): Promise<UpdateCheckResult | null> => null);
  quitAndInstall = jest.fn();
}

export function updateResult(downloadPromise: Promise<string[]> | null = null): UpdateCheckResult {
  const info: UpdateInfo = {
    version: "0.1.1",
    files: [],
    path: "Setup.exe",
    sha512: "test-sha512",
    releaseDate: "2026-11-05T00:00:00.000Z"
  };
  return { isUpdateAvailable: true, updateInfo: info, versionInfo: info, downloadPromise };
}
