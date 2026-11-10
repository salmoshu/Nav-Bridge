# 应用更新与发布

## 使用更新

Windows Setup 安装版在每次启动时检查 GitHub Releases 中的最新稳定版。点击标题栏版本号也能检查更新。

发现新版后，弹窗显示 `V当前版本 -> V最新版本`，更新包在后台自动下载。下载完成后，标题栏右侧显示「更新」按钮。点击后确认「重启并更新」，应用停止数据转发，安装新版并重新启动。选择「稍后」会保留已下载的更新。

关闭普通窗口不会自动安装更新。下载失败时，可点击版本号重新检查。再次启动时会重新检查，并由更新库校验、复用已下载的缓存。

开发模式和 Windows 便携版不执行自动安装；测试完整流程请使用 Setup 安装版。macOS 更新需要签名的应用，Linux 发行包需使用对应平台支持的更新方式。

## 发布新版

更新源为本仓库的 [GitHub Releases](https://github.com/salmoshu/Nav-Bridge/releases)，配置在 `electron-builder.yml` 的 `publish` 中。客户端使用发布元数据下载更新，由 `electron-updater` 校验文件摘要。

当前客户端按公开仓库方式读取更新源，不使用浏览器的 GitHub 登录状态或本机 Git/SSH 凭据。发布前必须确认：退出 GitHub 登录后，仍能访问更新仓库和 Release 附件。`package.json` 中的 `private: true` 仅限制 npm 发布，与 GitHub 仓库的可见性无关。

如果源码仓库需要保持私有，建议使用独立的公开发布仓库存放 Release 和更新文件。此时需修改 `publish.owner` / `publish.repo`，重新构建客户端，并将发布流程的目标仓库和凭据一同配置为该发布仓库；当前工作流的 `GITHUB_TOKEN` 仅用于当前仓库。也可以使用客户端可访问的 HTTPS 更新服务。不要把维护者的 GitHub token 打包进应用。

1. 修改 `package.json` 的版本号，例如改为 `0.1.1`。公开稳定版本使用 `x.y.z`，不要附加日期预发布后缀。
2. 运行 `pnpm test`、`pnpm typecheck`、`pnpm smoke` 和 `pnpm build`。
3. 提交代码后，推送与版本号一致的标签，例如 `v0.1.1`。
4. `.github/workflows/release.yml` 会在 Windows 上重新测试、构建并发布 Setup 安装包、便携版以及更新元数据。
5. 确保 Release 已公开发布，并包含 `latest.yml`、该文件引用的 Setup `.exe` 和对应 `.blockmap`。只上传一个 `.exe` 无法提供自动更新。

日常 `pnpm build` 使用 `--publish never`，仅在本地产生构建产物。提交标签和发布 Release 是独立操作。

若标签已经推送但构建没有触发，可在 GitHub 的 Actions → Release Windows → Run workflow 中选择 `main`，在 `tag` 中填写已有标签（例如 `v0.1.1`）。工作流会检出该标签，核对其版本号后重新测试、构建和发布，无需移动标签。

`pnpm smoke` 会启动隐藏的 Electron 窗口，验证真实渲染、版本更新窗口、本地更新源下载以及损坏文件的 SHA-512 校验。测试数据只写入 `dist/smoke`，不会安装更新或修改日常使用的应用配置。

也可以手动构建并上传：

```powershell
pnpm build
# 将 dist 中的 latest.yml、Setup 安装包和 .blockmap 一起上传到对应 GitHub Release。
```

## 更新检查报错

- `releases.atom` 返回 404：客户端无法读取 Releases 列表。检查仓库地址是否正确，以及未登录时能否访问；私有仓库未授权访问也会返回 404。更新库附带的 token 提示是通用文案，不能单凭它认定 token 错误。
- 提示未找到正式版本：确认至少有一个已发布、非草稿、非预发布的 Release。
- 提示缺少版本信息文件：检查该 Release 的 `latest.yml`，以及其中引用的 Setup 安装包是否已上传。
- 提示更新包校验失败：重新检查更新；发布者应核对 `latest.yml` 中的大小和 SHA-512 与安装包是否一致。

检查失败不会被当作「当前已是最新版本」，也不会安装更新。界面显示简明原因并允许重新检查，不展示服务器返回的原始响应头或 Cookie。

## 首次启用

旧版 `0.1.0-20260709` 没有自动更新代码，需要先手动安装包含本次功能的版本。以后发布更高版本时，已安装客户端即可通过上述流程更新。
