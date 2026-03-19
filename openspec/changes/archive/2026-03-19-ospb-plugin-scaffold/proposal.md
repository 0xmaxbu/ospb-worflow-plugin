## Why

当前 `ospb-worflow-plugin` 项目仅包含 OpenCode 的命令和技能定义文件（`.opencode/command/` 和 `.opencode/skills/`），缺少实际的插件代码。这导致无法实现强制工作流验证、工具检查和初始化命令等功能。需要搭建 TypeScript 插件脚手架，使项目成为真正的可运行 OpenCode 插件。

## 关键研究结论

### subtask2 无法实现命令拦截

经过深入研究，发现：
- **subtask2** 是一个命令**编排**插件，支持链式调用、并行执行、返回链接
- 但它**不能**阻止或拦截命令执行
- `command.execute.before` hook 只能修改 `output.parts`，无法 throw Error

### 只有 Plugin 机制可以实现拦截

OpenCode 插件系统支持两种阻止机制：

1. **tool.execute.before + throw Error**
   ```typescript
   "tool.execute.before": async (input, output) => {
     if (/* 验证失败 */) {
       throw new Error("Workflow Violation: Cannot execute...");
     }
   }
   ```

2. **permission.ask（类型化拒绝）**
   ```typescript
   "permission.ask": async (input) => {
     return { status: "deny", reason: "..." };
   }
   ```

### 这意味着

要实现"验证失败时阻止 `bd claim` 错误 task"的功能，**必须**创建自定义 Plugin，不能依赖 subtask2。

## What Changes

- 添加 Monorepo 结构（使用 Turborepo 或 pnpm workspace）
- 创建核心插件包 `@ospb/plugin-core`，包含：
  - 工作流验证 Hooks
  - 外部工具检查（openspec CLI、beads）
  - 初始化命令实现
  - 强制验证阻塞机制
- 创建 CLI 包 `@ospb/cli`，提供交互式初始化命令
- 配置构建系统（TypeScript 编译、Bun/ESBuild）

## Capabilities

### New Capabilities

- `plugin-core`: 核心插件包，提供工作流验证和强制机制
  - 监听 `tool.execute.before` 验证工作流状态
  - 监听 `session.idle` 触发验证检查
  - 提供 `chat.params` 注入工作流状态
- `plugin-cli`: CLI 包，提供项目初始化功能
  - `ospb init` 命令：检查并初始化 openspec 和 beads
  - 交互式配置向导
- `plugin-commands`: 命令定义包，包含 `/ospx-propose`、`/opsx-apply` 等命令的 Markdown 定义

### Modified Capabilities

- 无（新建项目）

## Impact

- 新增 `packages/plugin-core/` 目录
- 新增 `packages/plugin-cli/` 目录
- 新增 `packages/plugin-commands/` 目录
- 修改 `package.json` 添加 workspaces 配置
- 添加构建配置文件（`tsconfig.json`、`turbo.json` 等）
