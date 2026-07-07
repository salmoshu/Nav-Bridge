# Nav-Bridge 初版软件实现计划

> **面向 AI 代理的工作者：** 步骤使用复选框语法来跟踪进度。

**目标：** 按 `doc/design.md` 落地 v0.0.1 初版，提供独立 Electron 桌面应用、1 入 N 出字节转发核心、TCP/UDP/Serial 适配器、状态统计、配置持久化和基础 UI。

**架构：** Electron 主进程负责 StreamServer、适配器、配置和 IPC；预加载脚本通过 `contextBridge` 暴露 API；React + MUI 渲染进程负责配置、状态和日志展示。核心转发逻辑与网络适配器可脱离 Electron 单独测试。

**技术栈：** TypeScript、Electron、React 18、MUI 7、Vite/electron-vite、Jest、Node `net`/`dgram`、`serialport`。

---

## 文件结构

- 创建 `package.json`、`tsconfig*.json`、`jest.config.cjs`、`electron.vite.config.ts`、`index.html`
- 创建 `src/shared/*` 共享模型
- 创建 `src/main/stream/*` 核心转发、统计和适配器
- 创建 `src/main/ipc/bridge.ts`、`src/main/config/ConfigStore.ts`、`src/main/index.ts`
- 创建 `src/preload/index.ts`
- 创建 `src/renderer/*` 基础 UI
- 创建 `src/test/stream/*.test.ts` 覆盖核心、TCP、UDP、统计

## 任务

- [x] 写入工程骨架和失败测试。
- [x] 运行测试确认当前失败来自缺少实现。
- [x] 实现 StreamServer 与 StreamStatistics。
- [x] 实现 TCP/UDP/Serial 适配器。
- [x] 实现 Electron IPC、配置存储、预加载 API 和基础 UI。
- [x] 运行测试、类型检查和构建验证。
