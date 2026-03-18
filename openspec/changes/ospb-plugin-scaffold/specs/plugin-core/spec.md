## ADDED Requirements

### Requirement: 插件入口初始化

插件包 SHALL 提供默认导出的异步函数作为 OpenCode 插件入口。当 OpenCode 加载插件时，该函数接收 PluginInput 并返回包含 Hook 实现的对象。

### Requirement: 工作流状态验证

插件 SHALL 通过 `tool.execute.before` Hook 验证当前工作流状态。在工具执行前，插件 SHALL 检查是否存在未完成的验证任务。如果存在未完成验证，插件 SHALL **通过抛出 Error 阻止工具执行**，并返回错误信息指导用户。

#### Implementation Notes

**验证方式**：使用 `throw new Error()` 阻止执行
- OpenCode 插件系统支持在 `tool.execute.before` 中抛出错误
- 错误信息将显示给用户，阻止命令执行

**验证范围**：
- `bd claim` 命令：检查当前 task 是否已验证
- `bash` 工具：检查是否在禁止操作列表中
- 其他工具：根据工作流状态判断

#### Alternative Considered: permission.ask

`permission.ask` Hook 提供类型化的拒绝机制 (`status: "deny"`)，
但当前设计选择 `tool.execute.before + throw` 因为：
- 更广泛的工具覆盖范围
- 更直接的控制流

### Requirement: 工作流上下文注入

插件 SHALL 通过 `chat.params` Hook 注入当前工作流状态到系统提示词。注入内容 SHALL 包括当前项目名称、活跃变更、待验证任务数量。

### Requirement: 会话结束验证检查

插件 SHALL 通过 `session.idle` Hook 检测会话空闲。当会话空闲时，插件 SHALL 检查是否存在待验证的工作流步骤，并提示用户进行验证。

### Requirement: 外部工具检查

插件 SHALL 提供工具检查功能，在初始化时验证 `openspec` CLI 和 `beads` 是否已安装。如果工具缺失，插件 SHALL 返回错误信息并提示用户安装。

### Requirement: 验证任务状态存储

插件 SHALL 维护当前会话的验证任务状态。状态 SHALL 包括每个 Spec 步骤的验证结果（待验证、通过、失败）。状态 SHALL 在会话压缩时被保留。

#### Scenario: 验证任务状态持久化

- **WHEN** 会话被压缩（compaction）时
- **THEN** 插件 SHALL 通过 `experimental.session.compacting` Hook 将验证状态注入到压缩上下文

#### Scenario: 验证失败阻止继续

- **WHEN** 用户尝试执行工具时存在验证失败的任务
- **THEN** 插件 SHALL 返回错误，阻止工具执行
- **AND** 错误信息 SHALL 包含失败的 Spec 步骤和失败原因

#### Scenario: 验证通过允许继续

- **WHEN** 用户执行工具且所有关联验证通过
- **THEN** 插件 SHALL 允许工具正常执行

#### Scenario: 外部工具缺失

- **WHEN** 插件初始化时检测到 openspec 或 beads 未安装
- **THEN** 插件 SHALL 记录警告日志
- **AND** SHALL 提供安装提示信息

## ADDED Requirements

### Requirement: Workflow Guard 拦截机制

插件 SHALL 实现独立的 Workflow Guard 机制，通过 `tool.execute.before` Hook 拦截禁止的操作。

#### Scenario: 拦截 bd claim 命令

- **WHEN** Agent 尝试执行 `bd claim` 命令时存在未验证的当前任务
- **THEN** 插件 SHALL 抛出 Error
- **AND** 错误信息 SHALL 包含：
  - 当前任务 ID 和名称
  - 当前验证状态
  - 要求的操作指导

#### Scenario: 验证失败阻止 bash 命令

- **WHEN** Agent 尝试执行禁止的 bash 命令
- **THEN** 插件 SHALL 抛出 Error
- **AND** SHALL 提供合法的替代方案

### Requirement: subtask2 兼容性

插件 SHALL 与 subtask2 插件共存：
- 不修改 subtask2 的 Hook 处理
- 独立实现拦截逻辑
- 在需要复杂命令链时，可与 subtask2 协同工作
