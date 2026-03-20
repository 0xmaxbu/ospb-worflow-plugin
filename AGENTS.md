# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Version-controlled: Built on Dolt with cell-level merge
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->

---

# OpenSpec Workflow Plugin - Core Commands

This plugin provides a structured workflow for building OpenCode plugins using OpenSpec + bd (beads).

## Command Reference

### /init-workflow

Initialize the workflow environment:
1. Run `bd init --quiet`
2. Run `openspec init --tools opencode`
3. In `openspec/config.yaml` (create if not exists), set language to Chinese (`lang: zh`)

---

### /workflow-explore

**Parameter:** User's requirement/idea

Enter explore mode where the Agent:
1. Analyzes and investigates the requirement
2. Reads project state and communicates with user to clarify the requirement
3. Maintains a markdown draft in `./workflow/drafts/` (English filename, words separated by hyphens, keep brief)

---

### /workflow-propose

**Parameter:** Draft name (optional - if omitted, shows all drafts via question tool)

Convert the draft to OpenSpec documents by calling the corresponding skill.

User can review the generated documents.

---

### /workflow-plan

**Parameter:** Spec change name (optional - if omitted, shows all spec changes via question tool)

Convert spec documents into more detailed plans:
- If requirement is small and spec is detailed enough, plan = spec
- **细化原则**: 步骤粒度达到可独立验证、可执行的程度（每个步骤产出明确、边界清晰）
- Plan steps must reference their Spec source
  - `Spec-task-ref`: Marks completion of a small Spec Task (record the ref)
  - `Spec-ref`: Marks completion of a larger task phase (record the ref)
- Save plan to `.workflow/plans/<spec-change-name>.md`

**Plan Review (自动触发):**
1. 生成完整 plan 后，通过 hook 调起审查方法（plan reviewer Agent）
2. 审查维度：
   - Plan 是否符合 Spec 设计
   - Plan 是否完整可落地
   - Plan 是否有设计错误/缺失会导致开发中断
3. 若有问题，通过 question tool 与用户沟通并修改
4. 审查方法会随使用情况持续调整优化

---

### /workflow-task

**Parameter:** Plan name (optional - if omitted, shows all plans via question tool)

Read the plan and create bd tasks via `bd create`.

**Dependency Management:**
- Use `bd dep add <blocked-task-id> <blocking-task-id>` to manage dependencies
- When plan step has `Spec-task-ref`: create a **Validate** task
  - Validate task is blocked by its corresponding产出任务
  - Validates that the phase output matches the Spec design
- When plan step has `Spec-ref`: also create a larger **Validate** task
  - Validates all output since the last Spec-ref/Validate task conforms to Spec Goal
  - These validate tasks should be handled by a dedicated review agent

**TDD Compliance:**
- All 产出/implementation tasks must be blocked by their corresponding test tasks
  - Write test first → then implement
  - Test task blocks implementation task

**Workflow Metadata:**
- Plugin maintains task and dependency relationships in `.workflow/bd.md`
- Load tasks into memory only when starting execution
- All task/dependency changes sync to bd tracking system

---

### /workflow-start

读取并执行 `bd ready` 任务（未来支持并行执行）。

**任务认领限制（强制）：**
Agent 在工作流执行期间，只能认领当前验证链上的任务。若插件监听到 Agent 尝试认领其他 `bd ready` 任务，立即拦截并报错，禁止切换。

**验证任务处理流程：**
当 Agent 认领验证任务时：
1. 插件立即**暂停 Agent 执行**
2. 插件调用 **codeReviewerAgent** 进行验证
3. 验证检查内容：
   - Spec-task-ref 验证任务：检查对应阶段产出是否符合 Spec 设计
   - Spec-ref 验证任务：检查上一次 Spec-ref 至今所有产出是否符合 Spec Goal
4. 验证完成后：
   - **失败**：将 codeReviewerAgent 的失败原因告知 Agent，自动 **reopen** 上一次 Spec-task-ref/Spec-ref 到失败验证点之间的所有任务，Agent 必须按依赖顺序重新认领并执行这些任务
   - **成功**：通知 Agent 可以继续认领并执行其他任务

**失败恢复（强制）：**
验证失败后，Agent 必须遵守以下强制规则：
1. 按依赖顺序重新认领相关任务（不能跳过或认领其他任务）
2. 从被 reopen 的第一个任务开始，顺序执行到验证任务
3. 插件全程监听任务认领，拦截任何违规的认领尝试

---

## Workflow Diagram

```
/init-workflow
      ↓
/workflow-explore ←→ User (requirement discussion)
      ↓
/workflow-propose
      ↓
/workflow-plan (review by plan reviewer)
      ↓
/workflow-task (creates bd tasks with dependencies)
      ↓
/workflow-start (executes tasks, validates, recovers from failures)
```

## Key Principles

1. **TDD Enforcement**: All implementation tasks must be blocked by their test tasks
2. **Validation Gates**: Validate tasks ensure spec compliance before proceeding
3. **Failure Recovery**: Automatically reopen and re-execute when validations fail
4. **Single Task Focus**: Only one workflow task at a time, no parallel claiming during workflow

---

## OpenCode Agents

This project defines several OpenCode agents for workflow orchestration and code review.

### Linus (Primary Agent - Workflow Orchestrator)

**Mode**: `primary`  
**Purpose**: Orchestrates the entire workflow by reading bd ready queue and调度任务

