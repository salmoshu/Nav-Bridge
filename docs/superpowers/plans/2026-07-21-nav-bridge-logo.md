# Nav-Bridge 增加 Logo 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Nav-Bridge 添加以“桥”为主题的新 logo，并同时用作标题栏图标、页面 favicon 与 Electron 窗口图标。

**架构：** 在 `public/` 放置 `logo.svg`（悬索桥 + 数据流 SVG）与 `favicon.ico`（同一主题多尺寸图标）；标题栏通过 `<img src="/logo.svg">` 引用；HTML 添加 favicon 链接；主进程窗口选项设置 `icon` 字段；同步更新相关测试。

**技术栈：** React + MUI + TypeScript + Electron + electron-vite

---

## 文件清单

- **创建** `public/logo.svg`：悬索桥 + 数据流主题 logo（透明背景，支持深浅色模式）。
- **创建** `public/favicon.ico`：同一主题多尺寸应用图标（16/32/48/64/128）。
- **修改** `src/renderer/components/AppTitleBar.tsx`：删除 `ElectronLogoPlaceholder`，改为引用 `/logo.svg`。
- **修改** `index.html`：添加 `<link rel="icon">`。
- **修改** `monitor.html`：添加 `<link rel="icon">`。
- **修改** `src/main/windowOptions.ts`：为主窗口添加 `icon` 属性。
- **修改** `src/test/renderer/appTitleBar.test.ts`：将 `ElectronLogoPlaceholder` 断言改为 `/logo.svg` 断言。

---

## 任务 1：准备 logo 资源

**文件：**

- 创建：`public/logo.svg`
- 创建：`public/favicon.ico`

- [ ] **步骤 1：创建桥主题 SVG logo**

  写入 `public/logo.svg`：

  ```svg
  <?xml version="1.0" encoding="UTF-8"?>
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <style>
      :root {
        --bridge: #42a5f5;
        --stream: #66bb6a;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bridge: #74b7ff;
          --stream: #9ee493;
        }
      }
    </style>

    <!-- 悬索桥塔 -->
    <path d="M28 16 v88 M100 16 v88" stroke="var(--bridge)" stroke-width="12" stroke-linecap="round"/>
    <!-- 主缆 -->
    <path d="M28 26 C46 42, 82 42, 100 26" fill="none" stroke="var(--bridge)" stroke-width="10" stroke-linecap="round"/>
    <!-- 桥面 -->
    <path d="M20 96 h88" stroke="var(--bridge)" stroke-width="12" stroke-linecap="round"/>

    <!-- 数据流 -->
    <path d="M34 82 h12 M56 82 h12 M78 82 h12" stroke="var(--stream)" stroke-width="8" stroke-linecap="round"/>
  </svg>
  ```

- [ ] **步骤 2：生成多尺寸 favicon.ico**

  使用 Python + Pillow 程序化生成 16/32/48/64/128 像素多尺寸图标：

  ```bash
  python tmp/logo-concepts/generate_favicon.py
  ```

- [ ] **步骤 3：验证资源文件存在**

  运行命令：

  ```bash
  ls -la public/
  ```

  预期：`public/logo.svg` 与 `public/favicon.ico` 均存在。

- [ ] **步骤 4：Commit**

  ```bash
  git add public/logo.svg public/favicon.ico
  git commit -m "feat(assets): add Nav-Bridge themed logo and favicon"
  ```

---

## 任务 2：更新标题栏组件

**文件：**

- 修改：`src/renderer/components/AppTitleBar.tsx`

- [ ] **步骤 1：编写失败的测试（先更新测试文件）**

  修改 `src/test/renderer/appTitleBar.test.ts` 第 19-24 行：

  ```ts
  it("renders the logo image and version text next to the title", () => {
    expect(source).toContain("/logo.svg");
    expect(source).toContain("__APP_VERSION__");
    expect(source).toContain("V{__APP_VERSION__}");
    expect(source).not.toContain('APP_VERSION = "V0.0.1-20260708"');
  });
  ```

  运行命令：

  ```bash
  yarn test src/test/renderer/appTitleBar.test.ts
  ```

  预期：FAIL，因为 AppTitleBar.tsx 尚未引用 `/logo.svg`。

