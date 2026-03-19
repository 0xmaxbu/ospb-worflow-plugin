## 1. 测试配置

- [ ] 1.1 配置 vitest.config.ts 测试框架
- [ ] 1.2 创建 tests/setup.ts 测试环境初始化
- [ ] 1.3 配置 package.json 测试脚本（test:level1, test:level2, test:level3, test:e2e）
- [ ] 1.4 创建 .github/workflows/test.yml CI/CD 配置

## 2. Mock 工厂

- [ ] 2.1 创建 tests/helpers/mock-context.ts Mock Context 工厂
- [ ] 2.2 创建 tests/helpers/mock-client.ts SDK Client Mock
- [ ] 2.3 创建 tests/helpers/mock-shell.ts Shell Mock

## 3. 单元测试补充

- [ ] 3.1 补充 workflow-state.test.ts 状态转换测试
- [ ] 3.2 补充 execute-before.test.ts Hook 拦截边界测试
- [ ] 3.3 补充 session-idle.test.ts 会话空闲测试
- [ ] 3.4 补充 chat-transform.test.ts Chat 转换测试

## 4. 结构验证测试

- [ ] 4.1 创建 packages/plugin-commands/src/validation/command-validator.test.ts 命令定义验证
- [ ] 4.2 创建 packages/plugin-commands/src/validation/skill-validator.test.ts 技能定义验证
- [ ] 4.3 创建 packages/plugin-commands/src/validation/openspec-validator.test.ts OpenSpec 变更验证

## 5. 集成测试

- [ ] 5.1 创建 packages/plugin-core/src/workflow.integration.test.ts 工作流集成测试
- [ ] 5.2 创建 packages/plugin-core/src/index.sdk-integration.test.ts SDK 集成测试
- [ ] 5.3 创建 packages/plugin-cli/src/commands/init.integration.test.ts CLI 集成测试

## 6. E2E 测试

- [ ] 6.1 创建 e2e.config.ts Playwright 配置
- [ ] 6.2 创建 e2e/workflow.spec.ts 工作流 E2E 测试
- [ ] 6.3 创建 e2e/commands.spec.ts 命令定义 E2E 测试
- [ ] 6.4 创建 e2e/validation.spec.ts 验证流程 E2E 测试

## 7. codeReviewerAgent 验证测试

- [ ] 7.1 创建 tests/mocks/code-reviewer-agent.mock.ts codeReviewerAgent Mock
- [ ] 7.2 创建 validation/verify-task.test.ts 验证任务触发测试
- [ ] 7.3 创建 validation/fail-recovery.test.ts 验证失败恢复测试

## 8. 任务认领拦截测试

- [ ] 8.1 创建 validation/task-claiming.test.ts 任务认领拦截测试
- [ ] 8.2 创建 validation/validation-chain.test.ts 验证链状态测试

## 9. 覆盖率优化

- [ ] 9.1 运行 test:coverage 生成覆盖率报告
- [ ] 9.2 修复未覆盖的语句和分支
- [ ] 9.3 验证 plugin-core 达到 80% 语句覆盖
- [ ] 9.4 验证 plugin-cli 达到 75% 语句覆盖
- [ ] 9.5 验证 plugin-commands 达到 70% 语句覆盖
