# 测试方案 - ospb-workflow-plugin (SDK 版本)

## 1. 项目测试现状

| 指标 | 状态 |
|-----|------|
| 测试框架 | Vitest (bun:test 兼容) |
| 测试数量 | 8 个测试文件，29 个测试用例通过 |
| Monorepo | pnpm workspaces + Turborepo |
| 测试位置 | `packages/*/src/**/*.test.ts` |

### 现有测试文件

```
packages/
├── plugin-core/src/
│   ├── index.integration.test.ts    # 插件集成测试
│   ├── workflow-state.test.ts       # 状态管理测试
│   ├── tool-check.test.ts           # 工具检查测试
│   └── hooks/
│       ├── execute-before.test.ts    # Hook 拦截测试
│       ├── chat-transform.test.ts    # Chat 转换测试
│       ├── session-idle.test.ts      # 会话空闲测试
│       └── session-compacting.test.ts # 会话压缩测试
└── plugin-cli/src/
    └── commands/
        └── init.test.ts              # CLI 命令测试
```

---

## 2. OpenCode 插件测试方法

根据[官方插件开发指南](https://gist.github.com/rstacruz/946d02757525c9a0f49b25e316fbe715)，OpenCode 插件测试有三种方法：

### 方法 1: 单元测试 (Mock 内部依赖)

```typescript
// 使用 vi.mock 隔离内部模块
vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

// 直接导入待测模块
import { executeBeforeHook } from './execute-before';
```

### 方法 2: 使用 SDK Client 进行集成测试

```typescript
import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';

// 启动本地 OpenCode 实例
const opencode = await createOpencode();
const { client } = opencode;

// 在测试中使用 client 进行验证
await client.session.prompt({ ... });

// 清理
opencode.server.close();
```

### 方法 3: bun link 本地插件测试

```bash
# 1. 链接本地插件
cd packages/plugin-core
bun link

# 2. 在测试项目中链接
cd /path/to/test-project
bun link @ospb/plugin-core

# 3. 在 opencode.json 中配置
{
  "plugin": ["/path/to/local/plugin"]
}
```

---

## 3. 测试架构

```
┌─────────────────────────────────────────────────────────────┐
│                  SDK 集成测试 (Level 3)                      │
│        使用 createOpencode() 启动本地服务器 + SDK Client       │
│        测试 Hook 执行、会话交互、命令注册                       │
├─────────────────────────────────────────────────────────────┤
│                    单元测试 (Level 1-2)                     │
│        Vitest + vi.mock、YAML 结构验证                        │
│        纯函数逻辑、状态管理、工具检查                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Level 1: 单元测试 (现有)

### 4.1 Hook 测试模式 (现有项目已采用)

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hooks } from '@opencode-ai/plugin';

// Mock 内部依赖
const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

import { executeBeforeHook } from './execute-before';

type ExecuteBeforeHook = NonNullable<Hooks['tool.execute.before']>;
type ExecuteBeforeHookInput = Parameters<ExecuteBeforeHook>[0];
type ExecuteBeforeHookOutput = Parameters<ExecuteBeforeHook>[1];

describe('executeBeforeHook', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('should block bd claim when task not verified', async () => {
    mockGetState.mockReturnValue({
      currentTask: 'bd-123',
      isVerified: false,
      canClaimNewTask: () => false,
    });

    const input = {
      tool: 'bash',
      sessionID: 'session-1',
      callID: 'call-1',
    } as ExecuteBeforeHookInput;

    const output = {
      args: { command: 'bd claim bd-456' },
    } as ExecuteBeforeHookOutput;

    await expect(executeBeforeHook(input, output)).rejects.toThrow('Workflow Violation');
  });
});
```

### 4.2 状态管理测试

```typescript
import { describe, expect, it, vi } from 'vitest';
import { WorkflowStateManager } from './workflow-state';

vi.mock('./persistence', () => ({
  loadState: vi.fn().mockResolvedValue(null),
  saveState: vi.fn().mockResolvedValue(undefined),
}));

describe('WorkflowStateManager', () => {
  it('should track current task', async () => {
    const manager = new WorkflowStateManager();
    await manager.claimTask('bd-123');
    expect(manager.getCurrentTask()).toBe('bd-123');
  });

  it('should enforce verification before new task', async () => {
    const manager = new WorkflowStateManager();
    await manager.claimTask('bd-123');
    await manager.verifyTask('bd-123');
    expect(manager.canClaimNewTask()).toBe(true);
  });
});
```

---

## 5. Level 2: 结构验证测试

### 5.1 命令/技能 YAML 验证

```typescript
import { describe, expect, it } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';

describe('Command/Skill Structure Validation', () => {
  const commandFiles = glob.sync('.opencode/command/*.md');
  const skillFiles = glob.sync('.opencode/skills/*/SKILL.md');

  describe('Commands', () => {
    for (const file of commandFiles) {
      it(`should have valid frontmatter in ${file}`, () => {
        const content = readFileSync(file, 'utf-8');
        const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
        const parsed = parseYaml(frontmatter);

        expect(parsed).toHaveProperty('description');
        expect(typeof parsed.description).toBe('string');
        expect(parsed.description.length).toBeLessThan(100);
      });
    }
  });

  describe('Skills', () => {
    const requiredFields = ['name', 'description', 'license', 'compatibility'];

    for (const file of skillFiles) {
      it(`should have valid frontmatter in ${file}`, () => {
        const content = readFileSync(file, 'utf-8');
        const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
        const parsed = parseYaml(frontmatter);

        for (const field of requiredFields) {
          expect(parsed).toHaveProperty(field);
        }
      });
    }
  });
});
```

---

## 6. Level 3: SDK 集成测试

### 6.1 插件加载测试

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOpencode } from '@opencode-ai/sdk';
import plugin from './index';

