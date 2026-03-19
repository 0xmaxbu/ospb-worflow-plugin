## ADDED Requirements

### Requirement: 四层测试架构
系统 SHALL 实现四层测试架构：单元测试、结构验证测试、集成测试、E2E 测试。

#### Scenario: 单元测试层
- **WHEN** 执行 `pnpm run test:level1`
- **THEN** 运行所有 `packages/**/src/**/*.test.ts` 文件

#### Scenario: 结构验证层
- **WHEN** 执行 `pnpm run test:level2`
- **THEN** 运行所有 `packages/plugin-commands/src/validation/*.test.ts` 文件

#### Scenario: 集成测试层
- **WHEN** 执行 `pnpm run test:level3`
- **THEN** 运行所有 `packages/**/src/*.integration.test.ts` 文件

#### Scenario: E2E 测试层
- **WHEN** 执行 `pnpm run test:e2e`
- **THEN** 运行 Playwright 测试套件 `e2e/**/*.spec.ts`

### Requirement: 测试覆盖标准
系统 SHALL 满足以下覆盖目标：

| 包 | 语句覆盖 | 分支覆盖 | 函数覆盖 |
|----|---------|---------|---------|
| plugin-core | 80% | 75% | 85% |
| plugin-cli | 75% | 70% | 80% |
| plugin-commands | 70% | 65% | 75% |

#### Scenario: 覆盖报告生成
- **WHEN** 执行 `pnpm run test:coverage`
- **THEN** 生成覆盖率报告到 `coverage/` 目录

#### Scenario: 覆盖阈值检查
- **WHEN** 语句覆盖率低于 80%
- **THEN** 测试失败并报告具体文件和行号

### Requirement: Mock 策略
系统 SHALL 使用标准化 Mock 策略隔离依赖。

#### Scenario: 内部模块 Mock
- **WHEN** 测试需要隔离内部模块时
- **THEN** 使用 `vi.mock` + `vi.hoisted` 模式

#### Scenario: 外部命令 Mock
- **WHEN** 测试需要执行 bd、openspec 等外部命令时
- **THEN** 使用 mock shell 模拟返回结果

#### Scenario: SDK Mock
- **WHEN** 测试需要 OpenCode 运行时环境时
- **THEN** 使用 `createOpencode()` 启动本地服务器

### Requirement: Hook 测试
系统 SHALL 测试所有注册的 Hook。

#### Scenario: tool.execute.before Hook 测试
- **WHEN** 调用 `executeBeforeHook`
- **THEN** 验证禁止命令被正确拦截（rm -rf /、git push --force）
- **THEN** 验证任务未验证时禁止 `bd claim`

#### Scenario: session.idle Hook 测试
- **WHEN** 会话空闲超时触发
- **THEN** 验证状态同步到 bd 追踪系统

#### Scenario: experimental.chat.system.transform Hook 测试
- **WHEN** Chat 消息经过系统处理
- **THEN** 验证工作流状态正确注入到上下文

### Requirement: 状态管理测试
系统 SHALL 测试工作流状态管理逻辑。

#### Scenario: 任务认领状态
- **WHEN** Agent 认领任务时
- **THEN** `WorkflowStateManager.canClaimNewTask()` 返回 false
- **THEN** 当前任务记录到状态中

#### Scenario: 验证完成状态
- **WHEN** 验证任务通过时
- **THEN** `WorkflowStateManager.isVerified()` 返回 true
- **THEN** `canClaimNewTask()` 返回 true

#### Scenario: 验证失败状态
- **WHEN** 验证失败时
- **THEN** 阻止认领新任务
- **THEN** 必须完成当前任务才能继续

### Requirement: 结构验证测试
系统 SHALL 验证命令和技能定义文件结构。

#### Scenario: 命令定义文件验证
- **WHEN** 验证 `.opencode/commands/*.md` 文件
- **THEN** frontmatter 必须包含 `description` 字段
- **THEN** `description` 长度必须 ≤100 字符

#### Scenario: 技能定义文件验证
- **WHEN** 验证 `.opencode/skills/*/SKILL.md` 文件
- **THEN** frontmatter 必须包含 `name`、`description`、`license`、`compatibility`
- **THEN** `name` 必须符合 kebab-case 格式

### Requirement: 集成测试
系统 SHALL 测试插件与 OpenCode SDK 的集成。

#### Scenario: 插件加载测试
- **WHEN** 调用 `createOpencode()` 加载插件
- **THEN** 插件成功注册所有 Hook
- **THEN** 插件名称正确返回

#### Scenario: Hook 执行测试
- **WHEN** 通过 SDK 触发工具执行
- **THEN** `tool.execute.before` Hook 被调用
- **THEN** 禁止命令被正确拦截

### Requirement: CI/CD 测试流水线
系统 SHALL 配置自动化测试流水线。

#### Scenario: 每次 Push 执行单元测试
- **WHEN** 代码推送到仓库时
- **THEN** 自动执行 L1 单元测试和 L2 结构验证测试

#### Scenario: 每次 PR 执行集成测试
- **WHEN** 创建 Pull Request 时
- **THEN** 自动执行 L3 集成测试

#### Scenario: 每次 Release 执行 E2E 测试
- **WHEN** 创建 Release 时
- **THEN** 自动执行 L4 E2E 测试

### Requirement: codeReviewerAgent 验证测试
系统 SHALL 测试验证流程的核心机制。

#### Scenario: 验证任务触发
- **WHEN** Agent 认领带有 `Spec-task-ref` 标注的任务时
- **THEN** 插件暂停 Agent 执行
- **THEN** 调起 codeReviewerAgent 进行验证

#### Scenario: 验证失败处理
- **WHEN** codeReviewerAgent 验证失败时
- **THEN** 插件 reopen 从上一个验证点到失败点之间的所有任务
- **THEN** 将失败原因告知 Agent

### Requirement: 任务认领拦截测试
系统 SHALL 测试验证链上的任务认领限制。

#### Scenario: 验证链中禁止切换任务
- **WHEN** Agent 处于验证链执行期间
- **WHEN** Agent 尝试认领其他 `bd ready` 任务
- **THEN** 插件拦截并返回错误

#### Scenario: 验证完成后解除限制
- **WHEN** 验证任务完成后
- **THEN** Agent 可以正常认领新任务