- [ ] **步骤 2：修改 AppTitleBar.tsx**

  1. 删除 `ElectronLogoPlaceholder` 函数组件（第 11-34 行）。
  2. 在标题栏左侧渲染 logo 图片。将原：
     ```tsx
     <ElectronLogoPlaceholder />
     ```
     替换为：
     ```tsx
     <Box
       component="img"
       src="/logo.svg"
       alt=""
       width={22}
       height={22}
       sx={{ display: "block" }}
       aria-hidden="true"
     />
     ```
  3. 由于删除了 `useTheme` 在 `ElectronLogoPlaceholder` 中的使用，检查 `AppTitleBar` 本身是否仍需要 `useTheme`。当前 `AppTitleBar` 中 `theme` 变量用于 `isAlwaysOnTop` 状态的颜色判断，因此保留 `useTheme` 调用。

- [ ] **步骤 3：运行测试验证通过**

  运行命令：

  ```bash
  yarn test src/test/renderer/appTitleBar.test.ts
  ```

  预期：PASS。

- [ ] **步骤 4：Commit**

  ```bash
  git add src/renderer/components/AppTitleBar.tsx src/test/renderer/appTitleBar.test.ts
  git commit -m "feat(ui): replace title bar placeholder with themed logo"
  ```

---

## 任务 3：添加页面 favicon

**文件：**

- 修改：`index.html`
- 修改：`monitor.html`

- [ ] **步骤 1：修改 index.html**

  在 `<head>` 中 `<title>` 之前或之后添加：

  ```html
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  ```

- [ ] **步骤 2：修改 monitor.html**

  在 `<head>` 中 `<title>` 之前或之后添加同样的 link 标签：

  ```html
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  ```

- [ ] **步骤 3：验证 HTML**

  运行命令：

  ```bash
  grep -n "favicon.ico" index.html monitor.html
  ```

  预期：两个文件均显示包含 `/favicon.ico` 的行。

- [ ] **步骤 4：Commit**

  ```bash
  git add index.html monitor.html
  git commit -m "feat(html): add favicon link to main and monitor windows"
  ```

---

## 任务 4：设置 Electron 窗口图标

**文件：**

- 修改：`src/main/windowOptions.ts`

- [ ] **步骤 1：修改 createMainWindowOptions**

  在返回的对象中添加 `icon` 字段：

  ```ts
  return {
    width: appWindowWidth,
    height: appWindowDefaultHeight,
    minWidth: appWindowWidth,
    maxWidth: appWindowWidth,
    minHeight: appWindowMinHeight,
    maxHeight: appWindowMaxHeight,
    resizable: false,
    title: "Nav-Bridge",
    icon: join(__dirname, "../renderer/favicon.ico"),
    frame: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
  ```

  说明：`__dirname` 在打包后主进程入口为 `out/main/`，`out/renderer/favicon.ico` 相对于它为 `../renderer/favicon.ico`。

- [ ] **步骤 2：检查类型**

  运行命令：

  ```bash
  yarn typecheck
  ```

  预期：无类型错误。

- [ ] **步骤 3：Commit**

  ```bash
  git add src/main/windowOptions.ts
  git commit -m "feat(main): set window icon for main BrowserWindow"
  ```

---

## 任务 5：综合验证

- [ ] **步骤 1：运行全部测试**

  运行命令：

  ```bash
  yarn test
  ```

  预期：所有测试通过。

- [ ] **步骤 2：运行构建**

  运行命令：

  ```bash
  yarn build
  ```

  预期：构建成功，无错误。

- [ ] **步骤 3：确认构建产物中的资源**

  运行命令：

  ```bash
  ls -la out/renderer/logo.svg out/renderer/favicon.ico
  ```

  预期：两个文件均存在。

- [ ] **步骤 4：格式检查（可选但推荐）**

  运行命令：

  ```bash
  yarn format:check
  ```

  预期：无格式问题；如有，运行 `yarn format` 修复。

---

## 自检

- **规格覆盖度：** 标题栏 logo、页面 favicon、窗口图标、测试更新、资源颜色区分均已覆盖。
- **占位符扫描：** 无 TODO、待定或模糊步骤。
- **类型一致性：** `join` 已在 `src/main/windowOptions.ts` 中导入；`icon` 类型为 `string` 或 `NativeImage`，字符串路径符合 `BrowserWindowConstructorOptions` 定义。