describe('Plugin SDK Integration', () => {
  let opencode: Awaited<ReturnType<typeof createOpencode>>;

  beforeAll(async () => {
    // 启动本地 OpenCode 服务器
    opencode = await createOpencode({
      config: {
        // 加载本地插件
        plugin: [process.cwd()],
      },
    });
  });

  afterAll(() => {
    opencode.server.close();
  });

  it('should register all hooks', async () => {
    const agents = await opencode.client.app.agents();
    const pluginAgent = agents.find(a => a.name === 'ospb-workflow-plugin');
    expect(pluginAgent).toBeDefined();
  });

  it('should intercept prohibited commands', async () => {
    const session = await opencode.client.session.create({
      body: { title: 'Test Session' },
    });

    // 尝试执行禁止的命令，应被 hook 拦截
    await expect(
      opencode.client.session.shell({
        path: { id: session.id },
        body: { command: 'rm -rf /' },
      })
    ).rejects.toThrow();
  });
});
```

### 6.2 Hook 执行测试

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOpencodeClient } from '@opencode-ai/sdk';

describe('Hook Execution via SDK', () => {
  let client: ReturnType<typeof createOpencodeClient>;

  beforeAll(() => {
    // 连接到已运行的 OpenCode 实例
    client = createOpencodeClient({
      baseUrl: 'http://localhost:4096',
    });
  });

  it('should execute tool.execute.before hook', async () => {
    const session = await client.session.create({
      body: { title: 'Hook Test' },
    });

    // 触发 shell 命令，应被 hook 拦截
    const result = await client.session.shell({
      path: { id: session.id },
      body: { command: 'git push --force origin main' },
    });

    // 验证 hook 是否正确拦截
    expect(result.data.message.content).toContain('Prohibited');
  });
});
```

### 6.3 会话事件测试

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOpencode } from '@opencode-ai/sdk';

