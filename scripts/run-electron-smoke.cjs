const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist", "smoke");
fs.mkdirSync(output, { recursive: true });
const resultPath = path.join(output, "result.json");
fs.rmSync(resultPath, { force: true });
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(require("electron"), [path.join(__dirname, "smoke-electron.cjs")], {
  cwd: root,
  env: environment,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"]
});
const stdout = fs.createWriteStream(path.join(output, "stdout.log"));
const stderr = fs.createWriteStream(path.join(output, "stderr.log"));
child.stdout.pipe(stdout);
child.stderr.pipe(stderr);
const timer = setTimeout(() => child.kill(), 35000);
child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("close", (code) => {
  clearTimeout(timer);
  const result = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, "utf8")) : undefined;
  if (code !== 0 || !result?.passed) {
    console.error("Electron smoke check failed:", result?.error ?? `Process exited with ${code}`);
    console.error(`Logs: ${output}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Electron smoke check passed: ${result.titleVersion}; renderer, update dialog, download and checksum validation.`
  );
});
