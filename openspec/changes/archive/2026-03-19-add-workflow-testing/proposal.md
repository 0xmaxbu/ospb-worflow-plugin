## Why

当前项目缺乏系统的测试覆盖，尽管已有 8 个测试文件 29 个测试用例，但测试方案未经正式评审，无法确保关键路径得到有效验证。需要将测试方案正式纳入 OpenSpec 规范，确保工作流插件的每个功能都能得到有效测试。

## What Changes

- 建立四层测试架构（单元测试、结构验证、集成测试、E2E 测试）
- 制定测试覆盖标准（语句覆盖、分支覆盖、函数覆盖目标）
- 明确 Mock 策略和测试执行配置
- 添加 CI/CD 测试流水线配置
- 补充现有测试缺口（codeReviewerAgent 验证流程、任务认领拦截、失败恢复流程）

## Capabilities

### New Capabilities

- `workflow-testing`: 定义工作流插件的测试策略、覆盖目标、四层测试架构、Mock 策略和 CI/CD 配置

### Modified Capabilities

- `workflow-plugin-core`: 补充测试需求（Hook 拦截、状态管理、命令调度）
- `workflow-plan-review`: 补充 codeReviewerAgent 验证流程测试
- `workflow-task-manager`: 补充任务创建、依赖管理、TDD 阻塞机制测试
- `workflow-executor`: 补充任务认领拦截、失败恢复、验证流程测试

## Impact

- 新增 `docs/TESTING_PLAN.md` 测试方案文档（已创建）
- 新增 `packages/plugin-commands/src/validation/` 结构验证测试
- 新增 `packages/plugin-core/src/workflow.integration.test.ts` 工作流集成测试
- 新增 `packages/plugin-cli/src/commands/init.integration.test.ts` CLI 集成测试
- 新增 `e2e/` Playwright E2E 测试套件
- 修改 `.github/workflows/test.yml` CI/CD 配置
