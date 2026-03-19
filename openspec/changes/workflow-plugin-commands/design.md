## Context

当前 Agent 在执行开发任务时缺乏标准化的工作流支持。主要问题包括：

1. **任务来源混乱**：口头指派 vs 系统追踪混用
2. **TDD 难以贯彻**：测试与实现顺序无法强制
3. **验证机制缺失**：缺乏阶段性验证和失败恢复
4. **依赖管理缺失**：任务间依赖关系不明

OpenSpec 提供了需求→规格→任务的文档化流程，但缺乏与执行层的集成。bd (beads) 提供了任务追踪系统，但缺乏与 OpenSpec 的联动。

## Goals / Non-Goals

**Goals:**
- 建立从需求到任务执行的完整闭环
- 通过任务依赖强制 TDD 流程（测试任务阻塞实现任务）
- 实现阶段性验证机制（Spec-task-ref 和 Spec-ref 验证点）
- 支持验证失败后的自动恢复

**Non-Goals:**
- 不实现并行任务执行（v1.0）
- 不替代 OpenSpec CLI（仅调用）
- 不替代 bd CLI（仅调用）

## Decisions

### 决策 1：命令架构

**选择**：每个工作流命令对应一个独立的 `.md` 文件在 `.opencode/commands/` 下

**理由**：
- 符合 OpenCode 命令定义规范
- 便于版本控制和文档化
- 每个命令职责单一，易于维护

**替代方案**：
- 单一命令入口 + 参数分发 → 增加复杂度，不符合 OpenCode 惯例

### 决策 2：任务依赖管理

**选择**：使用 `bd dep add` 管理任务依赖，插件维护 `.workflow/bd.md` 作为元数据副本

**理由**：
- 利用 bd 现有依赖管理能力
- `.workflow/bd.md` 提供工作流视角的依赖总览
- 解耦：bd 是事实来源，.workflow/bd.md 是视图

**替代方案**：
- 仅使用 `.workflow/bd.md` → 失去 bd 的 ready 任务检测能力

### 决策 3：验证流程

**选择**：验证任务触发时暂停 Agent，调起 codeReviewerAgent

**理由**：
- 验证是代码审查性质，适合独立 Agent 执行
- 避免 Agent 自我验证的主观性
- 可插拔：未来可替换为其他验证 Agent

### 决策 4：失败恢复

**选择**：验证失败时自动 reopen 从上一个 Spec-task-ref/Spec-ref 到失败点之间的所有任务

**理由**：
- 确保验证链完整性
- 强制 Agent 按顺序修复，而不是跳过
- 保留失败上下文，便于调试

## Risks / Trade-offs

**[Risk]** Agent 在验证失败后可能尝试跳过被 reopen 的任务

→ **Mitigation**：插件监听任务认领，拦截违规认领并报错

**[Risk]** codeReviewerAgent 验证标准可能与 Agent 理解有偏差

→ **Mitigation**：审查方法持续调整，通过 hook 机制迭代优化

**[Risk]** 长时间运行的工作流可能丢失上下文

→ **Mitigation**：每个阶段结束后同步到 bd，`.workflow/bd.md` 维护完整状态

## Open Questions

1. codeReviewerAgent 的验证标准如何精确定义？
2. 如何处理验证任务本身失败的情况？
3. 插件如何检测 Agent 是否在"验证链"上？