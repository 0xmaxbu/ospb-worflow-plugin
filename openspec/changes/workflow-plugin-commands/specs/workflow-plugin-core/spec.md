## ADDED Requirements

> **实现方式说明**:
> - 所有工作流工具使用 OpenCode Plugin SDK 的 `tool()` 函数实现为 TypeScript Tools
> - 工具注册在 `hooks.tool` 对象中，可通过 `/` 调用
> - OpenCode Agent 在执行过程中调用这些工具

### Requirement: 工作流工具调度器
系统 SHALL 提供工具调度器，根据工具名称路由到对应的处理函数。

#### Scenario: 识别有效工具
- **WHEN** Agent 调用 `/init-workflow`
- **THEN** 系统路由到初始化处理函数并执行

#### Scenario: 识别无效工具
- **WHEN** Agent 调用 `/unknown-tool`
- **THEN** 系统返回错误：未知工具

### Requirement: init-workflow 工具
init-workflow 工具 SHALL 按顺序执行以下操作：
1. 执行 `bd init --quiet` 初始化 beads 追踪
2. 执行 `openspec init --tools opencode` 初始化 openspec
3. 创建或更新 `openspec/config.yaml`，设置 `lang: zh`

#### Scenario: 首次初始化
- **WHEN** 在空目录执行 `/init-workflow`
- **THEN** bd 和 openspec 均初始化成功，config.yaml 语言设为中文

#### Scenario: 重复初始化
- **WHEN** 在已初始化的目录执行 `/init-workflow`
- **THEN** 跳过已完成的步骤，仅报告状态

### Requirement: workflow-explore 工具
workflow-explore 工具 SHALL 进入探索模式，与用户持续沟通需求并维护草案文件。

#### Scenario: 带参数探索
- **WHEN** Agent 调用 `/workflow-explore <需求描述>`
- **THEN** 启动探索 Agent (非 subAgent，直接与用户对话)，持续沟通需求直到清晰

#### Scenario: 无参数探索
- **WHEN** Agent 调用 `/workflow-explore` 无参数
- **THEN** 通过 question tool 向用户提问，获取需求描述

#### Scenario: 草案命名
- **WHEN** Agent 创建草案文件
- **THEN** 使用英文 kebab-case 名称作为文件名
- **NOTE**: 草案名称贯穿后续所有阶段

#### Scenario: 草案自动命名
- **WHEN** Agent 完成需求探索
- **THEN** 根据内容自动生成英文 kebab-case 文件名 (如 `user-authentication.md`)

### Requirement: workflow-propose 工具
workflow-propose 工具 SHALL 将草案转换为 OpenSpec 文档。

> **ProposeAgent 说明**: 启动 ProposeAgent (非 subAgent) 与用户沟通细节，直到用户满意

#### Scenario: 带参数执行
- **WHEN** Agent 调用 `/workflow-propose <draft-name>`
- **THEN** 指示 Agent 读取 `.workflow/drafts/<draft-name>.md`，启动 ProposeAgent

#### Scenario: 无参数执行
- **WHEN** Agent 调用 `/workflow-propose` 无参数
- **THEN** 读取 `.workflow/drafts/` 下所有草案，通过 question tool 让用户选择

#### Scenario: ProposeAgent 行为
- **WHEN** ProposeAgent 执行时
- **THEN** 与用户沟通 OpenSpec 文档的细节（范围、设计决策等），直到用户满意
- **THEN** 生成 OpenSpec artifacts: proposal.md、design.md、specs/*

#### Scenario: 名称贯穿
- **WHEN** 生成 OpenSpec 时
- **THEN** 使用与草案相同的名称 (如 `user-authentication/`)
- **后续**: plan、task 阶段均使用同一名称

### Requirement: workflow-plan 工具
workflow-plan 工具 SHALL 将 OpenSpec 文档转换为可执行计划。

#### Scenario: 带参数执行
- **WHEN** Agent 调用 `/workflow-plan <change-name>`
- **THEN** 读取 `openspec/changes/<change-name>/` 下的 spec 文档

#### Scenario: 无参数执行
- **WHEN** Agent 调用 `/workflow-plan` 无参数
- **THEN** 读取 `openspec/changes/` 下所有 change，通过 question tool 让用户选择

#### Scenario: 计划细化原则
- **WHEN** Agent 生成计划时
- **THEN** 步骤粒度 SHALL 达到可独立验证、可执行的程度

#### Scenario: 计划标注来源
- **WHEN** Agent 记录计划步骤时
- **THEN** 标注 `Spec-task-ref` 或 `Spec-ref` 以追溯来源

#### Scenario: 自动触发审查
- **WHEN** 生成完整计划后
- **THEN** 通过 hook 调起 plan reviewer Agent 进行审查

### Requirement: workflow-task 工具
workflow-task 工具 SHALL 根据计划创建 bd 任务。

> **bd 调用说明**: bd 是外部 CLI 工具 (beads 包)，本工具通过 `$.bash()` 调用

#### Scenario: 带参数执行
- **WHEN** Agent 调用 `/workflow-task <plan-name>`
- **THEN** 读取 `.workflow/plans/<plan-name>.md`

#### Scenario: 无参数执行
- **WHEN** Agent 调用 `/workflow-task` 无参数
- **THEN** 读取 `.workflow/plans/` 下所有计划，通过 question tool 让用户选择

#### Scenario: 任务依赖管理
- **WHEN** 创建任务时
- **THEN** 使用 `bd dep add <blocked> <blocking>` 管理依赖关系

#### Scenario: TDD 强制执行
- **WHEN** 创建实现任务时
- **THEN** 该任务 SHALL 被对应的测试任务阻塞

#### Scenario: 验证任务生成
- **WHEN** 计划步骤有 `Spec-task-ref` 标注时
- **THEN** 创建 `Valid:` 任务，被对应的产出任务阻塞

### Requirement: workflow-start 工具
workflow-start 工具 SHALL 触发工作流执行模式。

#### Scenario: 触发执行
- **WHEN** Agent 调用 `/workflow-start`
- **THEN** 提示 Agent 执行 `bd ready` 查看就绪任务

#### Scenario: Valid 任务触发
- **WHEN** Agent 认领 `Valid:` 开头的验证任务时
- **THEN** 抛出错误，要求 Agent 必须先调用 `verify-code` tool

### Requirement: 工作流状态管理
系统 SHALL 维护当前工作流上下文，包括：
- 当前执行的工具
- 活动的工作流 ID
- 任务依赖图

#### Scenario: 状态持久化
- **WHEN** 每个阶段完成后
- **THEN** 状态同步到 bd 追踪系统