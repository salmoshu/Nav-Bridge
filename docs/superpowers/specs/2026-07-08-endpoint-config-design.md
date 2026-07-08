# 数据链路配置优化设计

## 背景

用户反馈 Nav-Bridge 上位机在数据链路（Endpoint）配置与展示上存在 4 个问题：

1. 数据链路序号圆标中的数字未垂直居中。
2. 将数据链路类型从 UDP 切换为 TCP 时，立即弹出错误提示，但用户期望错误只在点击 Start 按钮时出现。
3. 串口配置对话框中，多个下拉框横向排版异常，且高级参数直接全部展示；希望默认只展示 COM 口和波特率，勾选 Advanced 后才展开其他选项。
4. 串口类型默认 COM 口为 `COM3`，希望默认为空，由用户自行选择，避免误判。

## 目标

- 修复序号圆标视觉居中。
- 将「启动前业务校验」从保存/导出流程中移除，仅在点击 Start 时执行。
- 优化串口配置对话框布局，增加 Advanced 开关控制高级参数显示。
- 将串口默认 `port` 改为空字符串。

## 方案选择

采用 **方案 A：最小改动方案**。

> 只在 `startServer` 时执行完整配置校验；`saveConfig` 与 `exportConfig` 不再调用 `validateStreamConfig`。
> 理由：用户明确表达"保存可能引发异常的数据都不要紧，只要在运行的时候告知用户即可"，最小改动方案最贴合该原则。

## 详细设计

### 1. 序号圆标居中对齐

**文件：** `src/renderer/components/EndpointTable.tsx`

当前序号 badge 使用 18×18px 圆形 + flex 居中，但默认行高导致数字在视觉上略微偏下。

**改动：**

```tsx
<Box
  sx={{
    width: 18,
    height: 18,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.625rem",
    fontWeight: 700,
    lineHeight: "18px", // 新增：确保数字垂直居中
    bgcolor: alpha(badgeColor, 0.12),
    color: isInput ? theme.palette.primary.dark : theme.palette.secondary.dark
  }}
>
  {index}
</Box>
```

### 2. 仅在 Start 时执行校验

**文件：** `src/main/ipc/bridge.ts`

**改动：**

- `ipcChannels.saveConfig` handler：删除 `validateStreamConfig(config)`。
- `ipcChannels.exportConfig` handler：删除 `validateStreamConfig(config)`。
- `ipcChannels.startServer` handler：保留完整校验，包括 `validateStreamConfig` 与 `validateDuplicateClientEndpoints`。

**效果：**

- 用户在 EndpointTable 中切换 type、修改 port 时，配置会正常保存，不再立即抛出端口冲突错误。
- 点击 Start 按钮时，主进程仍会校验并在出错时返回错误消息，App.tsx 通过 Alert 展示。

### 3. 串口配置对话框：修复排版 + Advanced 开关

**文件：** `src/renderer/components/EndpointConfigDialog.tsx`

**改动：**

- 串口配置区域默认只展示：
  - Serial port（Autocomplete，支持手动输入 + 下拉刷新）
  - Baud（波特率下拉）
- 新增 `FormControlLabel + Switch`，label 为 "Advanced"。
- 仅当 Advanced 开关开启时，才展示第二行：
  - Data bits
  - Parity
  - Stop bits
  - Flow
- 修复第二行排版：统一各下拉框 `minWidth`，确保 Flow 字段不再被挤压或换行异常。
- 高级参数默认值仍保留在 draft 中（dataBits=8, parity=none, stopBits=1, flowControl=none），只是 UI 上默认隐藏。

### 4. 串口默认 port 改为空

**文件：** `src/renderer/lib/endpointConfig.ts`

**改动：**

```ts
case "serial":
  return {
    port: "",          // 由 "COM3" 改为空字符串
    baudRate: 115200,
    dataBits: 8,
    parity: "none",
    stopBits: 1,
    flowControl: "none"
  };
```

`EndpointConfigDialog` 中 Serial port Autocomplete 的 placeholder 保持 `"COM3"`，作为输入示例。

## 测试计划

1. **单元测试更新：**
   - `src/test/renderer/endpointConfig.test.ts`：更新 `defaultParamsForType("serial")` 断言，port 应为 `""`。
   - `src/test/stream/validateStreamConfig.test.ts` 或新增 `src/test/main/IpcBridge.test.ts`：验证 `saveConfig`/`exportConfig` 不再因端口冲突抛出异常，而 `startServer` 仍会抛出。

2. **回归测试：**
   - 运行 `yarn test` 全量测试，确保无回归。

## 风险与回滚

- 移除 `saveConfig` 校验后，无效配置可能落盘；但 `startServer` 仍会做完整校验，不会导致运行时错误被忽略。
- 串口默认 port 为空后，如果用户未选择直接点击 Start，会在启动校验时提示 `serial.port is required`。
