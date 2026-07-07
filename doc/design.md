# Nav-Bridge 设计方案

> 版本：0.0.1  
> 日期：2026-07-07  
> 状态：设计中（第一阶段框架）

## 1. 项目概述

### 1.1 背景与目标

Nav-Bridge 参考 RTKLIB 中的 `strsvr` 应用，使用 Web 技术栈（TypeScript）对其进行重构，目标是构建一个实时数据流转换器，用于将外部 GNSS/导航数据流接入到 Nav-Tools-Lichtblick 中进行可视化与诊断。

### 1.2 核心定位

- **产品形态**：独立 Electron 桌面应用，与 Nav-Tools-Lichtblick 并排运行。
- **第一阶段核心任务**：先把数据流框架跑通，实现 RTKLIB `strsvr` 的"1 路输入 → N 路输出"实时字节转发能力。
- **UI 风格**：向 Nav-Tools-Lichtblick 靠齐，使用 React 18 + MUI v7 的可变主题（浅色、深色、跟随系统）与组件风格。

### 1.3 版本范围（v0.0.1）

本版本仅聚焦框架搭建与最小可用转发能力：

- **支持的传输类型**：TCP Server / TCP Client、UDP Server / UDP Client、Serial。
- **不支持的类型**：NTRIP（Client/Server/Caster）、文件（File）输入输出。
- **支持的能力**：1 入 N 出透明字节转发、连接状态监控、字节/码率统计。
- **暂不支持的能力**：RTCM/接收机原始格式转换、NMEA GGA 请求、周期命令、relay-back、日志记录。这些作为后续扩展项。

---

## 2. 需求分析

### 2.1 功能需求

| 编号 | 需求                   | 优先级 | 说明                                                                    |
| ---- | ---------------------- | ------ | ----------------------------------------------------------------------- |
| F-01 | 配置输入流             | 高     | 支持 TCP Server / TCP Client / UDP Server / Serial 作为输入。           |
| F-02 | 配置多个输出流         | 高     | 支持 TCP Server / TCP Client / UDP Client / Serial 作为输出，数量 >=1。 |
| F-03 | 启动/停止转发服务      | 高     | 一键启动所有流连接，失败时回滚并提示错误。                              |
| F-04 | 实时字节转发           | 高     | 从输入流读取数据后，并发写入所有输出流。                                |
| F-05 | 状态监控               | 高     | 显示输入/每路输出的连接状态、累计字节数、实时码率（bps）。              |
| F-06 | UI 风格对齐 Lichtblick | 中     | 使用 MUI 组件、深色主题、状态面板、日志视图。                           |
| F-07 | 配置持久化             | 中     | 保存/读取用户配置的流参数。                                             |
| F-08 | 错误与日志展示         | 中     | 在 UI 中展示连接错误、读写异常等关键事件。                              |

### 2.2 非功能需求

| 编号  | 需求               | 说明                                                                         |
| ----- | ------------------ | ---------------------------------------------------------------------------- |
| NF-01 | 低延迟转发         | 数据通路跑在 Electron 主进程后台循环，避免 UI 阻塞。                         |
| NF-02 | 可测试性           | 核心 `StreamServer` 与适配器可被单元测试覆盖；TCP/UDP 使用本地回环端口测试。 |
| NF-03 | 可扩展性           | 适配器接口统一，后续可方便加入 NTRIP、File、Foxglove WebSocket 等。          |
| NF-04 | 跨平台             | 支持 Windows、Linux、macOS；串口使用 `serialport` 跨平台方案。               |
| NF-05 | 与 Lichtblick 解耦 | 第一阶段不修改 Lichtblick 源码，Nav-Bridge 作为独立应用存在。                |

---

