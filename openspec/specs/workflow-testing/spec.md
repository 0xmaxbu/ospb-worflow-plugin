# workflow-testing Specification

> **证据来源**:
> - [OpenCode Plugin Development Guide](https://gist.github.com/rstacruz/946d02757525c9a0f49b25e316fbe715) - 官方插件开发文档
> - [OpenCode SDK Documentation](https://opencode.ai/docs/sdk/) - SDK 文档
> - [anomalyco/opencode monorepo](https://github.com/anomalyco/opencode) - 官方测试模式参考

## Purpose

定义 ospb-workflow-plugin 的测试策略，确保工作流插件的质量和可靠性。

## Requirements

### Requirement: 三层测试架构
系统 SHALL 实现三层测试架构：单元测试、集成测试、E2E 测试。

> **注意**: OpenCode 插件测试没有官方标准，本方案基于开源社区最佳实践

#### Scenario: 单元测试层 (L1)
- **WHEN** 执行 `pnpm run test:unit`
- **THEN** 运行所有 `packages/**/src/**/*.test.ts` 文件
- **工具**: Vitest + vi.mock
- **隔离方式**: 使用 `vi.hoisted()` 定义 mocks，使用 `vi.mock()` 隔离内部模块

#### Scenario: SDK 集成测试层 (L2)
- **WHEN** 执行 `pnpm run test:integration`
- **THEN** 使用 `createOpencode()` 启动本地服务器进行测试
- **证据**: [SDK Documentation](https://opencode.ai/docs/sdk/) - `createOpencode()` 提供本地测试服务器

#### Scenario: E2E 测试层 (L3)
- **WHEN** 执行 `pnpm run test:e2e`
- **THEN** 运行 Playwright 测试套件 `e2e/**/*.spec.ts`
- **前提**: 需要真实 OpenCode 环境

### Requirement: 测试覆盖标准
系统 SHALL 满足以下覆盖目标：

| 包 | 语句覆盖 | 证据 |
|----|---------|------|
| plugin-core | 80% | 核心 Hook 和状态管理 |
| plugin-cli | 75% | CLI 命令处理 |
| plugin-commands | 70% | 工具实现 |

#### Scenario: 覆盖报告生成
- **WHEN** 执行 `pnpm run test:coverage`
- **THEN** 生成覆盖率报告到 `coverage/` 目录

### Requirement: Mock 策略
系统 SHALL 使用标准化 Mock 策略隔离依赖。

#### Scenario: 内部模块 Mock (vi.mock + vi.hoisted)
- **WHEN** 测试需要隔离内部模块时
- **THEN** 使用以下模式：

```typescript
// 1. 使用 vi.hoisted() 在 imports 之前定义 mocks
const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

// 2. 使用 vi.mock() 模拟模块
vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

// 3. 在定义后 import
import { executeBeforeHook } from './execute-before';
```

- **证据**: [execute-before.test.ts](https://github.com/anomalyco/opencode/blob/main/packages/plugin/src/index.ts) 展示此模式

#### Scenario: 外部命令 Mock ($.bash)
- **WHEN** 测试需要执行 bd、openspec 等外部命令时
- **THEN** 使用 mock shell 返回预期结果

```typescript
const mockShell = vi.fn().mockResolvedValue({
  text: () => Promise.resolve('{"id": "bd-1"}'),
  json: () => Promise.resolve({ id: 'bd-1' }),
});

// 在 createMockContext 中注入
$: mockShell,
```

#### Scenario: SDK Mock (createOpencode)
- **WHEN** 测试需要 OpenCode 运行时环境时
- **THEN** 使用 `createOpencode()` 启动本地服务器

```typescript
import { createOpencode } from '@opencode-ai/sdk';

const opencode = await createOpencode();
const { client, server } = opencode;

// 测试完成后清理
server.close();
```

### Requirement: Hook 测试
系统 SHALL 测试所有注册的 Hook。

#### Scenario: tool.execute.before Hook 测试
- **WHEN** 调用 `executeBeforeHook`
- **THEN** 验证禁止命令被正确拦截（`rm -rf /`、`git push --force`）
- **THEN** 验证 Valid: 任务认领时抛出错误要求调用 verify-code tool

```typescript
it('should block prohibited commands', async () => {
  const input = { tool: 'bash', sessionID: 's1', callID: 'c1' };
  const output = { args: { command: 'rm -rf /' } };
  await expect(executeBeforeHook(input, output)).rejects.toThrow('Prohibited');
});

it('should block Valid: task claim without verify-code', async () => {
  const input = { tool: 'bash', sessionID: 's1', callID: 'c1' };
  const output = { args: { command: 'bd update bd-1 --claim' } };
  mockGetState.mockReturnValue({ isVerified: false, currentTask: null });
  await expect(executeBeforeHook(input, output)).rejects.toThrow('verify-code');
});
```

#### Scenario: tool.execute.after Hook 测试
- **WHEN** 工具执行完成后触发
- **THEN** 验证日志记录和状态更新

### Requirement: 状态管理测试
系统 SHALL 测试工作流状态管理逻辑。

#### Scenario: WorkflowStateManager 任务认领
- **WHEN** Agent 认领任务时
- **THEN** `canClaimNewTask()` 在验证前返回 false
- **THEN** `currentTask` 记录任务 ID

#### Scenario: WorkflowStateManager 验证完成
- **WHEN** 验证任务通过时
- **THEN** `isVerified` 设置为 true
- **THEN** `canClaimNewTask()` 返回 true

#### Scenario: WorkflowStateManager 验证失败
- **WHEN** 验证失败时
- **THEN** `isVerified` 保持 false
- **THEN** 阻止认领新任务

### Requirement: 工具实现测试
系统 SHALL 测试工作流工具的实现。

#### Scenario: init-workflow Tool 测试
- **WHEN** 调用 init-workflow tool
- **THEN** 验证 `bd init --quiet` 被调用
- **THEN** 验证 `openspec init --tools opencode` 被调用
- **THEN** 验证 `openspec/config.yaml` 语言设为中文

#### Scenario: workflow-explore Tool 测试
- **WHEN** 调用 workflow-explore tool (无参数)
- **THEN** 验证读取 `.workflow/drafts/` 目录
- **THEN** 验证通过 question tool 让用户选择

#### Scenario: workflow-task Tool 测试
- **WHEN** 调用 workflow-task tool
- **THEN** 验证 `bd create` 命令格式正确 (`Impl:`, `Test:`, `Valid:`)
- **THEN** 验证 `--description` 包含 `Spec-ref`
- **THEN** 验证 `-t` 参数为有效值 (chore/task/feature/bug/epic)

#### Scenario: verify-code Tool 测试 (Plan A 验证流程)
- **WHEN** Agent 调用 verify-code tool
- **THEN** 验证从任务 `--description` 解析 `Spec-ref`
- **THEN** 验证调用 codeReviewerAgent
- **THEN** 验证返回 pass/fail 结果
- **THEN** 验证失败时调用 `bd reopen`

### Requirement: 结构验证测试
系统 SHALL 验证代码结构而非文件格式。

> **注意**: 本插件使用 TypeScript Tools (tool()) 而非 .md 命令文件

#### Scenario: TypeScript Tool 定义验证
- **WHEN** 验证工具定义
- **THEN** 验证使用 `tool()` 函数
- **THEN** 验证 `description` 和 `args` 字段存在

#### Scenario: Hook 注册验证
- **WHEN** 验证插件导出
- **THEN** 验证 `hooks.tool` 对象包含所有工具
- **THEN** 验证 `hooks['tool.execute.before']` 已注册

### Requirement: 集成测试
系统 SHALL 测试插件与 OpenCode SDK 的集成。

#### Scenario: 插件加载测试
- **WHEN** 使用 `createOpencode()` 加载插件
- **THEN** 插件成功注册所有 Hook
- **THEN** 插件名称正确返回

#### Scenario: Tool 执行测试
- **WHEN** 通过 SDK 执行工具
- **THEN** tool.execute.before Hook 被调用
- **THEN** 工具返回预期结果

### Requirement: CI/CD 测试流水线
系统 SHALL 配置自动化测试流水线。

#### Scenario: Push 时执行单元测试
- **WHEN** 代码推送到仓库时
- **THEN** 自动执行 `pnpm run test:unit`

#### Scenario: PR 时执行集成测试
- **WHEN** 创建 Pull Request 时
- **THEN** 自动执行 `pnpm run test:integration`

#### Scenario: Release 时执行 E2E
- **WHEN** 创建 Release 时
- **THEN** 自动执行 `pnpm run test:e2e`

### Requirement: 测试执行命令
测试 SHALL 通过以下命令执行：

| 命令 | 测试内容 |
|------|---------|
| `pnpm run test:unit` | 单元测试 (L1) |
| `pnpm run test:integration` | SDK 集成测试 (L2) |
| `pnpm run test:e2e` | Playwright E2E (L3) |
| `pnpm run test:coverage` | 生成覆盖率报告 |

### Requirement: Mock Context 工厂
系统 SHALL 提供标准化的 Mock Context 工厂。

#### Scenario: createMockPluginContext
- **WHEN** 单元测试需要模拟插件上下文时
- **THEN** 使用 `tests/helpers/create-mock-context.ts` 工厂

```typescript
// tests/helpers/create-mock-context.ts
import type { PluginInput } from '@opencode-ai/plugin';

export function createMockPluginContext(overrides?: Partial<PluginInput>): PluginInput {
  return {
    project: { id: 'test-project', worktree: '/tmp/test', vcs: 'git', name: 'test' },
    directory: '/tmp/test',
    worktree: '/tmp/test',
    client: createMockSDKClient(),
    $: createMockShell(),
    ...overrides,
  };
}
```

### Requirement: 测试文件命名规范
测试文件 SHALL 遵循以下命名规范：

| 类型 | 命名模式 | 示例 |
|------|---------|------|
| 单元测试 | `*.test.ts` | `execute-before.test.ts` |
| 集成测试 | `*.integration.test.ts` | `workflow.integration.test.ts` |
| E2E 测试 | `*.spec.ts` | `workflow.spec.ts` |
| Mock 工厂 | `*.mock.ts` | `code-reviewer.mock.ts` |
