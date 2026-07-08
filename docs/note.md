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
