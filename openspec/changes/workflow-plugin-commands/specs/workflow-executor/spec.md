## ADDED Requirements

### Requirement: 任务认领监听
插件 SHALL 监听 Agent 的任务认领行为。

#### Scenario: 正常任务认领
- **WHEN** Agent 执行 `bd update <id> --claim` 认领非验证任务时
- **THEN** 允许执行

#### Scenario: 验证任务认领
- **WHEN** Agent 认领 `Valid:` 开头的验证任务时
- **THEN** 抛出错误，要求 Agent 必须先调用 `verify-code` tool

### Requirement: verify-code Tool 验证
系统 SHALL 通过 `verify-code` Tool 执行验证。

> **实现说明**: Issue #5894 确认 `tool.execute.before` 不拦截 subagent 工具调用，故采用 Tool 方案而非直接阻断+启动 subagent

#### Scenario: 验证任务触发
- **WHEN** Agent 认领 `Valid:` 任务并调用 `verify-code` tool 时
- **THEN** 解析任务 `--description` 中的 `Spec-ref`，读取对应 Spec 文档位置

#### Scenario: 验证内容 - Spec-task-ref
- **WHEN** 验证 `Spec-task-ref` 任务时
- **THEN** 检查对应阶段产出是否符合 Spec 设计

#### Scenario: 验证内容 - Spec-ref
- **WHEN** 验证 `Spec-ref` 任务时
- **THEN** 检查上一次 `Spec-ref` 至今所有产出是否符合 Spec Goal

### Requirement: 验证结果处理
系统 SHALL 根据验证结果执行不同流程。

#### Scenario: 验证成功
- **WHEN** `verify-code` tool 返回通过时
- **THEN** 标记任务为完成，通知 Agent 可以继续

#### Scenario: 验证失败
- **WHEN** `verify-code` tool 返回失败时
- **THEN** 将失败原因告知 Agent，并执行失败恢复流程

### Requirement: 失败恢复流程
验证失败后 SHALL 执行以下恢复流程：

#### Scenario: 任务 reopen
- **WHEN** 验证失败时
- **THEN** 插件执行 `$.bash('bd reopen <task-id>')` 重新打开从上一次 `Spec-task-ref/Spec-ref` 到失败验证点之间的所有任务

#### Scenario: 顺序执行强制
- **WHEN** 验证失败后
- **THEN** Agent 必须按依赖顺序重新认领并执行被 reopen 的任务

#### Scenario: 认领拦截
- **WHEN** 验证链执行期间 Agent 尝试认领非 `Valid:` 任务时
- **THEN** 插件拦截并返回错误

### Requirement: 验证链维护
系统 SHALL 维护验证链的上下文。

#### Scenario: 当前验证点跟踪
- **WHEN** Agent 处于验证链中时
- **THEN** 记录当前 `Valid:` 任务 ID 和上一个成功验证点

#### Scenario: 验证上下文传递
- **WHEN** 重新执行被 reopen 的任务时
- **THEN** 验证失败原因应传递给 Agent

### Requirement: 验证任务完成条件
验证任务 SHALL 在以下条件满足时完成：

#### Scenario: 产出检查
- **WHEN** 验证任务执行时
- **THEN** 检查对应的产出文件/目录是否存在

#### Scenario: 规格对照
- **WHEN** 验证任务执行时
- **THEN** 对照 spec.md 检查产出是否符合设计