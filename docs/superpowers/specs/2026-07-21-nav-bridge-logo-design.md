# Nav-Bridge 增加 Logo 设计规格

## 背景

Nav-Bridge 目前使用一个占位符 `ElectronLogoPlaceholder` 作为标题栏图标，没有应用图标。最初尝试复用 Nav-Tools 的 N/T 字母 logo，但用户希望获得一个更贴合“Nav-Bridge（导航数据桥）”概念、并与 Nav-Tools 应用明显区分的全新图标。

## 目标

- 在 Nav-Bridge 标题栏展示以“桥”为核心的新图标，替代现有占位符。
- 将新图标同时用作 Nav-Bridge 的应用图标（窗口图标 + 页面 favicon）。
- 保持现有 UI 风格、间距和可访问性不变。
- 更新相关测试以反映新的实现。

## 方案

采用 **桥主题图标 + 标题栏 SVG + 应用 favicon.ico**。

### 资源准备

- 新建 `public/logo.svg`：采用悬索桥 + 数据流虚线设计，加大笔画与主体占比，颜色使用 Nav-Bridge 主题色：
  - 浅色模式：桥体 `#42a5f5`，数据流 `#66bb6a`
  - 深色模式：桥体 `#74b7ff`，数据流 `#9ee493`
  - 通过 SVG 内 `<style>` 与 `prefers-color-scheme` 媒体查询实现自动适配。
- 使用 Python + Pillow 程序化生成 `public/favicon.ico`，包含 16/32/48/64/128 像素多尺寸，确保 Windows 与浏览器 tab 均清晰显示。

> 注：`public/` 目录当前不存在，需要新建。electron-vite 会自动将其中的资源复制到构建输出根目录，并可通过根路径 `/` 访问。

> 注：`public/` 目录当前不存在，需要新建。electron-vite 会自动将其中的资源复制到构建输出根目录，并可通过根路径 `/` 访问。

### 标题栏实现

修改 `src/renderer/components/AppTitleBar.tsx`：

- 删除 `ElectronLogoPlaceholder` 组件。
- 在标题栏左侧、应用名称之前渲染 `<img src="/logo.svg" alt="" />`。
- 图片尺寸增大至 22px，以提升视觉显著性。
- 保持 `aria-hidden="true"` 或空 `alt`，因为应用名称文本已提供可访问标签。
- 保持现有 `Stack` 间距和垂直对齐方式不变。
- `public/logo.svg` 内部已使用 Nav-Bridge 主题色，无需在组件中额外处理颜色。

### 应用图标实现

1. **页面 favicon**：在 `index.html` 和 `monitor.html` 的 `<head>` 中添加：

   ```html
   <link rel="icon" type="image/x-icon" href="/favicon.ico" />
   ```

2. **Electron 窗口图标**：在 `src/main/windowOptions.ts` 的 `createMainWindowOptions()` 返回的对象中添加：
   ```ts
   icon: join(__dirname, "../renderer/favicon.ico");
   ```
   生产构建时，`public/favicon.ico` 会位于 `out/renderer/favicon.ico`，而主进程入口在 `out/main/index.js`，因此 `__dirname` 向上跳一级即可定位。

### 内容安全策略

当前 CSP 包含 `img-src 'self' data:`，`/logo.svg` 和 `/favicon.ico` 均属于同源 `'self'`，无需调整。

### 测试更新

修改 `src/test/renderer/appTitleBar.test.ts`：

- 原断言 `expect(source).toContain("ElectronLogoPlaceholder")` 不再适用。
- 改为断言标题栏中包含 logo 图片引用，例如：
  ```ts
  expect(source).toContain("/logo.svg");
  ```
- 保留对 `__APP_VERSION__` 和 `V{__APP_VERSION__}` 的断言。

## 验收标准

- [ ] `public/logo.svg` 存在，采用悬索桥 + 数据流设计并使用 Nav-Bridge 主题色；`public/favicon.ico` 存在且为同一主题多尺寸图标。
- [ ] 标题栏左侧显示新 logo，不再显示电子轨道占位符。
- [ ] `index.html` 与 `monitor.html` 包含 favicon 链接。
- [ ] `createMainWindowOptions()` 返回的对象包含 `icon` 字段。
- [ ] `pnpm test` 全部通过。
- [ ] `pnpm build` 成功，且构建产物中可找到 `out/renderer/favicon.ico` 与 `out/renderer/logo.svg`。

## 范围外

- 不新增启动画面、关于对话框或其他品牌页面。
- 不调整主题色或现有布局间距。
