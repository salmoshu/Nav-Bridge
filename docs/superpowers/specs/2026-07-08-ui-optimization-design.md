# UI 持续优化设计文档

## 背景与目标

对 Nav-Bridge 主界面做一轮精细化调整，解决当前视觉上的挤压感，并为未来链路转发（如 `3→0`、`2→0`）提前建立清晰的编号语义。

本次优化覆盖三个区域：

1. Header 主题切换：由纯文字 Select 改为图标触发 + 下拉文字说明。
2. Endpoints 行标识：由 "Input / Output 1 / Output 2" 改为基于 0/1/2/3 的链路编号。
3. Endpoints 表格：整体美化、字号下调、避免挤压与文字重叠。

## 设计方案（已选定：Badge 徽章风）

### 1. Header 主题切换

**当前状态**

Header 右侧的 `ThemeModeSelector` 是一个 `FormControl + Select`，当前值直接显示 "System / Light / Dark" 文字。

**变更后**

- 触发按钮仅显示图标，不显示文字，减少 Header 横向占用。
- 下拉菜单中每个选项显示：图标 + 文字标签 + 简短说明。

图标映射：

| 主题 | 图标（MUI） | 下拉文字 | 说明 |
|------|-------------|----------|------|
| system | `BrightnessAuto` | 跟随系统 | 根据系统外观自动切换 |
| light | `LightMode` | 浅色 | 始终使用浅色主题 |
| dark | `DarkMode` | 深色 | 始终使用深色主题 |

实现方式：

- 保留 `ThemeModeSelector` 组件，将 `Select` 的 `renderValue` 改为只渲染图标。
- `MenuItem` 内使用 `Stack direction="row"` 排列图标与文字说明。
- 保持 `aria-label="theme mode"`，确保可访问性不变。

### 2. Endpoints 行标识

**当前状态**

`EndpointRow` 的 `label` 字段显示为 "Input"、"Output 1"、"Output 2"。

**变更后**

- Input 固定编号为 `0`。
- Outputs 从 `1` 开始递增编号。
- 行号使用圆形/圆角徽章（Badge）样式，直径约 18px，字体约 10px，加粗。
- 为后续路由功能预留语义：`3→0` 表示 "第 3 条输出链路转发到第 0 条输入链路"。

徽章颜色方案（与主题自适应）：

- 编号 `0`（Input）：背景使用 `alpha(theme.palette.primary.main, 0.12)`，文字使用 `theme.palette.primary.dark`。
- 编号 `1+`（Output）：背景使用 `alpha(theme.palette.secondary.main, 0.12)`，文字使用 `theme.palette.secondary.dark`。
- 使用半透明背景而非固定色阶，保证 light/dark 模式下都有足够对比度。

实现方式：

- 在 `EndpointTable` 中不再传递 `label` 字符串，而是传递 `index: number`。
- `EndpointRow` 内部根据 `mode === "input"` 决定显示 `0`，否则显示 `index + 1`。
- 新增一个小型 `EndpointIndexBadge` 子组件或直接在 `EndpointRow` 内用 `Box` 实现徽章。

### 3. Endpoints 表格美化与防挤压

**当前问题**

- 表格列宽较紧，Info 字段容易被挤压。
- 默认 `body2` / `caption` 字号在窄列中略显拥挤。
- 行与行之间缺少分隔，视觉上像一坨表格。

**变更后**

- 整体字号下调一级：
  - 表头：从默认 `caption` 改为显式 `fontSize: "0.65rem"`。
  - 行内容：从 `body2` / `caption` 改为统一 `fontSize: "0.7rem"`。
  - 数字列（Bytes / BPS）：使用等宽数字（`fontVariantNumeric: "tabular-nums"`），避免宽度抖动。
- 列宽重新分配：
  - 勾选列保持约 22-24px。
  - 编号列（徽章）约 26-30px。
  - Type 选择框约 86-100px。
  - Info 列使用 `minmax(0, 1fr)` 占据剩余空间。
  - Bytes / BPS 各约 44-50px。
  - 操作列约 50-56px。
- 行视觉分隔：
  - 每行底部增加 1px 浅色分隔线（`borderColor: "divider"`）。
  - 行间 padding 从 `py: 0.25` 适当增加到 `py: 0.5`，让徽章和行高更协调。
- 操作按钮：
  - 保持 `IconButton`，padding 保持紧凑（`p: 0.25`）。
  - 状态指示灯保持 10px 圆点。

实现方式：

- 调整 `endpointGridColumns` 常量。
- 在 `EndpointRow` 根 `Box` 上增加 `borderBottom: 1`。
- 为所有 `Typography` 显式设置 `fontSize` 和 `noWrap`。

## 边界与限制

- 本次不改 Endpoints 的交互逻辑（添加、删除、编辑、启用/禁用）。
- 不改 `EndpointConfigDialog` 内部表单。
- 主题图标使用 MUI 已有图标，不引入新的图标库。
- 保持当前 dark/light 配色变量，仅微调表格行分隔线颜色。

## 验收标准

- Header 主题切换处仅显示图标，下拉菜单显示文字说明。
- Endpoints 表格中 Input 显示 `0`，Outputs 显示 `1`、`2`、`3`...，并用徽章样式呈现。
- 表格不再有文字重叠或被挤压到看不清的情况。
- 在 800×600 及以上窗口尺寸下，Endpoints 区域各列不重叠。
- 现有测试（renderer 单元测试）继续通过；如因组件 props 变更导致测试失败，同步更新测试。

## 相关文件

- `src/renderer/components/ThemeModeSelector.tsx`
- `src/renderer/components/EndpointTable.tsx`
- `src/renderer/components/AppTitleBar.tsx`（可能无需改动）
- `src/test/renderer/themeMode.test.ts`（如存在相关快照/测试）
- `src/test/renderer/endpointConfig.test.ts`
- `src/test/renderer/endpointStatus.test.ts`
