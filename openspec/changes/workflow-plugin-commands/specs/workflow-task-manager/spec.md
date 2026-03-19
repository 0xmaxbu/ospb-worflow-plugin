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

### Requirement: 任务命名规范
bd 任务 SHALL 遵循统一的命名规范，以便于校验和后续转化。

> **注意**: `bd create` 的 `-t` 标记必须为以下之一：`chore`、`task`、`feature`、`bug`、`epic`。出现其他类型标记为违规。

#### Scenario: 测试任务
- **WHEN** 创建测试类任务时
- **THEN** 标题以 `Test: ` 开头
- **EXAMPLE**: `Test: validate user authentication`

#### Scenario: 实现任务
- **WHEN** 创建实现类任务时
- **THEN** 标题以 `Impl: ` 开头
- **EXAMPLE**: `Impl: implement user login endpoint`

#### Scenario: 准备任务
- **WHEN** 创建准备/设置类任务时
- **THEN** 标题以 `Setup - ` 开头
- **EXAMPLE**: `Setup - configure test environment`

#### Scenario: 修复任务
- **WHEN** 创建修复类任务时
- **THEN** 标题以 `Fix: ` 开头
- **EXAMPLE**: `Fix: resolve session timeout issue`

#### Scenario: 验证任务
- **WHEN** 创建验证类任务时
- **THEN** 标题以 `Valid: ` 开头，用于标注"验证 Spec 设计/目标"的工作项
- **EXAMPLE**: `Valid: verify login flow matches spec`
- **说明**: 验证任务与测试任务是不同的核查活动，验证任务检查 Spec 符合性，测试任务检查代码正确性

#### Scenario: 任务类型强制
- **WHEN** 执行 `bd create` 时
- **THEN** `-t` 参数必须为 `chore`、`task`、`feature`、`bug`、`epic` 之一
- **WHEN** 参数为其他值时
- **THEN** 系统返回错误并拒绝创建任务

### Requirement: 任务描述字段
bd 任务的 `--description` 字段 SHALL 包含 Spec 追溯信息。

#### Scenario: 描述包含 Spec-ref
- **WHEN** 创建任务时
- **THEN** `--description` 必须包含 `Spec-ref: spec.md#requirement-name`
- **EXAMPLE**: `--description "Spec-ref: workflow-plugin-core/spec.md#init-workflow-tool"`
- **用途**: `verify-code` tool 读取此字段定位对应的 Spec 文档位置进行验证

#### Scenario: 验证任务描述
- **WHEN** 创建 `Valid:` 任务时
- **THEN** `--description` 包含对应的 Spec-task-ref 或 Spec-ref
- **EXAMPLE**: `--description "Spec-ref: workflow-plugin-core/spec.md#init-workflow-tool"`