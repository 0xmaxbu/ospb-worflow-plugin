## Context

当前 `ospb-worflow-plugin` 是一个 OpenCode 插件项目，用于规范化开发工作流。项目已包含：
- `.opencode/command/`：命令定义（Markdown）
- `.opencode/skills/`：技能定义（Markdown）
- `openspec/`：外部工作流工具配置

缺少核心插件代码，无法实现：
1. 工作流状态验证和强制
2. 外部工具检查（openspec CLI、beads）
3. 初始化命令

## Goals / Non-Goals

**Goals:**
- 建立 Monorepo 结构，支持多包管理
- 实现核心插件包，提供工作流验证 Hooks
- 实现 CLI 包，提供初始化命令
- 支持 npm 包发布

**Non-Goals:**
- 不实现完整的openspec CLI替代
- 不实现具体业务逻辑（那是使用此插件的项目的事）
- 不支持非 npm 分发（如直接复制文件使用）

## Decisions

### 1. 使用 Monorepo 结构（pnpm workspaces + Turborepo）

**选择原因**：
- 插件由多个逻辑模块组成（core、cli、commands）
- 独立版本管理和发布
- 共享构建配置和类型定义

**替代方案考虑**：
- 单仓库多包：增加发布复杂度
- Git Submodules：工具链复杂，不适合 npm 包

### 2. 使用 TypeScript + Bun 构建

**选择原因**：
- OpenCode 插件官方使用 TypeScript
- Bun 提供快速的构建和类型检查
- 原生支持 ESM 和 CJS

### 3. 插件架构：Hook-based

```typescript
// 核心验证 Hook
export default async (input: PluginInput) => {
  return {
    'tool.execute.before': validateWorkflowState,
    'chat.params': injectWorkflowContext,
    'session.idle': checkPendingValidations,
  };
};
```

**选择原因**：
- OpenCode 提供丰富的 Hook API
- 无需维护独立进程
- 与 OpenCode 生命周期集成

### 4. 强制验证机制（关键设计决策）

#### 研究发现：subtask2 无法实现命令拦截

经过对 subtask2 插件源码和 OpenCode 插件系统的深入研究，得出以下结论：

| 功能 | subtask2 | 自定义 Plugin |
|------|----------|---------------|
| 命令编排/链式执行 | ✅ 可以 | ✅ 可以 |
| 阻止/拦截命令执行 | ❌ **不行** | ✅ **可以** |
| 抛出错误阻止执行 | ❌ 不行 | ✅ `throw new Error()` |
| 类型化的拒绝机制 | ❌ 不行 | ✅ `permission.ask` |

**subtask2 的限制**：
- `command.execute.before` hook **只能修改** `output.parts`（注入并行任务）
- **不能**抛出错误来阻止命令执行
- 它是纯**编排型**插件，不具备拦截能力

#### OpenCode Plugin 拦截机制

OpenCode 插件系统支持两种阻止机制：

**方式 1: tool.execute.before + throw Error**
```typescript
"tool.execute.before": async (input, output) => {
  if (/* 验证失败 */) {
    throw new Error("Workflow Violation: Cannot execute until verification passes");
  }
}
```

**方式 2: permission.ask（类型化拒绝）**
```typescript
"permission.ask": async (input) => {
  if (!workflowValidated()) {
    return { 
      status: "deny", 
      reason: "Must verify current task before claiming new one" 
    };
  }
  return { status: "allow" };
}
```

#### 本插件的拦截设计

对于 `bd claim` 等命令拦截需求：

```typescript
// 在 tool.execute.before 中拦截 bd 命令
"tool.execute.before": async (input, output) => {
  // 1. 检查是否是 bd 相关命令
  const isBash = input.tool === "bash";
  const isBdCommand = output.args?.command?.includes("bd claim");
  
  if (isBash && isBdCommand) {
    // 2. 获取当前工作流状态
    const state = await getWorkflowState();
    
    // 3. 验证是否允许执行
    if (!state.currentTaskVerified && state.requiresVerification) {
      throw new Error(
        `🚫 Workflow Violation: Cannot claim task until current task is verified.
Current: ${state.currentTask}
Status: ${state.status}
Required: Complete verification first.`
      );
    }
  }
}
```