describe('Session Events via SDK', () => {
  let opencode: Awaited<ReturnType<typeof createOpencode>>;

  beforeAll(async () => {
    opencode = await createOpencode();
  });

  afterAll(() => {
    opencode.server.close();
  });

  it('should receive session.idle event', async () => {
    const session = await opencode.client.session.create({
      body: { title: 'Idle Test' },
    });

    const events = await opencode.client.event.subscribe();

    // 等待 idle 事件
    for await (const event of events.stream) {
      if (event.type === 'session.idle' && event.properties.sessionId === session.id) {
        expect(event.type).toBe('session.idle');
        break;
      }
    }
  });
});
```

---

## 7. Mock Context 工厂

### 7.1 标准 Mock Context

```typescript
// tests/helpers/mock-context.ts
import type { Plugin } from '@opencode-ai/plugin';

export function createMockContext(overrides?: Partial<PluginInput>): PluginInput {
  return {
    project: {
      id: 'test-project',
      worktree: '/tmp/test',
      vcs: 'git',
      name: 'test',
    },
    directory: '/tmp/test',
    worktree: '/tmp/test',
    client: createMockClient(),
    $: createMockShell(),
    ...overrides,
  };
}

export function createMockClient() {
  return {
    app: {
      log: vi.fn().mockResolvedValue(true),
      agents: vi.fn().mockResolvedValue({ data: [] }),
    },
    session: {
      create: vi.fn().mockResolvedValue({ id: 'test-session' }),
      prompt: vi.fn().mockResolvedValue({ data: {} }),
      command: vi.fn().mockResolvedValue({ data: {} }),
    },
  } as unknown as ReturnType<typeof createOpencodeClient>;
}

export function createMockShell() {
  return async (template: TemplateStringsArray, ...values: any[]) => ({
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
  });
}
```

### 7.2 使用示例

```typescript
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '../helpers/mock-context';
import { MyPlugin } from './index';

describe('MyPlugin', () => {
  it('should register tools with mock context', async () => {
    const mockCtx = createMockContext();
    const hooks = await MyPlugin(mockCtx);
    expect(hooks.tool).toBeDefined();
  });
});
```

---

## 8. 测试执行配置

### 8.1 Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts'],
    environment: 'node',
    globals: {
      vi: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.integration.test.ts'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### 8.2 测试 Setup 文件

```typescript
// tests/setup.ts
import { vi } from 'vitest';

