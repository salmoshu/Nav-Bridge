# Nav-Bridge

Nav-Bridge 是一个独立的 Electron 桌面应用，用于把外部 GNSS / 导航数据流转发给下游工具。当前版本聚焦 RTKLIB `strsvr` 风格的「1 路输入 → N 路输出」透明字节转发，为后续接入 Nav-Tools-Lichtblick 和 Foxglove WebSocket 打基础。

## 当前能力

- **透明转发：** 从 1 路输入读取原始字节，并写入多个输出。
- **传输类型：** 支持 TCP Server、TCP Client、UDP Server、UDP Client 和 Serial。
- **运行监控：** 展示输入和每路输出的连接状态、累计字节数和实时 bps。
- **桌面 UI：** 基于 Electron、React 18 和 MUI 7。
- **配置持久化：** 使用 `electron-store` 保存用户配置。
- **安全边界：** 主进程校验配置，启动失败会回滚已打开的流。

## 不在当前版本范围内

- NTRIP Client / Server / Caster
- 文件输入输出和回放控制
- RTCM / 接收机原始格式转换
- NMEA GGA 请求、周期命令、relay-back
- Foxglove WebSocket 输出适配器

## 环境要求

- Node.js >= 20
- npm >= 10
- Windows、Linux 或 macOS

串口功能依赖 `serialport` 原生模块。不同平台打包时可能需要重新构建原生依赖。

## 快速开始

```powershell
npm install
npm run dev
```

常用命令：

```powershell
npm test
npm run typecheck
npm run build
```

## 使用方式

1. 在「连接配置」中设置输入流。
2. 添加至少 1 路输出流。
3. 点击「启动」开始转发。
4. 通过状态卡片查看连接状态、累计字节数和实时 bps。
5. 点击「停止」关闭当前转发服务。

默认配置使用：

- 输入：`tcp-server://127.0.0.1:2101`
- 输出：`udp-client://127.0.0.1:2201`

## 项目结构

```text
src/
├── main/                 # Electron 主进程
│   ├── config/           # 配置存储与运行时校验
│   ├── ipc/              # IPC Bridge
│   └── stream/           # 转发核心与流适配器
├── preload/              # contextBridge API
├── renderer/             # React + MUI UI
├── shared/               # 主进程 / 渲染进程共享类型
└── test/                 # Jest 测试
```

## 文档

- [设计方案](./doc/design.md)
- [实现架构](./doc/architecture.md)

## 测试覆盖

当前自动化测试覆盖：

- `StreamServer` 的启动、转发、停止和启动失败回滚。
- TCP Server 输入和 TCP Client 输出。
- UDP Server 输入、UDP Client 输出和绑定失败。
- 流方向约束。
- 配置参数校验。
- 字节统计和 bps 计算。

## 参考项目

- RTKLIB 2.5.1：`stream.c`、`streamsvr.c`、`str2str.c`
- Nav-Tools-Lichtblick：桌面端结构、React / MUI 技术栈和数据源扩展方向
