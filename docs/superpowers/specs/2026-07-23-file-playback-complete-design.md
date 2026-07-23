# 文件输入播放完成状态设计

## 背景

文件输入读到末尾后，`FileAdapter` 已将自身状态切换为 `idle`，但
`StreamServer` 没有把该状态同步到输入指标。主界面因此继续把输入显示为
`connected`，底部状态栏仍显示运行时长，用户无法判断文件是否已经播放完毕。

## 目标

- 文件输入播放完毕后，仅将 input 状态显示为停止。
- 在底部状态栏持续显示文件播放完成提示。
- 保持服务整体处于运行状态。
- 不主动关闭或修改任何 output 状态。
- 非文件输入和手动停止行为保持不变。

## 非目标

- 不自动停止 `StreamServer`。
- 不关闭 output，不重置其状态或统计数据。
- 不新增弹窗、Snackbar 或系统通知。
- 不引入新的连接状态枚举。

## 方案

复用现有 `idle` 状态表达文件输入停止。

当 `StreamServer` 的输入类型为 `file` 时，在生成状态快照前读取输入适配器状态，
并将其同步到输入统计。文件尚未到达末尾时，`FileAdapter` 保持
`connected`；到达末尾后，它切换为 `idle`。同步逻辑仅作用于文件输入，不改变
其他输入类型的现有状态管理方式。

底部状态栏检测到以下组合时，显示
`(0) stopped · file playback complete`：

- 服务仍在运行；
- input 类型为 `file`；
- input 状态为 `idle`。

手动停止服务后，`running` 为 `false`，底部仍按现有规则显示普通 `idle`，避免把
用户主动停止误报为播放完成。

## 数据流

1. `FileAdapter.read()` 读到文件末尾，将适配器状态设为 `idle`。
2. `StreamServer` 保持运行，并继续保留 output 当前状态。
3. `StreamServer.getStatus()` 仅同步文件 input 的适配器状态。
4. 状态经现有 IPC 通道发送到渲染进程。
5. input 行使用现有 `idle` 视觉状态，底部状态栏显示播放完成文案。

## 边界情况

- 普通文件和带 RTKLIB time tag 的文件使用相同完成判定。
- time tag 播放期间暂时无可读数据时，适配器仍为 `connected`，不得提前显示完成。
- 空文件首次读取后立即进入播放完成状态。
- 重新启动服务后，input 状态恢复为 `connected`，完成提示随之消失。
- output 写入失败等既有错误状态不受本改动影响。

## 测试

- `StreamServer` 测试：文件输入到达末尾后，服务仍为运行状态，input 为
  `idle`。
- `StreamServer` 测试：文件输入完成不会改写 output 状态。
- 状态文案测试：运行中的文件 input 为 `idle` 时显示
  `(0) stopped · file playback complete`。
- 状态文案测试：手动停止、非文件 input 或仍在播放时不显示播放完成提示。
- 回归测试：现有文件适配器、流服务和渲染层测试全部通过。
