const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { createRequire } = require("node:module");
const { app } = require("electron");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist", "smoke");
const profile = path.join(output, "profile");
fs.mkdirSync(profile, { recursive: true });
app.setPath("userData", profile);
app.setPath("sessionData", profile);
app.disableHardwareAcceleration();
app.getVersion = () => JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const results = { rendererErrors: [] };
let finished = false;
function finish(error) {
  if (finished) return;
  finished = true;
  if (error) results.error = error.stack || String(error);
  results.passed = !error;
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(results, null, 2));
  app.exit(error ? 1 : 0);
}
process.on("uncaughtException", finish);
process.on("unhandledRejection", finish);
setTimeout(() => finish(new Error("Smoke check timed out")), 25000).unref();

async function verifyUpdaterDownload() {
  const taskRequire = createRequire(path.join(root, "package.json"));
  const { NsisUpdater } = taskRequire("electron-updater");
  const { ElectronHttpExecutor } = taskRequire("electron-updater/out/electronHttpExecutor");
  const payload = Buffer.from(`Nav-Bridge updater download smoke test ${crypto.randomUUID()}\n`);
  const sha = crypto.createHash("sha512").update(payload).digest("base64");
  let badChecksum = false;
  const server = http.createServer((request, response) => {
    if (request.url.split("?")[0] === "/latest.yml") {
      const checksum = badChecksum ? Buffer.alloc(64).toString("base64") : sha;
      response.writeHead(200, { "Content-Type": "text/yaml" });
      response.end(
        `version: 0.1.1\nfiles:\n  - url: Nav-Bridge-Smoke-Setup.exe\n    sha512: ${checksum}\n    size: ${payload.length}\npath: Nav-Bridge-Smoke-Setup.exe\nsha512: ${checksum}\nreleaseDate: '2026-11-05T00:00:00.000Z'\n`
      );
    } else {
      response.writeHead(200, {
        "Content-Length": payload.length,
        "Content-Type": "application/octet-stream"
      });
      response.end(payload);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const feedUrl = `http://127.0.0.1:${server.address().port}`;
  function makeUpdater(name) {
    const config = path.join(output, `${name}.yml`);
    fs.writeFileSync(config, `provider: generic\nurl: ${feedUrl}\nupdaterCacheDirName: ${name}\n`);
    const updater = new NsisUpdater(
      { provider: "generic", url: feedUrl },
      {
        version: "0.1.0",
        name,
        isPackaged: true,
        appUpdateConfigPath: config,
        userDataPath: profile,
        baseCachePath: path.join(output, "update-cache"),
        whenReady: () => app.whenReady(),
        quit: () => {
          throw new Error("Smoke check must never install an update");
        },
        relaunch: () => {
          throw new Error("Smoke check must never relaunch");
        },
        onQuit: () => {}
      }
    );
    updater.autoDownload = false;
    // A custom AppAdapter skips executor creation; use Electron's real HTTP transport in this test.
    updater.httpExecutor = new ElectronHttpExecutor();
    updater.setFeedURL({ provider: "generic", url: feedUrl });
    updater.autoInstallOnAppQuit = false;
    updater.disableDifferentialDownload = true;
    updater.disableWebInstaller = true;
    updater.on("error", () => {});
    return updater;
  }
  try {
    const updater = makeUpdater("nav-bridge-smoke-valid");
    const check = await updater.checkForUpdates();
    if (!check.isUpdateAvailable || check.updateInfo.version !== "0.1.1")
      throw new Error("Update discovery failed");
    const files = await updater.downloadUpdate();
    if (!fs.readFileSync(files[0]).equals(payload)) throw new Error("Downloaded bytes differ");
    results.realUpdaterDownload = true;
    badChecksum = true;
    const invalid = makeUpdater("nav-bridge-smoke-invalid");
    await invalid.checkForUpdates();
    let rejected = false;
    try {
      await invalid.downloadUpdate();
    } catch (error) {
      rejected = /sha512|checksum/i.test(error.message);
    }
    if (!rejected) throw new Error("Corrupt update was not rejected");
    results.corruptUpdateRejected = true;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

app.on("browser-window-created", (_event, window) => {
  window.show = () => {};
  window.webContents.setBackgroundThrottling(false);
  window.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) results.rendererErrors.push(message);
  });
  window.webContents.once("did-finish-load", async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      results.startupState = await window.webContents.executeJavaScript("window.navBridge.getUpdateState()");
      if (results.startupState.phase !== "unsupported") throw new Error("Unexpected dev update state");
      await window.webContents.executeJavaScript(
        "document.querySelector('[aria-label=\"检查更新\"]').click()"
      );
      await new Promise((resolve) => setTimeout(resolve, 400));
      results.updateDialog = await window.webContents.executeJavaScript(
        "document.body.innerText.includes('开发模式不执行自动更新')"
      );
      if (!results.updateDialog) throw new Error("Version click did not open the update dialog");
      results.titleVersion = await window.webContents.executeJavaScript(
        "document.querySelector('[aria-label=\"检查更新\"]').innerText"
      );
      if (results.titleVersion !== `V${app.getVersion()}`)
        throw new Error("Title version differs from package version");
      fs.writeFileSync(
        path.join(output, "update-dialog.png"),
        (await window.webContents.capturePage()).toPNG()
      );
      if (results.rendererErrors.length) throw new Error(results.rendererErrors.join("\n"));
      await verifyUpdaterDownload();
      finish();
    } catch (error) {
      finish(error);
    }
  });
});

app.whenReady().then(async () => {
  try {
    await import(pathToFileURL(path.join(root, "out/main/index.js")).href);
  } catch (error) {
    finish(error);
  }
});
