# UI 持续优化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 根据设计文档 `docs/superpowers/specs/2026-07-08-ui-optimization-design.md` 完成 Nav-Bridge 主界面三处 UI 优化：Header 主题图标化、Endpoints 0/1/2/3 徽章编号、Endpoints 表格防挤压美化。

**架构：** 保留现有组件结构，仅修改 `ThemeModeSelector` 的渲染方式（图标触发 + 下拉文字说明）和 `EndpointTable` 的行标识与样式（编号徽章 + 紧凑网格 + 分隔线）。不涉及交互逻辑或状态管理变更。

**技术栈：** React、TypeScript、MUI (Material-UI)、Jest + ts-jest。

---

## 文件结构

| 文件                                            | 职责                      | 操作                                       |
| ----------------------------------------------- | ------------------------- | ------------------------------------------ |
| `src/renderer/components/ThemeModeSelector.tsx` | Header 主题切换组件       | 修改：图标触发，下拉菜单显示图标+文字+说明 |
| `src/renderer/components/EndpointTable.tsx`     | Endpoints 表格组件        | 修改：行号徽章、列宽、字号、分隔线         |
| `src/test/renderer/themeMode.test.ts`           | 主题模式工具函数测试      | 保持不变（不测试组件渲染）                 |
| `src/test/renderer/endpointConfig.test.ts`      | Endpoint 配置工具函数测试 | 保持不变                                   |

---

### 任务 1：Header 主题切换图标化

**文件：**

- 修改：`src/renderer/components/ThemeModeSelector.tsx`

- [ ] **步骤 1：导入图标**

  在文件顶部新增 MUI 图标导入：

  ```tsx
  import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
  import LightModeIcon from "@mui/icons-material/LightMode";
  import DarkModeIcon from "@mui/icons-material/DarkMode";
  import { Stack, Typography } from "@mui/material";
  ```

- [ ] **步骤 2：扩展主题选项配置**

  将 `themeOptions` 数组改为包含图标和说明：

  ```tsx
  const themeOptions: {
    value: ThemeMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "system",
      label: "跟随系统",
      description: "根据系统外观自动切换",
      icon: <BrightnessAutoIcon fontSize="small" />
    },
    {
      value: "light",
      label: "浅色",
      description: "始终使用浅色主题",
      icon: <LightModeIcon fontSize="small" />
    },
    {
      value: "dark",
      label: "深色",
      description: "始终使用深色主题",
      icon: <DarkModeIcon fontSize="small" />
    }
  ];
  ```

- [ ] **步骤 3：修改 Select 渲染值为图标**

  在 `Select` 组件上添加 `renderValue`，使闭合状态下只显示当前选项图标：

  ```tsx
  <Select<ThemeMode>
    value={mode}
    onChange={handleChange}
    aria-label="theme mode"
    variant="outlined"
    renderValue={(selected) => {
      const option = themeOptions.find((o) => o.value === selected);
      return option?.icon ?? null;
    }}
    sx={{
      fontSize: "0.8125rem",
      "& .MuiSelect-select": {
        py: 0.25,
        px: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }}
  >
  ```

- [ ] **步骤 4：修改下拉菜单项为图标 + 文字 + 说明**

  将 `MenuItem` 渲染改为带图标的横向布局：

  ```tsx
  {
    themeOptions.map((option) => (
      <MenuItem key={option.value} value={option.value} dense>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
          {option.icon}
          <Stack spacing={0}>
            <Typography variant="body2" fontSize="0.8125rem">
              {option.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontSize="0.6875rem">
              {option.description}
            </Typography>
          </Stack>
        </Stack>
      </MenuItem>
    ));
  }
  ```

- [ ] **步骤 5：运行 TypeScript 检查**

  运行：`npx tsc --noEmit`
  预期：无 TypeScript 错误。

- [ ] **步骤 6：Commit**

  ```bash
  git add src/renderer/components/ThemeModeSelector.tsx
  git commit -m "feat(Header): 主题切换改为图标触发，下拉菜单显示文字说明"
  ```

---

### 任务 2：Endpoints 行号徽章化与表格防挤压

**文件：**

- 修改：`src/renderer/components/EndpointTable.tsx`

- [ ] **步骤 1：导入 alpha 工具函数**

  在文件顶部新增：

  ```tsx
  import { alpha, useTheme } from "@mui/material/styles";
  ```

- [ ] **步骤 2：调整表格网格列宽**

  将 `endpointGridColumns` 常量从：

  ```tsx
  const endpointGridColumns = "36px 72px 110px minmax(0, 1fr) 64px 64px 80px";
  ```

  改为：

  ```tsx
  const endpointGridColumns = "24px 28px 96px minmax(0, 1fr) 48px 48px 56px";
  ```