## 3. 高层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Electron Renderer (UI)                          │
│  React + MUI：连接配置面板、流列表、状态卡片、日志视图、启动/停止按钮  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ IPC
┌───────────────────────────────▼─────────────────────────────────────┐
│                     Electron Main (Core)                            │
│  StreamServer：1 入 N 出实时数据转发服务                              │
│   ├── StreamManager：流生命周期管理（open / close / loop）            │
│   ├── adapters：统一流适配器接口                                     │
│   │   ├── TcpAdapter（tcp server / client）                          │
│   │   ├── UdpAdapter（udp server / client）                          │
│   │   └── SerialAdapter（serial port）                               │
│   ├── statistics：字节/码率/状态聚合                                  │
│   └── ipc-bridge：主进程 ↔ 渲染进程通信封装                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    TCP / UDP / Serial (raw bytes)
```

### 3.1 与 Nav-Tools-Lichtblick 的关系

- 第一阶段 Nav-Bridge 独立运行，通过输出流把原始字节暴露给任何下游消费者（例如另一台运行 Lichtblick 的机器通过 TCP 接收）。
- 第二阶段将新增 Foxglove WebSocket 输出适配器，使 Lichtblick 可以直接以"Foxglove WebSocket"数据源的方式连接 Nav-Bridge。

---

## 4. 核心模块设计

### 4.1 StreamServer

`StreamServer` 是核心服务，持有 1 个输入适配器和 N 个输出适配器。

```typescript
class StreamServer {
  private input: StreamAdapter;
  private outputs: StreamAdapter[];
  private statistics: StreamStatistics;
  private running: boolean;

  async start(config: StreamConfig): Promise<void>;
  async stop(): Promise<void>;
  getStatus(): StreamStatus;
  onStatus(callback: (status: StreamStatus) => void): () => void;
}
```

主循环逻辑：

1. 依次 `open` 输入流和所有输出流；任一失败则回滚已打开的流并抛出错误。
2. `running` 为真时循环：
   - 调用 `input.read(bufferSize)` 读取数据块。
   - 若读到数据，并发调用所有 `outputs[i].write(data)`。
   - 更新 `StreamStatistics`。
   - 短暂 `setImmediate` / 小延迟避免空转。
3. 停止时设置 `running = false`，等待循环结束，依次 `close` 所有流。

### 4.2 StreamAdapter 接口

所有具体适配器实现统一接口：

```typescript
interface StreamAdapter {
  readonly type: StreamType;
  readonly mode: "input" | "output";

  open(): Promise<void>;
  close(): Promise<void>;
  read(maxBytes: number): Promise<Buffer | undefined>;
  write(data: Buffer): Promise<void>;
  getStatus(): StreamAdapterStatus;
}
```

### 4.3 适配器实现

#### TcpAdapter

基于 Node.js 原生 `net` 模块。

- **TCP Server**：`net.createServer()`，监听端口；输入模式下接收客户端连接的数据；输出模式下向连接的客户端写入数据。
- **TCP Client**：`net.createConnection()`，输入模式下连接远端并读取数据；输出模式下向远端发送数据。
- 连接断开时自动尝试重连（可配置）。

#### UdpAdapter

基于 Node.js 原生 `dgram` 模块。

- **UDP Server**：`dgram.createSocket('udp4')`，绑定端口接收数据。仅用于输入。
- **UDP Client**：`dgram.createSocket('udp4')`，向指定地址/端口发送数据。仅用于输出。

#### SerialAdapter

基于 `serialport` npm 包。

- 支持参数：port（串口号）、baudRate、dataBits、parity、stopBits、flowControl。
- 主进程直接持有串口句柄，渲染进程通过 IPC 操作。
- 打开/关闭/读写均通过 `SerialPort` 实例完成。

### 4.4 StreamStatistics

维护各路流的状态与统计：

```typescript
interface StreamStatistics {
  input: { bytes: number; bps: number; status: ConnectionStatus; error?: string };
  outputs: Array<{ bytes: number; bps: number; status: ConnectionStatus; error?: string }>;
}
```

- `bytes`：累计收发字节数。
- `bps`：基于 1 秒滑动窗口计算的瞬时码率。
- `status`：`idle` / `connecting` / `connected` / `error`。

统计信息每 1 秒通过 IPC 推送给渲染进程用于 UI 刷新。

### 4.5 IPC Bridge

主进程通过 `ipcMain` 暴露 API，渲染进程通过 `contextBridge` 调用：

```typescript
interface NavBridgeAPI {
  startServer(config: StreamConfig): Promise<{ success: boolean; error?: string }>;
  stopServer(): Promise<void>;
  onStatus(callback: (status: StreamStatus) => void): () => void;
  onLog(callback: (log: LogEntry) => void): () => void;
  loadConfig(): Promise<StreamConfig>;
  saveConfig(config: StreamConfig): Promise<void>;
}
```

---

## 5. 数据流与生命周期

### 5.1 启动流程

```
用户点击"启动"
    │
    ▼
渲染进程调用 navBridge.startServer(config)
    │
    ▼
主进程校验配置（类型合法性、地址/端口格式、串口参数）
    │
    ▼