**Capabilities**:
- Reads `bd ready` queue to find available tasks
- Parses task types: `Impl` (implementation), `Test` (testing), `Valid` (validation)
- Uses **Task tool** to invoke SubAgents (coder, code-reviewer)
- Passes `Spec-ref` and context through prompt text
- Handles verification failure recovery by reopening failed tasks

**Invocation**: Triggered when user calls `/workflow-start` tool

**Agent Configuration** (in `opencode.json`):
```json
{
  "agents": {
    "linus": {
      "mode": "primary",
      "prompt": { "file": "prompts/agents/linus.txt" },
      "tools": ["read", "write", "edit", "bash", "bd"],
      "permission": {
        "task": {
          "coder": "allow",
          "code-reviewer": "allow",
          "plan-reviewer": "allow"
        }
      }
    }
  }
}
```

---

### Coder (SubAgent - Implementation Expert)

**Mode**: `subagent`  
**Purpose**: Implements code based on Spec requirements

**Capabilities**:
- Receives task description and `Spec-ref` from Linus
- Reads corresponding Spec document
- Implements code following TDD principles
- Handles failure context when retries are needed
- Commits git changes (if configured)

**Invocation**: Called by Linus via Task tool when encountering `Impl` tasks

**Failure Recovery**: When re-invoked after validation failure, receives:
- Previous failure reason
- code-reviewer's modification suggestions
- Applies fixes based on failure context

---

### plan-reviewer (SubAgent - Plan Quality Checker)

**Mode**: `subagent`  
**Purpose**: Reviews implementation plans for quality, spec compliance, and completeness

**Capabilities**:
- Verifies plan quality and structure
- Checks Spec compliance (all Requirements covered)
- Validates completeness (no missing steps)
- Ensures TDD compliance (tests block implementation)
- Checks dependency rationality (no cycles, correct order)

**Review Dimensions**:
1. **Spec 符合性** - Plan covers all Spec Requirements
2. **完整性** - No missing steps or edge cases
3. **可执行性** - Steps are granular and independently executable
4. **依赖合理性** - No circular dependencies, correct ordering
5. **TDD 合规性** - Test tasks block implementation tasks

**Invocation**: Automatically triggered after `workflow-plan` generates a plan

---

### code-reviewer (SubAgent - Implementation Verifier)

**Mode**: `subagent`  
**Purpose**: Verifies implementation against Spec requirements

**Capabilities**:
- Reads `Spec-ref` from task description
- Locates corresponding Spec document in `openspec/changes/<change>/specs/`
- Checks implementation against Spec line by line
- Returns detailed verification report with:
  - Problem severity levels (blocking, severe, medium)
  - Specific file paths and line numbers
  - Actionable fix suggestions

**Verification Types**:
- **Spec-task-ref validation**: Single task output vs Spec
- **Spec-ref validation**: Entire phase output vs Spec Goal

**Invocation**: Called by Linus via Task tool when encountering `Valid` tasks

---

## Testing Strategy

### OpenCode 插件测试方法

根据[官方插件开发指南](https://gist.github.com/rstacruz/946d02757525c9a0f49b25e316fbe715)，OpenCode 插件测试有三种方法：

#### 方法 1: 单元测试 (Mock 内部依赖)

使用 `vi.mock` + `vi.hoisted` 隔离内部模块：

```typescript
const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

import { executeBeforeHook } from './execute-before';
```

#### 方法 2: 使用 SDK Client 进行集成测试

```typescript
import { createOpencode } from '@opencode-ai/sdk';

// 启动本地 OpenCode 服务器
const opencode = await createOpencode();
const { client } = opencode;

// 测试插件加载和 Hook 执行
await client.session.prompt({ ... });

opencode.server.close();
```

#### 方法 3: bun link 本地插件测试

```bash
cd packages/plugin-core && bun link
cd /path/to/test-project && bun link @ospb/plugin-core
```

### 测试架构

```
┌─────────────────────────────────────────────────────────────┐
│                  SDK 集成测试 (Level 3)                      │
│        使用 createOpencode() 启动本地服务器 + SDK Client       │
│        测试 Hook 执行、会话交互、命令注册                       │
├─────────────────────────────────────────────────────────────┤
│                    单元测试 (Level 1-2)                     │
│        Vitest + vi.mock、YAML 结构验证                        │
│        纯函数逻辑、状态管理、工具检查                          │
└─────────────────────────────────────────────────────────────┘
```

### 测试矩阵

| 层级 | 测试内容 | 工具 | 覆盖目标 |
|-----|---------|------|---------|
| L1 单元 | Hooks、状态管理、工具函数 | Vitest + vi.mock | 80%+ 语句覆盖 |
| L2 验证 | YAML frontmatter、文件结构 | Vitest | 100% 文件 |
| L3 SDK | 插件加载、Hook 执行、会话事件 | Vitest + SDK Client | 关键路径 |

### Mock Context 工厂

```typescript
// tests/helpers/mock-context.ts
export function createMockContext(overrides?: Partial<PluginInput>): PluginInput {
  return {
    project: { id: 'test-project', worktree: '/tmp/test', vcs: 'git', name: 'test' },
    directory: '/tmp/test',
    worktree: '/tmp/test',
    client: createMockClient(),
    $: createMockShell(),
    ...overrides,
  };
}
```

### 测试执行

```bash
pnpm run test          # 运行所有测试
pnpm run test:unit     # 单元测试
pnpm run test:coverage # 覆盖率报告
```

<!-- END WORKFLOW PLUGIN -->
