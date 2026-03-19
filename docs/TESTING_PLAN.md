# 测试方案 - ospb-workflow-plugin

## 1. 项目测试现状

| 指标 | 状态 |
|-----|------|
| 测试框架 | Vitest |
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