主进程依次 open input → output[0] → output[1] → ...
    │
    ├── 全部成功：启动后台转发循环，返回 success
    └── 任一失败：回滚已 open 的流，返回错误
```

### 5.2 运行期数据流

```
┌──────┐    read()    ┌─────────────┐    write()    ┌─────────┐
│Input │ ───────────▶ │ StreamServer│ ───────────▶ │Output 0 │
└──────┘              │             │              └─────────┘
                      │   (copy)    │   write()    ┌─────────┐
                      │             │ ───────────▶ │Output 1 │
                      └─────────────┘              └─────────┘
                              │
                              ▼ update
                      ┌─────────────┐
                      │ Statistics  │
                      └─────────────┘
```

### 5.3 停止流程

1. 设置 `running = false`。
2. 等待主循环当前迭代结束。
3. 依次 `close` 输入流和所有输出流。
4. 推送最终状态到 UI。

---

## 6. 项目目录结构

采用轻量单仓库结构：

```
Nav-Bridge/
├── doc/
│   └── design.md                 # 本文档
├── src/
│   ├── main/                     # Electron 主进程
│   │   ├── index.ts              # 主进程入口
│   │   ├── stream/
│   │   │   ├── StreamServer.ts   # 核心转发服务
│   │   │   ├── adapters/
│   │   │   │   ├── StreamAdapter.ts
│   │   │   │   ├── TcpAdapter.ts
│   │   │   │   ├── UdpAdapter.ts
│   │   │   │   └── SerialAdapter.ts
│   │   │   ├── statistics/
│   │   │   │   └── StreamStatistics.ts
│   │   │   └── types.ts
│   │   ├── ipc/
│   │   │   └── bridge.ts         # IPC 主进程端
│   │   └── config/
│   │       └── ConfigStore.ts    # 配置持久化
│   ├── preload/
│   │   └── index.ts              # contextBridge 暴露 API
│   ├── renderer/                 # Electron 渲染进程
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ConnectionPanel.tsx
│   │   │   ├── StreamList.tsx
│   │   │   ├── StatusCard.tsx
│   │   │   └── LogView.tsx
│   │   ├── hooks/
│   │   │   ├── useStreamStatus.ts
│   │   │   └── useNavBridgeAPI.ts
│   │   └── theme.ts              # 对齐 Lichtblick 的 MUI 主题
│   ├── shared/                   # 主/渲染共享类型
│   │   ├── ipc.ts
│   │   └── stream.ts
│   └── test/                     # 测试
│       └── stream/
│           ├── StreamServer.test.ts
│           ├── TcpAdapter.test.ts
│           └── UdpAdapter.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts                # 渲染进程 Vite 配置
├── electron.vite.config.ts       # Electron 主进程/预加载 Vite 配置
├── jest.config.js
├── .eslintrc.yaml
└── .prettierrc.yaml
```

---

## 7. 技术栈

| 层次     | 技术选型                                    | 说明                                                                                                      |
| -------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 运行环境 | Electron 39.x（或 Lichtblick 当前版本对齐） | 主进程处理原生 IO，渲染进程负责 UI。                                                                      |
| 语言     | TypeScript 5.x                              | 与 Lichtblick 一致。                                                                                      |
| 构建工具 | Vite 6.x + `electron-vite`                  | 渲染进程与 Electron 主/预加载统一用 Vite 构建；如后续需要深度对齐 Lichtblick 构建流程，可迁移到 Webpack。 |
| UI 框架  | React 18.x + MUI 7.x                        | 与 Lichtblick 视觉体系对齐。                                                                              |
| 状态管理 | React Context + `useState`/`useReducer`     | 第一阶段无需引入 Redux。                                                                                  |
| 串口     | `serialport` 12.x                           | Electron 主进程事实标准。                                                                                 |
| TCP/UDP  | Node.js `net` / `dgram`                     | 原生模块，无需额外依赖。                                                                                  |
| 测试     | Jest + ts-jest                              | 与 Lichtblick 测试栈一致。                                                                                |
| 包管理   | Yarn 4 / npm 10                             | 根据实际环境选择。                                                                                        |
| 代码规范 | ESLint + Prettier                           | 参考 Lichtblick 配置。                                                                                    |

### 7.1 与 Lichtblick 技术栈的映射

| Nav-Bridge                | Lichtblick                       |
| ------------------------- | -------------------------------- |
| Electron + React + MUI    | Electron + React + MUI           |
| TypeScript + Vite/Webpack | TypeScript + Webpack             |
| Jest                      | Jest                             |
| `serialport`              | 无（未来可复用 Nav-Bridge 能力） |

---

## 8. 配置模型

```typescript
interface StreamEndpoint {
  id: string;
  type: "tcp-server" | "tcp-client" | "udp-server" | "udp-client" | "serial";
  enabled: boolean; // 输出流可单独启用/禁用；输入流必须 enabled
  params: TcpServerParams | TcpClientParams | UdpServerParams | UdpClientParams | SerialParams;
}