#### Workflow Guard vs subtask2

| 场景 | 使用 Workflow Guard | 使用 subtask2 |
|------|-------------------|---------------|
| 命令链编排 | ❌ 不适合 | ✅ 适合 |
| 并行任务执行 | ❌ 不适合 | ✅ 适合 |
| **拦截/阻止命令** | ✅ **唯一方案** | ❌ 不行 |
| 工作流状态强制 | ✅ 可以 | ❌ 不行 |

**结论**：本插件需要实现独立的 Workflow Guard 机制（基于 `tool.execute.before`），而 subtask2 可作为补充工具用于复杂的命令链场景。

### 5. SubAgent 并行执行架构

#### 设计原则

1. **主控 Agent 负责任务编排**
   - 主控 Agent 负责任务分解、调度、结果汇总
   - 不执行具体实现，只做协调

2. **SubAgent 并行执行**
   - 主控 Agent 调用多个 SubAgent 并行工作
   - 每个 SubAgent 独立完成分配的任务
   - 结果返回主控 Agent 汇总

3. **Code Review SubAgent 验证机制**
   - 插件调用 Code Review SubAgent 执行验证
   - 验证通过后移交流程控制权
   - 验证失败阻止进入下一阶段

#### TDD 工作流中的 SubAgent 协作

```
主控 Agent
    │
    ├──> SubAgent-A: 编写单元测试 (TDD Red)
    │       │
    │       └──> Code Review SubAgent: 验证测试质量
    │               │
    │               └──> 返回主控 Agent (测试通过)
    │
    ├──> SubAgent-B: 并行编写另一模块测试
    │       │ ...
    │
    ▼
主控 Agent 汇总所有测试结果
    │
    ▼
并行实现阶段
    ├──> SubAgent-A: 实现功能让测试通过
    ├──> SubAgent-B: 并行实现另一功能
    │
    ▼
Code Review SubAgent: 验证实现正确性
```

#### 代码示例

```typescript
// 主控 Agent 调用模式
const results = await Promise.all([
  subagent('impl', { task: 'module-a-test', parallel: true }),
  subagent('impl', { task: 'module-b-test', parallel: true }),
]);

// Code Review SubAgent 调用
const reviewResult = await subagent('code-reviewer', {
  code: implementation,
  tests: unitTests,
  standards: workflowStandards,
});

// 验证通过后继续
if (reviewResult.status === 'passed') {
  continueToNextPhase();
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| OpenCode Hook API 变更 | 锁定 `@opencode-ai/plugin` 版本，监控官方更新 |
| 验证逻辑影响性能 | 仅在必要时执行检查，使用缓存 |
| 用户绕过验证 | 在错误信息中说明后果，提供紧急绕过选项（需确认） |

## Migration Plan

1. 发布 v0.1.0-alpha 到 npm（测试版本）
2. 用户通过 `opencode.json` 配置使用
3. 收集反馈，迭代改进
4. 稳定后发布 v1.0.0

## Open Questions

1. **验证任务的存储方式**：beads task 状态 vs 内存 vs 文件
2. **多项目支持**：插件如何区分不同项目的工作流
3. **CLI 交互方式**：纯命令 vs 交互式向导
4. **subtask2 集成策略**：是否将 subtask2 作为可选依赖，用于复杂命令链场景

## Research Notes

### OpenCode 插件拦截能力验证

**来源**：官方文档 + 源码分析

1. **tool.execute.before 可以阻止执行**
   - 通过 `throw new Error()` 阻止工具执行
   - 示例：`EnvProtection` 插件阻止读取 `.env` 文件

2. **permission.ask 提供类型化拒绝**
   - 返回 `{ status: "deny", reason: "..." }`
   - 唯一具备明确拒绝语义的 Hook

3. **subtask2 命令编排能力**
   - 源码：`index.ts` 中的 `command.execute.before` 只修改 `output.parts`
   - 无法 throw 错误，只能添加并行任务

**参考资源**：
- 官方文档：https://opencode.ai/docs/plugins/
- subtask2 源码：https://github.com/spoons-and-mirrors/subtask2
- PR #7563：插件命令暴露为 slash commands
