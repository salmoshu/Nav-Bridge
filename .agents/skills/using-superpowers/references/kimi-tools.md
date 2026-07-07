# Kimi Code CLI 工具映射

Skills 使用 Claude Code 的工具名称。在 Kimi Code CLI 中遇到这些名称时，请使用对应的平台等价工具：

| Claude Code 工具 | Kimi Code CLI 等价 |
|---|---|
| `Task` 工具（分派子智能体） | `Agent` 工具 |
| `TodoWrite`（任务跟踪） | `SetTodoList` |
| `Skill` 工具（加载技能） | 技能自动根据 description 匹配加载，无需手动调用 |
| `EnterPlanMode` / `ExitPlanMode` | `EnterPlanMode` / `ExitPlanMode`（名称相同） |

## 主要差异说明

### Agent 工具 vs Task 工具

Kimi Code CLI 使用 `Agent` 工具代替 Claude Code 的 `Task` 工具：

```typescript
// Claude Code
Task("修复登录 bug")

// Kimi Code CLI
Agent(description="修复登录 bug", prompt="...")
```

Kimi 的 `Agent` 工具支持 `subagent_type` 参数（`coder` 或 `explore`），并支持 `run_in_background=true` 进行并行分派。

### 技能加载机制

Kimi Code CLI **没有 `Skill` 工具**。技能通过以下方式自动加载：

1. **Metadata 匹配**：Kimi 读取所有可用技能的 `name` 和 `description`，根据用户请求自动决定加载哪些技能
2. **自动触发**：匹配的技能内容会自动加入上下文
3. **层级加载**：Built-in → User → Project，每层使用第一个存在的目录

项目级别技能目录：`.agents/skills/`

用户级别技能目录（按优先级）：
- `~/.config/agents/skills/`（推荐）
- `~/.kimi/skills/`
- `~/.claude/skills/`（兼容）

### SetTodoList  vs TodoWrite

Kimi 使用 `SetTodoList` 进行待办管理，与 Claude Code 的 `TodoWrite` 功能相同但名称不同。