// Mock @opencode-ai/sdk
vi.mock('@opencode-ai/sdk', () => ({
  createOpencode: vi.fn(),
  createOpencodeClient: vi.fn(),
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});
```

---

## 9. CI/CD 配置

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit
      - run: pnpm run test:coverage

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: pnpm run test:integration
```

---

## 10. 测试矩阵

| 层级 | 测试内容 | 工具 | 覆盖目标 |
|-----|---------|------|---------|
| L1 单元 | Hooks、状态管理、工具函数 | Vitest + vi.mock | 80%+ 语句覆盖 |
| L2 验证 | YAML frontmatter、文件结构 | Vitest | 100% 文件 |
| L3 SDK | 插件加载、Hook 执行、会话事件 | Vitest + SDK Client | 关键路径 |

---

## 11. 关键要点

1. **单元测试**：使用 `vi.mock` 隔离内部依赖，不需要真实的 OpenCode 环境
2. **SDK 集成测试**：使用 `createOpencode()` 启动本地服务器，测试完整的插件加载和 Hook 执行
3. **Event 测试**：使用 `client.event.subscribe()` 监听会话事件
4. **Mock 工厂**：创建 `createMockContext()` 简化单元测试的上下文创建

---

## 12. 后续步骤

1. **立即执行**: `pnpm run test` - 验证现有 29 个测试通过
2. **创建 Mock 工厂**: `tests/helpers/mock-context.ts`
3. **添加 SDK 集成测试**: `src/index.sdk-integration.test.ts`
4. **添加结构验证测试**: `packages/plugin-commands/src/validation/`

---

## 13. 测试有效性评估

### 基于证据的有效性确认

| 证据 | 来源 | 确认内容 |
|-----|------|---------|
| [Issue #10042](https://github.com/anomalyco/opencode/issues/10042) | OpenCode 官方 | `tool.execute.before/after` 需要测试 ✅ |
| [官方 package.json](https://github.com/anomalyco/opencode/blob/master/packages/app/package.json) | OpenCode 官方 | bun test + Playwright 架构 ✅ |
| [SDK 文档](https://opencode.ai/docs/zh-cn/sdk/) | OpenCode 官方 | `createOpencode()` 支持集成测试 ✅ |
| [Plugin 指南](https://gist.github.com/rstacruz/946d02757525c9a0f49b25e316fbe715) | 社区 | vi.mock + mock context 模式 ✅ |

### 能有效测试的功能

| 功能 | 测试方法 | 证据 |
|-----|---------|------|
| Hook 拦截逻辑 | 单元测试 (vi.mock) | Issue #10042 确认需要测试 |
| 禁止命令拦截 | 单元测试 | 现有测试覆盖 |
| session.idle 事件 | SDK 集成测试 | SDK 支持事件订阅 |
| 插件注册/加载 | SDK 集成测试 | `client.app.agents()` |
| 状态管理逻辑 | 单元测试 | 现有测试覆盖 |

### 需要补充的测试

| 功能 | 建议测试方法 | 原因 |
|-----|------------|------|
| codeReviewerAgent 验证流程 | Mock codeReviewerAgent | 核心验证机制 |
| 任务认领拦截 | SDK + 实际执行 `bd claim` | 需要完整工作流 |
| 失败恢复流程 | SDK + `bd reopen` | 需要 bd 命令 |
| 验证任务阻塞 | SDK + `bd dep` 验证 | 需要依赖验证 |
packages/
├── plugin-core/src/
│   ├── index.integration.test.ts    # 插件集成测试
│   ├── workflow-state.test.ts       # 状态管理测试
│   ├── tool-check.test.ts           # 工具检查测试
│   └── hooks/
│       ├── execute-before.test.ts    # Hook 拦截测试
│       ├── chat-transform.test.ts    # Chat 转换测试
│       ├── session-idle.test.ts      # 会话空闲测试
│       └── session-compacting.test.ts # 会话压缩测试
└── plugin-cli/src/
    └── commands/
        └── init.test.ts              # CLI 命令测试
```

---

## 2. 四层测试架构

```
┌─────────────────────────────────────────────────────────────┐
│                     E2E 测试 (Level 4)                      │
│         完整工作流测试、Playwright、真实 OpenCode 环境         │
├─────────────────────────────────────────────────────────────┤
│                    集成测试 (Level 3)                        │
│           插件加载、命令注册、Hook 执行、bd 交互               │
├─────────────────────────────────────────────────────────────┤
│                   结构验证 (Level 2)                        │
│      YAML frontmatter 验证、字段类型/值范围、文件位置         │
├─────────────────────────────────────────────────────────────┤
│                    单元测试 (Level 1)                        │
│           纯函数、工具函数、状态逻辑、Hook 单元               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Level 1: 单元测试 (现有)

### 3.1 测试框架配置

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
})
```

### 3.2 Mock 模式

使用 `vi.mock` + `vi.hoisted` 进行依赖注入：

```typescript
// 标准化 Mock 工厂
vi.mock('../workflow-state', () => ({
  getWorkflowState: mockGetState,
}));

const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));
```

### 3.3 覆盖要求

| 模块 | 最低覆盖 | 测试策略 |
|-----|---------|---------|
| workflow-state.ts | 80% | 状态转换、分支覆盖 |
| tool-check.ts | 85% | 边界条件、错误处理 |
| hooks/*.ts | 75% | 输入验证、副作用 |
| commands/*.ts | 80% | 参数解析、错误提示 |

---

## 4. Level 2: 结构验证测试

### 4.1 命令定义文件验证

创建 `packages/plugin-commands/src/validation/command-validator.test.ts`：

```typescript
import { describe, expect, it } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';

describe('Command Definition Validation', () => {
  const commandFiles = glob.sync('.opencode/command/*.md');

  it('should have all required frontmatter fields', () => {
    for (const file of commandFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
      const parsed = parseYaml(frontmatter);

      expect(parsed).toHaveProperty('description');
      expect(typeof parsed.description).toBe('string');
      expect(parsed.description.length).toBeGreaterThan(0);
    }
  });

  it('should have valid description length', () => {
    for (const file of commandFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
      const parsed = parseYaml(frontmatter);

      expect(parsed.description.length).toBeLessThanOrEqual(100);
    }
  });
});
```

### 4.2 技能定义文件验证

创建 `packages/plugin-commands/src/validation/skill-validator.test.ts`：

```typescript
import { describe, expect, it } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';

describe('Skill Definition Validation', () => {
  const skillFiles = glob.sync('.opencode/skills/*/SKILL.md');

  const requiredFrontmatter = ['name', 'description', 'license', 'compatibility'];

  it('should have all required frontmatter fields', () => {
    for (const file of skillFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
      const parsed = parseYaml(frontmatter);

      for (const field of requiredFrontmatter) {
        expect(parsed).toHaveProperty(field);
      }
    }
  });

  it('should have valid name format (kebab-case)', () => {
    for (const file of skillFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
      const parsed = parseYaml(frontmatter);

      expect(parsed.name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('should have valid compatibility field', () => {
    for (const file of skillFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
      const parsed = parseYaml(frontmatter);

      expect(parsed.compatibility).toBeTruthy();
    }
  });
});
```

### 4.3 OpenSpec 变更验证

创建 `packages/plugin-commands/src/validation/openspec-validator.test.ts`：

```typescript
import { describe, expect, it, beforeAll } from 'vitest';
import { execSync } from 'child_process';

describe('OpenSpec Change Validation', () => {
  let changes: string[];

  beforeAll(() => {
    const output = execSync('openspec list --json', { encoding: 'utf-8' });
    changes = JSON.parse(output).changes.map((c: any) => c.name);
  });

  it('should have valid proposal.md', () => {
    for (const change of changes) {
      const proposalPath = `openspec/changes/${change}/proposal.md`;
      const content = readFileSync(proposalPath, 'utf-8');

      expect(content).toContain('## Why');
      expect(content).toContain('## What Changes');
      expect(content).toContain('## Capabilities');
      expect(content).toContain('## Impact');
    }
  });

  it('should have valid design.md', () => {
    for (const change of changes) {
      const designPath = `openspec/changes/${change}/design.md`;
      const content = readFileSync(designPath, 'utf-8');

      expect(content).toContain('## Context');
      expect(content).toContain('## Goals');
      expect(content).toContain('## Decisions');
    }
  });

  it('should have tasks.md with checkboxes', () => {
    for (const change of changes) {
      const tasksPath = `openspec/changes/${change}/tasks.md`;
      const content = readFileSync(tasksPath, 'utf-8');

      // 验证使用标准 checkbox 格式
      expect(content).toMatch(/^## \d+\. /m);           // 分组标题
      expect(content).toMatch(/^- \[ \] \d+\.\d+ /m);   // 未完成任务
      expect(content).toMatch(/^- \[x\] \d+\.\d+ /m);   // 已完成任务
    }
  });
});
```

---

## 5. Level 3: 集成测试

### 5.1 插件加载测试

扩展 `index.integration.test.ts`：

```typescript
import { beforeAll, describe, expect, it, vi } from 'vitest';
import plugin from './index';

describe('Plugin Integration', () => {
  let registeredPlugin: RegisteredPlugin;

  beforeAll(async () => {
    registeredPlugin = await plugin();
  });

  describe('Hook Registration', () => {
    const expectedHooks = [
      'tool.execute.before',
      'experimental.chat.system.transform',
      'session.idle',
      'experimental.session.compacting',
    ];

    for (const hookName of expectedHooks) {
      it(`should register ${hookName} hook`, () => {
        expect(registeredPlugin.hooks[hookName]).toBeDefined();
        expect(typeof registeredPlugin.hooks[hookName]).toBe('function');
      });
    }
  });

  describe('Hook Execution', () => {
    it('should execute tool.execute.before with valid input', async () => {
      const hook = registeredPlugin.hooks['tool.execute.before'];
      const result = await hook(
        { tool: 'read', sessionID: 'test', callID: 'test' },
        { args: {} }
      );
      expect(result).toBeUndefined();
    });

    it('should throw on prohibited commands', async () => {
      const hook = registeredPlugin.hooks['tool.execute.before'];
      await expect(
        hook(
          { tool: 'bash', sessionID: 'test', callID: 'test' },
          { args: { command: 'rm -rf /' } }
        )
      ).rejects.toThrow();
    });
  });
});
```

### 5.2 CLI 集成测试

创建 `packages/plugin-cli/src/commands/init.integration.test.ts`：

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('ospb init Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdirSync({ dir: tmpdir(), prefix: 'ospb-test-' });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should initialize workflow in empty directory', () => {
    // 模拟初始化流程
    execSync('pnpm exec ospb init', { cwd: testDir, stdio: 'pipe' });

    // 验证文件结构
    expect(existsSync(join(testDir, '.beads'))).toBe(true);
    expect(existsSync(join(testDir, 'openspec'))).toBe(true);
  });

  it('should detect existing tools', () => {
    // 预安装 openspec
    execSync('npm install -g openspec', { stdio: 'pipe' });

    const output = execSync('pnpm exec ospb init --json', {
      cwd: testDir,
      encoding: 'utf-8',
    });

    const result = JSON.parse(output);
    expect(result.tools.openspec).toBe(true);
  });
});
```

### 5.3 工作流状态测试

创建 `packages/plugin-core/src/workflow.integration.test.ts`：

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { WorkflowStateManager } from './workflow-state';

describe('Workflow State Integration', () => {
  let stateManager: WorkflowStateManager;

  beforeEach(() => {
    stateManager = new WorkflowStateManager();
  });

  it('should track task claim and release', async () => {
    // 1. Agent 认领任务
    await stateManager.claimTask('bd-123');
    expect(stateManager.getCurrentTask()).toBe('bd-123');
    expect(stateManager.canClaimNewTask()).toBe(false);

    // 2. 任务验证通过
    await stateManager.verifyTask('bd-123');
    expect(stateManager.isVerified()).toBe(true);

    // 3. 任务完成
    await stateManager.completeTask('bd-123');
    expect(stateManager.getCurrentTask()).toBe(null);
  });

  it('should enforce task sequence on verification failure', async () => {
    // 1. 认领任务
    await stateManager.claimTask('bd-123');

    // 2. 验证失败
    await stateManager.failVerification('bd-123', 'Test failed');

    // 3. 应该阻止认领新任务
    expect(stateManager.canClaimNewTask()).toBe(false);

    // 4. 必须完成当前任务
    await stateManager.completeTask('bd-123');
    expect(stateManager.canClaimNewTask()).toBe(true);
  });
});
```

---

## 6. Level 4: E2E 测试

### 6.1 Playwright 配置

创建 `e2e.config.ts`：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 6.2 工作流 E2E 测试

创建 `e2e/workflow.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';

test.describe('Workflow Plugin E2E', () => {
  test('complete workflow from propose to implement', async ({ page }) => {
    // 1. 启动探索模式
    await page.goto('/');
    await page.getByRole('textbox').fill('/workflow-explore 用户想要一个登录功能');
    await page.keyboard.press('Enter');

    // 2. 验证草案创建
    await expect(page.locator('.draft-created')).toBeVisible();

    // 3. 转换为 proposal
    await page.getByRole('button', { name: 'Propose' }).click();
    await expect(page.locator('.proposal-created')).toBeVisible();

    // 4. 生成 plan
    await page.getByRole('button', { name: 'Plan' }).click();
    await expect(page.locator('.plan-created')).toBeVisible();

    // 5. 创建任务
    await page.getByRole('button', { name: 'Create Tasks' }).click();
    await expect(page.locator('.tasks-created')).toBeVisible();
  });

  test('validation failure recovery', async ({ page }) => {
    // 1. Agent 认领验证任务
    await page.goto('/');
    await page.getByRole('textbox').fill('/workflow-start');
    await page.keyboard.press('Enter');

    // 2. 验证任务应该暂停 Agent
    await expect(page.locator('.agent-paused')).toBeVisible();

    // 3. codeReviewerAgent 执行验证
    await page.getByRole('button', { name: 'Run Verification' }).click();

    // 4. 验证失败，任务被 reopen
    await expect(page.locator('.tasks-reopened')).toBeVisible();
    await expect(page.locator('.validation-failure-reason')).toContainText('spec mismatch');
  });

  test('task claiming restriction', async ({ page }) => {
    await page.goto('/');

    // Agent 处于验证链中
    await page.evaluate(() => {
      // 模拟验证链状态
      window.workflowState.setValidationChain('bd-123');
    });

    // 尝试认领其他任务
    await page.getByRole('textbox').fill('bd claim bd-456');
    await page.keyboard.press('Enter');

    // 应该被拦截
    await expect(page.locator('.claim-blocked')).toBeVisible();
    await expect(page.locator('.block-reason')).toContainText('验证链中禁止切换任务');
  });
});
```

### 6.3 命令定义 E2E 测试

创建 `e2e/commands.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';

test.describe('Command Definitions E2E', () => {
  test('all commands appear in help', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').fill('/help');
    await page.keyboard.press('Enter');

    const expectedCommands = [
      '/init-workflow',
      '/workflow-explore',
      '/workflow-propose',
      '/workflow-plan',
      '/workflow-task',
      '/workflow-start',
    ];

    for (const cmd of expectedCommands) {
      await expect(page.locator(`text=${cmd}`)).toBeVisible();
    }
  });

  test('command parameter substitution', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').fill('/workflow-plan my-change');
    await page.keyboard.press('Enter');

    // 验证参数被正确传递
    await expect(page.locator('.plan-for-change')).toContainText('my-change');
  });
});
```

---

## 7. 测试执行脚本

### 7.1 package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:level1": "vitest run packages/*/src/**/*.test.ts",
    "test:level2": "vitest run packages/plugin-commands/src/validation/*.test.ts",
    "test:level3": "vitest run packages/*/src/*.integration.test.ts",
    "test:e2e": "playwright test",
    "test:all": "npm run test:level1 && npm run test:level2 && npm run test:level3"
  }
}
```

### 7.2 CI/CD 配置

创建 `.github/workflows/test.yml`：

```yaml
name: Test

on: [push, pull_request]

jobs:
  level1-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:level1
      - run: pnpm run test:coverage

  level2-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:level2

  level3-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:level3

  level4-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - run: pnpm exec playwright install --with-deps
      - run: pnpm run test:e2e
```

---

## 8. 测试矩阵

| 测试层级 | 覆盖内容 | 工具 | 触发时机 |
|---------|---------|------|---------|
| L1 单元 | 纯函数、状态逻辑 | Vitest | 每次 push |
| L2 验证 | YAML、文件结构 | Vitest | 每次 push |
| L3 集成 | 插件加载、Hook | Vitest | 每次 PR |
| L4 E2E | 完整工作流 | Playwright | 每次 release |

---

## 9. 覆盖率目标

| 包 | 语句覆盖 | 分支覆盖 | 函数覆盖 |
|----|---------|---------|---------|
| plugin-core | 80% | 75% | 85% |
| plugin-cli | 75% | 70% | 80% |
| plugin-commands | 70% | 65% | 75% |

---

## 10. Mock 策略

### 10.1 内部模块 Mock

```typescript
vi.mock('../workflow-state', () => ({
  getWorkflowState: vi.fn(),
  setWorkflowState: vi.fn(),
}));
```

### 10.2 外部命令 Mock

```typescript
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
}));
```

### 10.3 文件系统 Mock

```typescript
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});
```
