# Nav-Bridge 实现架构

> 版本：0.0.1  
> 日期：2026-07-07  
> 范围：初版软件实现后的实际架构说明

## 1. 架构目标

Nav-Bridge 当前实现以「实时字节流转发」为核心目标。系统需要在 Electron 主进程中处理 TCP、UDP、Serial 和 File I/O，避免渲染进程阻塞；渲染进程只负责配置、状态展示和用户操作。

本阶段不解析 GNSS 数据内容，也不修改 Nav-Tools-Lichtblick。Nav-Bridge 只提供透明的原始字节输入和输出通道。

## 2. 总体结构

```text
┌────────────────────────────────────────────────────────────┐
│ Renderer: React + MUI                                      │
│ - ConnectionPanel：编辑输入 / 输出配置                      │
│ - StreamList / StatusCard：展示连接状态和统计               │
│ - LogView：展示主进程日志                                  │
└───────────────────────────────┬────────────────────────────┘
                                │ window.navBridge
┌───────────────────────────────▼────────────────────────────┐
│ Preload: contextBridge                                      │
│ - startServer / stopServer                                  │
│ - loadConfig / saveConfig                                   │
│ - onStatus / onLog                                          │
└───────────────────────────────┬────────────────────────────┘
                                │ ipcRenderer / ipcMain
┌───────────────────────────────▼────────────────────────────┐
│ Main: Electron Core                                         │
│ - IpcBridge：生命周期编排和 IPC 注册                        │
│ - ConfigStore：配置持久化                                   │
│ - validateStreamConfig：运行时配置校验                      │
│ - StreamServer：1 入 N 出转发核心                           │
│ - TcpAdapter / UdpAdapter / SerialAdapter / FileAdapter：传输适配器 │
└───────────────────────────────┬────────────────────────────┘
                                │
                         TCP / UDP / Serial / File
```

## 3. 核心数据流

运行期数据只在主进程内流动：

1. `StreamServer` 调用输入适配器的 `read(maxBytes)`。
2. 读取到 `Buffer` 后，并发调用所有输出适配器的 `write(data)`。
3. 转发成功后更新 `StreamStatistics`。
4. 状态变化通过 `IpcBridge` 推送到渲染进程。

渲染进程不会直接接触 TCP、UDP、Serial 或 File 句柄。

## 4. 主进程模块

### 4.1 `IpcBridge`

位置：`src/main/ipc/bridge.ts`

职责：

- 注册 `startServer`、`stopServer`、`loadConfig` 和 `saveConfig` IPC 处理器。
- 在启动前调用 `validateStreamConfig`。
- 创建 `StreamServer` 和适配器。
- 串行化 start / stop 生命周期，避免快速点击造成竞态。
- 在窗口关闭时通过 `dispose()` 停止后台服务。

### 4.2 `StreamServer`

位置：`src/main/stream/StreamServer.ts`

职责：

- 管理 1 个输入适配器和 N 个输出适配器。
- 启动时依次打开输入和输出。
- 任一适配器打开失败时，关闭已打开和半打开的适配器。
- 后台循环读取输入并写入所有输出。
- 停止时关闭所有适配器并推送最终状态。

错误策略：

- 输入读取失败会标记输入为 `error`，循环继续等待下一次读取。
- 单路输出写入失败只标记该输出为 `error`，不影响其他输出。
- 启动阶段失败会整体失败并回滚。

### 4.3 适配器层

统一接口：`src/main/stream/adapters/StreamAdapter.ts`

```typescript
interface StreamAdapter {
  readonly id: string;
  readonly type: StreamType;
  readonly mode: StreamMode;

  open(): Promise<void>;
  close(): Promise<void>;
  read(maxBytes: number): Promise<Buffer | undefined>;
  write(data: Buffer): Promise<void>;
  getStatus(): StreamAdapterStatus;
}
```

已实现适配器：

- `TcpAdapter`：基于 Node.js `net`，支持 TCP Server 和 TCP Client。
- `UdpAdapter`：基于 Node.js `dgram`，支持 UDP Server 输入和 UDP Client 输出。
- `SerialAdapter`：基于 `serialport`，支持串口读写。
- `FileAdapter`：基于 Node.js `fs/promises`，支持普通文件读写和 RTKLIB `.tag` 时间戳回放。

方向约束：

- UDP Server 仅允许作为输入。
- UDP Client 仅允许作为输出。
- TCP Server、TCP Client、Serial 和 File 可用于输入或输出。

File time tag 兼容策略：

- 数据文件路径为 `path`，时间戳文件路径为 `${path}.tag`。
- `.tag` 头部为 64 字节 `TIMETAG RTKLIB ...`，紧跟 4 字节时间秒和 8 字节小数秒。
- 后续记录为 `tick(uint32) + fpos(uint32/uint64)`，`fpos` 字节数由 `filePositionBytes` 控制。
- 输入回放行为按 RTKLIB `readfile()`：打开后先读取第一条 tag 记录释放第一段数据，之后按 tick 推进；tag 记录为空时退化为读完整文件。

### 4.4 `QueuedReads`

位置：`src/main/stream/adapters/queuedReads.ts`

职责：

- 将事件驱动的数据块转换为 `read(maxBytes)` 式接口。
- 支持短时间等待，避免转发循环空转。
- 在适配器关闭时唤醒等待中的读取。

### 4.5 `StreamStatistics`

位置：`src/main/stream/statistics/StreamStatistics.ts`

职责：

- 记录输入和输出的累计字节数。
- 按采样间隔计算 bps。
- 维护 `idle`、`connecting`、`connected`、`error` 状态。

## 5. 配置模型

共享类型位于 `src/shared/stream.ts`。