- [ ] **步骤 3：替换 label 为 index 并渲染徽章**

  在 `EndpointTable` 组件中，将 `EndpointRow` 调用从：

  ```tsx
  <EndpointRow
    label="Input"
    mode="input"
    ...
  />
  ```

  改为：

  ```tsx
  <EndpointRow
    index={0}
    mode="input"
    ...
  />
  ```

  将 outputs 循环中的调用从：

  ```tsx
  <EndpointRow
    key={output.id}
    label={`Output ${index + 1}`}
    mode="output"
    ...
  />
  ```

  改为：

  ```tsx
  <EndpointRow
    key={output.id}
    index={index + 1}
    mode="output"
    ...
  />
  ```

- [ ] **步骤 4：修改 EndpointRow props 类型**

  将 `EndpointRow` 的 `label` prop 替换为 `index`：

  ```tsx
  function EndpointRow({
    index,
    mode,
    endpoint,
    metric,
    onChange,
    onConfigure,
    onDelete
  }: {
    index: number;
    mode: StreamMode;
    ...
  }) {
  ```

- [ ] **步骤 5：在 EndpointRow 中实现徽章组件**

  在 `EndpointRow` 函数体内渲染徽章替代原来的 `Typography` label：

  ```tsx
  const theme = useTheme();
  const isInput = mode === "input";
  const badgeColor = isInput ? theme.palette.primary.main : theme.palette.secondary.main;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: endpointGridColumns,
        gap: 1,
        alignItems: "center",
        px: 0.5,
        py: 0.5,
        borderBottom: 1,
        borderColor: "divider"
      }}
    >
      <Checkbox
        checked={endpoint.enabled}
        onChange={(event) => onChange({ ...endpoint, enabled: event.target.checked })}
        size="small"
        sx={{ p: 0.25 }}
      />
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
          bgcolor: alpha(badgeColor, 0.12),
          color: isInput ? theme.palette.primary.dark : theme.palette.secondary.dark
        }}
      >
        {index}
      </Box>
      ...
  ```

- [ ] **步骤 6：统一表格字号并应用等宽数字**

  将 `EndpointRow` 中的 `Typography` 统一调整：

  - 原来的 `label` Typography 已删除，替换为上面的徽章 Box。
  - Info 字段：

    ```tsx
    <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0, fontSize: "0.7rem" }}>
      {endpointSummary(endpoint)}
    </Typography>
    ```

  - Bytes / BPS 字段：

    ```tsx
    <Typography
      variant="caption"
      noWrap
      sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}
    >
      {metric.bytes.toLocaleString()}
    </Typography>
    <Typography
      variant="caption"
      noWrap
      sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}
    >
      {metric.bps.toLocaleString()}
    </Typography>
    ```

- [ ] **步骤 7：调整表头样式**

  将表头 `Box` 的样式改为更小的字号：

  ```tsx
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: endpointGridColumns,
      gap: 1,
      alignItems: "center",
      typography: "caption",
      color: "text.secondary",
      px: 0.5,
      fontSize: "0.65rem"
    }}
  >
  ```

  同时，由于第一列是徽章而非文字，表头第一个空 span 保持，第二个 span 可以保留为空或添加 "#" 提示：

  ```tsx
  <span>#</span>
  ```

  将原来的 `<span />` 替换为 `<span>#</span>`。

- [ ] **步骤 8：运行 TypeScript 检查**

  运行：`npx tsc --noEmit`
  预期：无 TypeScript 错误。

- [ ] **步骤 9：运行测试套件**

  运行：`yarn test`（或 `npm test`）
  预期：所有现有测试通过。

- [ ] **步骤 10：Commit**

  ```bash
  git add src/renderer/components/EndpointTable.tsx
  git commit -m "feat(Endpoints): 改用 0/1/2/3 徽章编号并优化表格防挤压"
  ```

---

### 任务 3：运行构建/打包检查

**文件：** 无直接修改

- [ ] **步骤 1：运行 renderer 构建**

  运行：`yarn build`（或 `npm run build`）
  预期：构建成功，无错误。

- [ ] **步骤 2：Commit（如有必要，否则跳过）**

  若构建产生需要提交的配置变更才提交；通常此步骤不产生新提交。

---

## 自检

**1. 规格覆盖度：**

- Header 主题图标化 → 任务 1 步骤 1-4 ✓
- 下拉菜单文字说明 → 任务 1 步骤 4 ✓
- Endpoints 行号 0/1/2/3 → 任务 2 步骤 3-5 ✓
- 徽章样式（primary/secondary 半透明）→ 任务 2 步骤 5 ✓
- 表格字号下调、防挤压 → 任务 2 步骤 2、6、7 ✓
- 行分隔线 → 任务 2 步骤 5 ✓

**2. 占位符扫描：**

- 无 "待定" / "TODO" / "后续实现" / "补充细节" ✓
- 每个代码步骤包含实际代码 ✓
- 命令和预期输出明确 ✓

**3. 类型一致性：**

- `EndpointRow` 接收 `index: number` 而非 `label: string`，所有调用点同步更新 ✓
- `ThemeModeSelector` 的 `themeOptions` 类型与渲染代码一致 ✓
