## ADDED Requirements

### Requirement: 任务认领监听
插件 SHALL 监听 Agent 的任务认领行为。

#### Scenario: 正常任务认领
- **WHEN** Agent 认领非验证任务时
- **THEN** 允许执行

#### Scenario: 验证任务认领
- **WHEN** Agent 认领验证任务时
- **THEN** 插件立即暂停 Agent 执行

### Requirement: codeReviewerAgent 验证
系统 SHALL 在验证任务时调起 codeReviewerAgent。

#### Scenario: 验证任务触发
- **WHEN** Agent 认领验证任务
- **THEN** 插件调用 codeReviewerAgent 进行验证

#### Scenario: 验证内容 - Spec-task-ref
- **WHEN** 验证 Spec-task-ref 任务时
- **THEN** 检查对应阶段产出是否符合 Spec 设计

#### Scenario: 验证内容 - Spec-ref
- **WHEN** 验证 Spec-ref 任务时
- **THEN** 检查上一次 Spec-ref 至今所有产出是否符合 Spec Goal

### Requirement: 验证结果处理
系统 SHALL 根据验证结果执行不同流程。

#### Scenario: 验证成功
- **WHEN** codeReviewerAgent 验证通过时
- **THEN** 通知 Agent 可以继续认领并执行其他任务

#### Scenario: 验证失败
- **WHEN** codeReviewerAgent 验证失败时
- **THEN** 将失败原因告知 Agent，并执行失败恢复流程

### Requirement: 失败恢复流程
验证失败后 SHALL 执行以下恢复流程：

#### Scenario: 任务 reopen
- **WHEN** 验证失败时
- **THEN** 插件自动 reopen 从上一次 Spec-task-ref/Spec-ref 到失败验证点之间的所有任务

#### Scenario: 顺序执行强制
- **WHEN** 验证失败后
- **THEN** Agent 必须按依赖顺序重新认领并执行被 reopen 的任务

#### Scenario: 认领拦截
- **WHEN** 验证失败后 Agent 尝试认领其他 `bd ready` 任务时
- **THEN** 插件拦截并返回错误

### Requirement: 验证链维护
系统 SHALL 维护验证链的上下文。

#### Scenario: 当前验证点跟踪
- **WHEN** Agent 处于验证链中时
- **THEN** 记录当前验证点和上一个验证点

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