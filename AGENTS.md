# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills），技能位于 `.agents/skills/`。该目录结构同时面向 Kimi Code CLI 和 Codex 使用。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill**：根据 skill 的 `description` 判断是否适用；如果适用，必须遵循对应 `SKILL.md` 的指引。
2. **设计先于编码**：收到功能需求时，先用 `brainstorming` skill 做需求分析。
3. **测试先于实现**：写代码前先写测试，遵循 TDD。
4. **验证先于完成**：声称完成前必须运行验证命令，并确认输出支持结论。

## 平台兼容说明

### Kimi Code CLI

Kimi Code CLI 会根据每个 skill 的 `description` 自动匹配并加载相关技能。当技能已加载到上下文后，直接遵循其内容即可。

### Codex

Codex 会从当前会话可用技能列表中识别 `.agents/skills/*/SKILL.md`。当某个 skill 适用于当前任务时，应先读取该 skill 的 `SKILL.md`，再按其中流程执行。

如果 skill 中出现其他平台的工具名，请使用 Codex 当前环境中的等价能力：

- `TodoWrite` / `SetTodoList`：使用 Codex 的计划或任务跟踪能力。
- `Task` / `Agent`：使用 Codex 可用的子代理或多代理能力；如果当前环境未暴露子代理工具，则在主会话中完成并说明限制。
- `Read` / `Write` / `Edit` / `Bash`：使用 Codex 对应的文件读取、编辑和命令执行工具。
- `EnterPlanMode` / `ExitPlanMode`：按当前 Codex 会话模式和用户要求处理；不能切换时，在当前模式中给出计划或继续执行。

更多 Codex 工具映射可参考 `.agents/skills/using-superpowers/references/codex-tools.md`。

## 可用 Skills

每个 skill 都位于 `.agents/skills/<skill-name>/SKILL.md`。

- **brainstorming**：在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**：中文代码审查规范——在保持专业严谨的同时，用符合国内团队文化的方式给出有效反馈。
- **chinese-commit-conventions**：中文 Git 提交规范——适配国内团队的 commit message 规范和 changelog 自动化。
- **chinese-documentation**：中文技术文档写作规范——排版、术语、结构一步到位，告别机翻味。
- **chinese-git-workflow**：适配国内 Git 平台和团队习惯的工作流规范——Gitee、Coding、极狐 GitLab、CNB 全覆盖。
- **dispatching-parallel-agents**：当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用。
- **executing-plans**：当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用。
- **finishing-a-development-branch**：当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾。
- **mcp-builder**：MCP 服务器构建方法论——系统化构建生产级 MCP 工具，让 AI 助手连接外部能力。
- **receiving-code-review**：收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行。
- **requesting-code-review**：完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求。
- **subagent-driven-development**：当在当前会话中执行包含独立任务的实现计划时使用。
- **systematic-debugging**：遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行。
- **test-driven-development**：在实现任何功能或修复 bug 时使用，在编写实现代码之前。
- **using-git-worktrees**：当需要开始与当前工作区隔离的功能开发或执行实现计划之前使用——创建具有智能目录选择和安全验证的隔离 git 工作树。
- **using-superpowers**：在开始任何对话时参考——确立如何查找和使用技能，确保技能匹配和严格执行。
- **verification-before-completion**：在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言。
- **workflow-runner**：在 Kimi Code CLI / Claude Code / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 `.yaml` 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**：当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前。
- **writing-skills**：当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用。

## 使用原则

如果你认为哪怕只有 1% 的可能性某个 skill 适用于当前任务，都应该先确认该 skill 是否可用；可用且适用时，必须遵循其流程。

跨平台使用时，以当前运行环境实际提供的工具为准，但不要跳过 skill 中要求的关键流程。例如：设计、TDD、调试、代码审查和完成前验证等流程要求仍然有效。
