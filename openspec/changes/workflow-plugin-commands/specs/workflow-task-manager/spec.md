## ADDED Requirements

### Requirement: 任务创建
系统 SHALL 根据计划通过 `bd create` 创建任务。

#### Scenario: 标准任务创建
- **WHEN** Agent 执行 `/workflow-task` 时
- **THEN** 按计划步骤创建对应的 bd 任务，设置正确的类型和优先级

#### Scenario: 任务 ID 分配
- **WHEN** 创建任务时
- **THEN** 使用 bd 返回的任务 ID 维护依赖关系

### Requirement: 依赖关系管理
系统 SHALL 使用 `bd dep add` 管理任务间的依赖关系。

#### Scenario: TDD 测试阻塞
- **WHEN** 创建实现任务时
- **THEN** 该任务被对应的测试任务阻塞（测试未通过，实现不能关闭）

#### Scenario: 验证任务依赖
- **WHEN** 计划步骤有 `Spec-task-ref` 时
- **THEN** 创建 Validate 任务，被对应的产出任务阻塞

#### Scenario: 大范围验证任务
- **WHEN** 计划步骤有 `Spec-ref` 时
- **THEN** 创建更大范围的 Validate 任务，验证从上一次验证点到当前的产出

### Requirement: 任务元数据同步
插件 SHALL 维护任务和依赖关系的元数据副本。

#### Scenario: 元数据文件
- **WHEN** 创建或更新任务时
- **THEN** 同步到 `.workflow/bd.md` 文件

#### Scenario: 依赖关系图
- **WHEN** 添加依赖时
- **THEN** 同时更新 `.workflow/bd.md` 中的依赖关系图

### Requirement: 验证任务生成规则
验证任务的生成 SHALL 遵循以下规则：

#### Scenario: Spec-task-ref 验证任务
- **WHEN** 计划标记 `Spec-task-ref: 2.2.1` 时
- **THEN** 创建 Validate-2.2.1 任务，被产出任务 2.2.1 阻塞

#### Scenario: Spec-ref 验证任务
- **WHEN** 计划标记 `Spec-ref: 2.2` 时
- **THEN** 创建 Validate-2.2 任务，被所有产出任务 2.2.x 阻塞

### Requirement: 任务执行顺序
系统 SHALL 确保任务按依赖顺序执行。

#### Scenario: 阻塞任务未完成
- **WHEN** Agent 尝试关闭被阻塞的任务时
- **THEN** 系统拒绝并提示先完成阻塞任务

#### Scenario: 就绪任务选择
- **WHEN** `bd ready` 返回多个任务时
- **THEN** 按优先级（数值升序）和 ID（字母序升序）选择