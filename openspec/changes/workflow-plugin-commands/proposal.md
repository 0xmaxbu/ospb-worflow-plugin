## Why

当前 OpenCode Agent 在执行任务时缺乏结构化的工作流管理，导致任务执行顺序混乱、缺乏验证机制、TDD 规范难以贯彻。我们需要一个基于 OpenSpec + bd (beads) 的自动化工作流系统，为 Agent 提供从需求探索到任务执行的完整闭环支持。

## What Changes

实现 OpenSpec Workflow Plugin 核心命令，提供以下工作流工具：

- **/init-workflow** - 初始化工作环境（bd + openspec）
- **/workflow-explore** - 需求分析与探索，保持与用户的持续沟通
- **/workflow-propose** - 将需求草案转换为 OpenSpec 文档
- **/workflow-plan** - 将 Spec 转换为可执行的详细计划
- **/workflow-task** - 根据计划创建带依赖关系的 bd 任务
- **/workflow-start** - 执行任务并处理验证、失败恢复
- **/workflow-archive** - 归档已完成的 OpenSpec change

> **实现方式**: 所有工作流工具使用 OpenCode Plugin SDK 的 `tool()` 函数实现为 TypeScript Tools，注册在 `hooks.tool` 对象中
> **外部依赖**: bd (beads) CLI 工具由外部提供，插件通过 `$.bash()` 调用

## Capabilities

### New Capabilities

- **workflow-plugin-core** - 工作流插件核心命令框架
  - 定义 7 个核心命令的接口和行为规范
  - 命令调度器：根据命令类型路由到对应处理函数
  - 工作流状态管理：维护当前工作流上下文

- **workflow-plan-review** - Plan 审查机制
  - Plan 生成后自动触发审查
  - 审查维度：符合性、完整性、设计质量
  - 与用户沟通修改的交互流程

- **workflow-task-manager** - 任务与依赖管理
  - TDD 强制执行：测试任务阻塞实现任务
  - 验证任务生成：基于 Spec-task-ref 和 Spec-ref
  - 任务元数据同步到 .workflow/bd.md

- **workflow-executor** - 任务执行与验证
  - 验证任务监听：暂停 Agent，调起 codeReviewerAgent
  - 失败恢复：reopen 相关任务，强制顺序执行
  - 任务认领拦截：禁止在验证链外切换任务

- **workflow-testing** - 工作流插件测试策略
  - 四层测试架构：单元测试、结构验证、集成测试、E2E 测试
  - 覆盖目标：plugin-core 80%、plugin-cli 75%、plugin-commands 70%
  - Mock 策略：vi.mock + createOpencode()
  - CI/CD 流水线：Push/PR/Release 分层触发

### Modified Capabilities

- 无

## Impact

- 新增 `packages/plugin-core/src/` 下的工作流工具实现 (TypeScript)
- 新增 `packages/plugin-core/src/hooks/` 下的拦截器实现
- 新增 `openspec/changes/` 归档目录
- 新增 `tests/` 测试配置和 Mock 工厂
- 新增 `packages/*/src/**/*.test.ts` 单元测试
- 新增 `e2e/` Playwright E2E 测试套件
- 新增 `.github/workflows/test.yml` CI/CD 配置
- AGENTS.md 新增工作流插件文档