配置入口：

- 渲染进程编辑 `StreamConfig`。
- `preload` 将配置通过 IPC 发给主进程。
- 主进程先校验，再启动服务或保存配置。

校验规则：

- `version` 必须为 `0.0.1`。
- 输入必须启用。
- 至少需要 1 路启用的输出。
- `bufferSize`、`statusInterval`、`reconnectInterval` 和 `inactiveTimeout` 必须为正整数。
- 端口必须在 `0..65535` 范围内。
- TCP / UDP Client 必须提供非空 host。
- Serial 参数必须满足 `serialport` 支持的基础范围。
- File 必须提供非空 path；`timeTag` 必须为布尔值；`replaySpeed`、`startOffset` 和 `filePositionBytes` 必须在可用范围内。

## 6. 渲染进程结构

位置：`src/renderer/`

主要组件：

- `App.tsx`：页面入口，负责加载配置、启动 / 停止服务。
- `ConnectionPanel.tsx`：输入和输出配置表单。
- `StreamList.tsx`：状态卡片列表。
- `StatusCard.tsx`：单路流状态展示。
- `LogView.tsx`：日志列表。

主题：

- `theme.ts` 使用 MUI 深色主题。
- 当前 UI 以操作工具为目标，布局保持紧凑、可扫描。

## 7. IPC API

共享定义位于 `src/shared/ipc.ts`。

```typescript
interface NavBridgeAPI {
  startServer(config: StreamConfig): Promise<{ success: boolean; error?: string }>;
  stopServer(): Promise<void>;
  loadConfig(): Promise<StreamConfig>;
  saveConfig(config: StreamConfig): Promise<void>;
  onStatus(callback: (status: StreamStatus) => void): () => void;
  onLog(callback: (log: LogEntry) => void): () => void;
}
```

预加载脚本通过 `contextBridge.exposeInMainWorld("navBridge", api)` 暴露 API。渲染进程只能调用该受控接口，不能直接访问 Node.js 模块。

## 8. 启动和停止生命周期

### 8.1 启动

1. UI 调用 `window.navBridge.startServer(config)`。
2. 主进程校验配置。
3. 如果已有服务，先停止旧服务。
4. 根据配置创建输入和输出适配器。
5. `StreamServer.start()` 依次打开适配器。
6. 启动后台转发循环和状态推送。

### 8.2 停止

1. UI 调用 `window.navBridge.stopServer()`。
2. `IpcBridge` 将停止操作放入生命周期队列。
3. `StreamServer.stop()` 停止循环并关闭所有适配器。
4. 推送最终状态。

## 9. 测试策略

测试位于 `src/test/stream/`，使用 Jest 和 `ts-jest`。

当前覆盖：

- `StreamServer`：转发、多输出、启动失败回滚。
- `TcpAdapter`：TCP Server 输入、TCP Client 输出。
- `UdpAdapter`：UDP Server 输入、UDP Client 输出、端口绑定失败。
- `FileAdapter`：普通文件输入、RTKLIB `.tag` 回放、time tag 输出和旧 tag 清理。
- `createAdapter`：方向约束。
- `validateStreamConfig`：配置边界。
- `StreamStatistics`：累计字节数和 bps。

未覆盖但后续建议补充：

- Electron IPC 集成测试。
- 渲染进程组件交互测试。
- Serial mock binding 测试。
- 大流量和 backpressure 场景。

## 10. 当前限制

- TCP Server 当前只保留最后一个连接的 socket。
- UDP 状态仍是近似状态，不代表真实连接。
- Serial 自动测试依赖虚拟串口或 mock binding，当前未纳入默认测试。
- 还未实现 NTRIP 和 Foxglove WebSocket。
- File 已支持基本读写和 RTKLIB `.tag`，但暂未支持 RTKLIB `::S=` 自动换文件和时间路径替换关键字。
- 输出失败不会自动重连，后续版本需要补齐连接恢复策略。

## 11. 后续演进

建议按以下顺序扩展：

1. 增加 Foxglove WebSocket 输出适配器，让 Lichtblick 可直接连接。
2. 增加 NTRIP Client / Server / Caster。
3. 增强文件回放控制、路径替换关键字和自动换文件能力。
4. 引入 RTCM / 原始接收机格式解析。
5. 增加 UI 自动串口扫描和连接恢复策略。

## 12. 架构边界补充

### 12.1 配置事实源

运行配置以主进程 `ConfigStore` 为单一事实源。渲染进程在启动时通过 `window.navBridge.loadConfig()` 读取配置，用户修改后通过 `window.navBridge.saveConfig(config)` 写回主进程。

渲染进程不再使用 `localStorage` 保存业务配置，避免与 `electron-store` 形成两个配置来源。`localStorage` 仅保留给主题模式等纯 UI 偏好。

### 12.2 共享选项约束

`StreamOptions` 的边界、默认值和 UI 清洗逻辑集中在 `src/shared/streamOptions.ts`：

- 渲染进程表单通过该模块清洗输入值。
- 主进程配置校验通过同一模块检查运行期边界。
- 后续新增选项时，应先扩展共享约束，再接入 UI 和主进程校验。

### 12.3 后续拆分方向

`IpcBridge` 当前仍同时承载流生命周期、配置、窗口控制和监控窗口入口。该结构对当前规模可接受，但后续继续扩展时建议拆分为：

- `StreamBridge`：启动、停止、状态、日志和数据。
- `ConfigBridge`：配置读取、保存、导出和迁移。
- `WindowBridge`：窗口最小化、关闭、置顶和 resize。
- `MonitorBridge`：监控窗口生命周期和主进程到监控窗口的数据推送。