interface StreamConfig {
  version: "0.0.1";
  input: StreamEndpoint;
  outputs: StreamEndpoint[];
  options: {
    bufferSize: number; // 默认 4096
    reconnectInterval: number; // 默认 10000 ms
    inactiveTimeout: number; // 默认 10000 ms
    statusInterval: number; // 默认 1000 ms
  };
}
```

### 8.1 各类型参数示例

```typescript
interface TcpServerParams {
  port: number;
  host?: string; // 默认 "0.0.0.0"
}

interface TcpClientParams {
  host: string;
  port: number;
}

interface UdpServerParams {
  port: number;
  host?: string;
}

interface UdpClientParams {
  host: string;
  port: number;
}

interface SerialParams {
  port: string; // 如 "COM3" / "/dev/ttyUSB0"
  baudRate: number; // 默认 115200
  dataBits: 7 | 8; // 默认 8
  parity: "none" | "even" | "odd"; // 默认 "none"
  stopBits: 1 | 2; // 默认 1
  flowControl: "none" | "rtscts"; // 默认 "none"
}
```

---

## 9. 测试策略

### 9.1 单元测试

- `StreamServer.test.ts`：使用内存/mock 适配器验证启动、转发、停止逻辑。
- `TcpAdapter.test.ts`：使用本地回环端口验证 server/client 读写。
- `UdpAdapter.test.ts`：使用本地回环端口验证 server/client 收发。
- `StreamStatistics.test.ts`：验证字节累计与码率计算。

### 9.2 集成测试

- 端到端验证：启动 Nav-Bridge → 用外部 TCP/UDP 工具发送数据 → 验证输出端收到相同字节。
- 串口测试：使用虚拟串口工具或 `serialport` 的 mock binding。

### 9.3 UI 测试

- 第一阶段以手动验证为主；关键组件（如状态卡片渲染）可补充 Jest + React Testing Library 快照测试。

---

## 10. 风险与限制

| 编号 | 风险                                             | 缓解措施                                                           |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------ |
| R-01 | `serialport` 原生模块在 Electron 中需要重新编译  | 使用 `electron-rebuild` 或 `electron-builder` 的 rebuild 钩子。    |
| R-02 | 串口号在不同平台差异大                           | UI 提供下拉列表/自动检测，配置中保存平台相关路径。                 |
| R-03 | TCP Server 多客户端管理复杂                      | 第一阶段限制为"单客户端有效"或"向最后一个连接客户端写"，后续扩展。 |
| R-04 | UDP 是无连接协议，状态判断不准确                 | 通过最近收发时间推断"活跃/不活跃"状态。                            |
| R-05 | 大流量下主进程事件循环被阻塞                     | 使用流式读取/写入 + 适当 backpressure，避免同步大数据拷贝。        |
| R-06 | 与 Lichtblick 的 Foxglove WebSocket 集成尚未实现 | 明确列为第二阶段目标，第一阶段保持接口可扩展。                     |

---

## 11. 后续扩展路线图

| 版本  | 目标                                                               |
| ----- | ------------------------------------------------------------------ |
| 0.0.1 | 框架搭建：1 入 N 出 TCP/UDP/Serial 透明转发 + 状态监控 + 基础 UI。 |
| 0.0.2 | 增加 NTRIP Client / Server / Caster 支持。                         |
| 0.0.3 | 增加文件（File）输入输出与回放控制。                               |
| 0.1.0 | 接入 Foxglove WebSocket 输出适配器，使 Lichtblick 可直接连接。     |
| 0.2.0 | 引入 RTCM/接收机原始格式转换（`strconv` 能力）。                   |

---

## 12. 参考

- RTKLIB 2.5.1：`src/stream.c`、`src/streamsvr.c`、`app/consapp/str2str/str2str.c`
- Nav-Tools-Lichtblick：`packages/suite-base/src/dataSources/`、`packages/suite-desktop/src/main/`、`packages/suite-desktop/src/preload/`
