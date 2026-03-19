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

#### Scenario: 启动探索
- **WHEN** Agent 调用 `/workflow-explore 用户想要XXX`
- **THEN** Agent 在 `./workflow/drafts/` 下创建 markdown 草案文件

#### Scenario: 草案命名
- **WHEN** Agent 需要创建草案文件
- **THEN** 使用全英文名称，单词之间用 `-` 连接

### Requirement: workflow-propose 工具
workflow-propose 工具 SHALL 将草案转换为 OpenSpec 文档。

#### Scenario: 指定草案转换
- **WHEN** Agent 调用 `/workflow-propose draft-name`
- **THEN** 读取草案内容，调用 openspec 技能生成 proposal.md、design.md、specs

#### Scenario: 无参数执行
- **WHEN** Agent 调用 `/workflow-propose` 无参数
- **THEN** 通过 question tool 显示所有可用草案供用户选择

### Requirement: workflow-plan 工具
workflow-plan 工具 SHALL 将 OpenSpec 文档转换为可执行计划。

#### Scenario: 指定 spec change 转换计划
- **WHEN** Agent 调用 `/workflow-plan change-name`
- **THEN** 读取对应的 spec 文档，生成 `.workflow/plans/change-name.md`

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

#### Scenario: 指定计划创建任务
- **WHEN** Agent 调用 `/workflow-task plan-name`
- **THEN** 读取计划文件，通过 `bd create` 创建任务

#### Scenario: 任务依赖管理
- **WHEN** 创建任务时
- **THEN** 使用 `bd dep add <blocked> <blocking>` 管理依赖关系

#### Scenario: TDD 强制执行
- **WHEN** 创建实现任务时
- **THEN** 该任务 SHALL 被对应的测试任务阻塞

#### Scenario: 验证任务生成
- **WHEN** 计划步骤有 `Spec-task-ref` 标注时
- **THEN** 创建 Validate 任务，被对应的产出任务阻塞

### Requirement: workflow-start 工具
workflow-start 工具 SHALL 读取并执行 bd ready 任务。

#### Scenario: 执行就绪任务
- **WHEN** Agent 调用 `/workflow-start`
- **THEN** 读取 `bd ready` 任务，按依赖顺序执行

#### Scenario: 验证任务监听
- **WHEN** Agent 认领验证任务时
- **THEN** 插件立即暂停 Agent 执行，调起 codeReviewerAgent

#### Scenario: 验证失败处理
- **WHEN** 验证任务失败时
- **THEN** 插件 reopen 从上一个验证点到失败点之间的所有任务，并将失败原因告知 Agent

#### Scenario: 任务认领拦截
- **WHEN** Agent 在验证链执行期间尝试认领其他任务时
- **THEN** 插件拦截并返回错误，禁止切换

### Requirement: 工作流状态管理
系统 SHALL 维护当前工作流上下文，包括：
- 当前执行的工具
- 活动的工作流 ID
- 任务依赖图

#### Scenario: 状态持久化
- **WHEN** 每个阶段完成后
- **THEN** 状态同步到 bd 追踪系统