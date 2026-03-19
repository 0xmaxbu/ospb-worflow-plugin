## Context

当前项目使用 Vitest 进行测试，已有 8 个测试文件 29 个测试用例，但缺乏正式的四层测试架构设计。需要建立完整的测试策略以确保工作流插件的关键路径（Hook 拦截、状态管理、任务认领、验证流程）得到有效覆盖。

**当前测试现状**：
- 测试框架：Vitest (bun:test 兼容)
- 测试位置：`packages/*/src/**/*.test.ts`
- 缺少：结构验证测试、集成测试（SDK）、E2E 测试

## Goals / Non-Goals

**Goals:**
- 建立四层测试架构（单元测试、结构验证、集成测试、E2E 测试）
- 定义覆盖目标（语句覆盖 80%+，分支覆盖 75%+，函数覆盖 85%+）
- 明确 Mock 策略和使用场景
- 建立 CI/CD 测试流水线
- 补充关键功能测试（codeReviewerAgent 验证、任务认领拦截、失败恢复）

**Non-Goals:**
- 不替代现有的单元测试（继续使用 vi.mock 模式）
- 不覆盖 node_modules 依赖
- 不实现跨服务集成测试

## Decisions

### 决策 1：四层测试架构

**选择**：单元测试 → 结构验证 → 集成测试 → E2E 测试

**理由**：
- 单元测试覆盖 Hook、状态管理、工具函数
- 结构验证确保命令/技能定义符合规范
- 集成测试验证插件加载、Hook 执行
- E2E 测试覆盖完整工作流

**替代方案**：
- 仅使用单元测试 → 无法验证插件与 OpenCode 的集成
- 仅使用 E2E 测试 → 反馈周期长，难以定位问题

### 决策 2：Mock 策略

**选择**：内部模块使用 vi.mock，外部命令使用 mock shell，SDK 使用 createOpencode()

**理由**：
- vi.mock 支持 tree-shaking，减少测试包体积
- mock shell 避免实际执行 bd、openspec 命令
- createOpencode() 提供完整的 OpenCode 运行时环境

**替代方案**：
- Jest mock → 与 Vitest 不兼容
- 实际执行 bd 命令 → 测试环境可能没有 bd 安装

### 决策 3：测试执行配置

**选择**：分层执行 + CI/CD 集成

| 层级 | 触发时机 | 命令 |
|-----|---------|------|
| L1 单元 | 每次 push | `pnpm run test:level1` |
| L2 验证 | 每次 push | `pnpm run test:level2` |
| L3 集成 | 每次 PR | `pnpm run test:level3` |
| L4 E2E | 每次 release | `pnpm run test:e2e` |

**理由**：
- 分层执行减少反馈时间
- E2E 测试资源消耗大，仅在 release 时执行

### 决策 4：覆盖标准

**选择**：基于包维度的差异化覆盖目标

| 包 | 语句覆盖 | 分支覆盖 | 函数覆盖 |
|----|---------|---------|---------|
| plugin-core | 80% | 75% | 85% |
| plugin-cli | 75% | 70% | 80% |
| plugin-commands | 70% | 65% | 75% |

**理由**：
- plugin-core 是核心，覆盖标准最高
- plugin-commands 主要为配置文件，降低覆盖要求

## Risks / Trade-offs

**[Risk]** SDK 集成测试需要启动本地 OpenCode 服务器，CI 环境可能受限

→ **Mitigation**：使用 `createOpencode()` 的 timeout 配置，预留足够启动时间

**[Risk]** E2E 测试使用 Playwright，CI 需要安装浏览器依赖

→ **Mitigation**：使用 `playwright install --with-deps` 一次性安装所有依赖

**[Risk]** Mock 过多可能导致测试与实际行为不一致

→ **Mitigation**：关键路径使用真实调用，Mock 仅用于隔离外部依赖

**[Risk]** 测试覆盖目标过高导致开发成本增加

→ **Mitigation**：分阶段达成覆盖目标，v1.0 聚焦关键路径

## Migration Plan

1. **Phase 1**: 补充结构验证测试（命令/技能 YAML 验证）
2. **Phase 2**: 补充集成测试（SDK Hook 执行测试）
3. **Phase 3**: 添加 E2E 测试骨架
4. **Phase 4**: 优化覆盖目标，迭代改进

**回滚策略**：
- 测试代码与业务代码分离，禁用测试不影响生产
- 使用 Git tag 标记测试稳定版本

## Open Questions

1. codeReviewerAgent 如何在测试环境中模拟？
2. 任务认领拦截是否需要在真实 OpenCode 会话中测试？
3. 失败恢复流程的 E2E 测试如何验证 `bd reopen` 效果？
