# 1. Electron 无边框窗口拖动时异常拉伸

## 现象

Nav-Bridge 使用 `frame: false` 实现自定义标题栏后，在 Windows 环境中出现过以下问题：

- 鼠标左键按住标题栏空白区域但不移动时，窗口可能向下变长。
- 修复静止按住问题后，继续拖动标题栏移动窗口时，窗口仍可能向下或向右下方向拉伸。
- 问题在 Windows 显示缩放为 125% 的环境下更明显，Electron 进程命令行中也观察到过 `EnableTransparentHwndEnlargement`。

## 原因

根因不是普通 CSS 布局问题，也不是单纯的 `BrowserWindow` 宽高配置问题，而是自定义 JS 拖动逻辑与 Windows/Electron 无边框窗口的原生 hit-test 机制发生竞争。

之前的实现通过渲染进程监听标题栏鼠标事件，再调用主进程 IPC，主进程使用 `screen.getCursorScreenPoint()`、`BrowserWindow.getBounds()` 和 `BrowserWindow.setPosition()` 在 `setInterval` 中手动移动窗口。

这种方案在 Windows 无边框窗口下不稳定：

- `setPosition()` 会反复触发系统重新计算窗口边界和非客户区。
- 无边框窗口的透明边界、DWM 处理和 Electron 的 hit-test 可能把拖动误判为 resize。
- 高 DPI 缩放会放大坐标取整和边界计算误差。
- 即使设置了 `resizable: false`、固定 `width/minWidth/maxWidth`，也不能完全避免该竞争。

因此，继续修补 JS 拖动逻辑，例如切换 `setResizable(false/true)`、增加拖动阈值、固定窗口宽度、改用自定义上下 resize handle，都只能缓解部分现象，不能从根上解决标题栏拖动时的异常拉伸。

## 解决方法

标题栏拖动应交给 Electron 原生机制处理，不再用 JS 轮询移动窗口。

最终方案：

- 在标题栏根元素上设置 `WebkitAppRegion: "drag"`。
- 在按钮、下拉框等可交互控件区域设置 `WebkitAppRegion: "no-drag"`。
- 删除 `startWindowDrag` / `stopWindowDrag` IPC。
- 删除主进程中的 `setInterval + BrowserWindow.setPosition()` 拖动逻辑。
- 保留自定义顶部/底部 resize handle，仅用于上下调整高度。
- 窗口继续保持 `frame: false` 和 `resizable: false`，避免 Windows 原生无边框 resize 介入。

核心原则：

```tsx
// 标题栏可拖动区域
sx={{
  WebkitAppRegion: "drag"
}}

// 按钮、选择框等交互区域
sx={{
  WebkitAppRegion: "no-drag"
}}
```

## 测试与防回退

需要用测试防止后续代码重新引入 JS 拖动：

- `AppTitleBar` 必须包含 `WebkitAppRegion: "drag"`。
- 控件区域必须包含 `WebkitAppRegion: "no-drag"`。
- `ipcChannels` 不应再暴露 `startWindowDrag` / `stopWindowDrag`。
- 主进程窗口拖动逻辑中不应再出现 `setPosition(`。
- 自定义上下 resize 的测试只允许修改高度，不允许修改宽度。

## 经验结论

Electron 在 Windows 上实现无边框自定义标题栏时，标题栏移动优先使用 `-webkit-app-region: drag`。除非确实需要完全自定义窗口管理，否则不要用 JS 循环调用 `BrowserWindow.setPosition()` 模拟拖动。

如果必须实现自定义 resize，应把 resize 区域和 drag 区域明确分离，避免同一块 UI 同时承担拖动和拉伸职责。

# 2. 主窗口与 Monitor 窗口开启时黑白闪烁

## 现象

打开 Nav-Bridge 主窗口或 Stream Monitor 窗口时，无论当前主题是深色还是浅色，都会先看到黑色轮廓，然后闪过白色底色，最后才显示为最终主题色。Monitor 窗口还会始终渲染成浅色，无法跟随主窗口的主题设置。

## 原因

1. **主题不同步**：主窗口原先把主题模式保存在 `localStorage`。但 Electron 中 `index.html` 与 `monitor.html` 属于不同的 `file://` 源，`localStorage` 不共享，导致 Monitor 读不到主窗口的主题，只能回退到系统主题。
2. **白色底色闪烁**：`BrowserWindow` 默认背景色是白色，在 React/MUI 渲染之前，客户区会先显示一块白光。
3. **黑色轮廓**：Windows 下 `frame: false` 无边框窗口创建瞬间，DWM 会先绘制窗口阴影/边框，随后才显示内容。

## 解决方法

- 将主题模式存放到主进程的 `electron-store`（`ConfigStore`），让所有窗口共享同一份配置。
- 主进程在创建窗口前解析主题（`system` 时使用 `nativeTheme.shouldUseDarkColors`），并给 `BrowserWindow` 设置与主题一致的 `backgroundColor`。
- 两个窗口都使用 `show: false`，在 `ready-to-show` 时再 `show()`，避免在内容渲染前暴露默认底色和阴影。
- 通过 URL query 把主题模式同步传给 renderer，保证 React 首帧就能拿到正确主题。
- 新增 `loadThemeMode` / `saveThemeMode` / `themeModeChanged` IPC，主窗口切换主题时实时广播给 Monitor。

## 测试与防回退

- `src/shared/theme.ts` 覆盖 `resolveThemeMode` 与背景色常量。
- `src/test/main/index.test.ts` 验证主窗口设置 `backgroundColor`、`show: false`、`ready-to-show` 和 theme query。
- `src/test/main/monitorWindow.test.ts` 验证 Monitor 窗口接受主题参数、设置背景色、延迟显示和传递 query。
- `src/test/preload/themeIpc.test.ts` 验证 preload 暴露主题 IPC。
- `src/test/main/bridge.validation.test.ts` 验证 `loadThemeMode` / `saveThemeMode` handler 注册与调用。

## 经验结论

Electron 无边框窗口要避免打开时的颜色闪烁，必须在**创建窗口前**就把 `backgroundColor` 设置为当前主题色，并延迟到第一帧渲染完成再显示。同时，多窗口间的主题状态不要依赖 `localStorage`，应通过主进程共享存储或 IPC 同步。

关联问题：#06
