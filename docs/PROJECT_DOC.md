# ospb-workflow-plugin 项目文档

> OpenCode 插件 - 规范化开发工作流工具集

## 1. 项目概述

ospb-workflow-plugin 是一个 OpenCode 插件，提供标准化的工作流管理能力，将 OpenSpec 规范流程与 bd 任务跟踪系统深度集成。

**核心功能**：
- 规范化的工作流命令（init, explore, propose, plan, task, start, archive）
- TDD 支持（Test → Impl 依赖强制）
- Spec 验证门禁（Valid 任务必须通过 verify-code）
- 危险命令拦截（防止 git push -f 等）

## 2. 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      OpenCode Runtime                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            OspbWorkflowPlugin (index.ts)            │   │
│  │  ┌─────────────┐  ┌──────────────────────────────┐  │   │
│  │  │   Hooks     │  │        Workflow Tools       │  │   │
│  │  │ ─────────── │  │ ──────────────────────────  │  │   │
│  │  │ execute-    │  │ init-workflow               │  │   │
│  │  │ before      │  │ verify-code                 │  │   │
│  │  │ session-    │  │ workflow-explore            │  │   │
│  │  │ idle        │  │ workflow-propose           │  │   │
│  │  │ session-    │  │ workflow-plan              │  │   │
│  │  │ compacting   │  │ workflow-task              │  │   │
│  │  │             │  │ workflow-start             │  │   │
│  │  └─────────────┘  │ workflow-archive            │  │   │
│  │                   │ workflow-status            │  │   │
│  │                   │ plan-review                │  │   │
│  │                   └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      外部依赖                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │    bd     │  │ openspec │  │  文件系统  │  │  Agent   │  │
│  │  任务追踪  │  │  规范管理  │  │  状态持久  │  │  (Linus) │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 3. 目录结构

```
ospb-workflow-plugin/
├── packages/
│   ├── plugin-core/              # 核心插件（主要代码）
│   │   └── src/
│   │       ├── index.ts              # 插件入口
│   │       ├── bd.ts                 # bd CLI 封装
│   │       ├── workflow-tools.ts     # 12 个工作流工具
│   │       ├── verify-code.ts        # Spec 验证逻辑
│   │       ├── workflow-state.ts     # 内存状态管理
│   │       ├── tool-check.ts         # 工具注册检查
│   │       ├── hooks/                # Hook 实现
│   │       │   ├── execute-before.ts  # 命令拦截
│   │       │   ├── session-idle.ts   # 空闲提醒
│   │       │   ├── session-compacting.ts  # 状态持久化
│   │       │   └── chat-transform.ts # 聊天转换
│   │       └── validation/           # 验证器
│   │           ├── bd-metadata-validator.ts
│   │           ├── openspec-validator.ts
│   │           └── tool-validator.ts
│   ├── plugin-cli/                # CLI 工具包
│   └── plugin-commands/           # 命令定义包（预留）
├── .opencode/
│   ├── command/                   # 命令 Markdown 定义
│   │   ├── workflow-status.md
│   │   └── opsx-*.md
│   └── skills/                    # Skill 定义
│       ├── openspec-propose/
│       ├── openspec-explore/
│       ├── openspec-apply-change/
│       └── openspec-archive-change/
└── docs/                          # 本文档
```

## 4. 工具清单

### 4.1 init-workflow

初始化工作环境。

```typescript
// 参数：无
execute(args: {}, context): Promise<string>
```

**行为**：
1. 执行 `bd init --quiet`
2. 执行 `openspec init --tools opencode`
3. 创建/更新 `openspec/config.yaml`，设置 `lang: zh`

---

### 4.2 verify-code

验证实现是否符合 Spec 要求。

```typescript
// 参数
args: { taskId: string }
```

**完整流程**：

```
用户调用 verify-code <taskId>
         │
         ▼
┌─────────────────────────────┐
│ 1. bd show <taskId>        │ 读取任务描述，解析 Spec-ref
│    parseSpecRef(taskId)    │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. 读取 Spec 文件            │ 根据 spec-path#requirement
│    extractRequirementSection│ 定位 spec 中的需求章节
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 3. 检查输出是否存在           │ checkOutputExists()
│    (当前为占位符实现)         │ TODO: 应运行测试/检查文件
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 4. 关闭 Valid 任务           │ bd close <taskId>
│    关闭对应 Spec 任务         │ findSpecTaskForRef()
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. state.markVerified()      │ 标记为已验证
└─────────────────────────────┘
```

**输出示例**：
```
✓ Verification passed for ospb-worflow-plugin-hqq
Spec-ref: spec.md#requirement
Verification passed
```

---

### 4.3 workflow-explore

探索需求，澄清范围。

```typescript
args: {
  requirement: string,       // 需求描述
  draftName?: string         // 可选的草案名称
}
```

**行为**：
1. 在 `workflow/drafts/` 创建 Markdown 草案
2. 可选调用 explore agent 填充草案内容
3. 返回草案路径

---

### 4.4 workflow-propose

将草案转换为 OpenSpec 文档。

```typescript
args: {
  draftName?: string
}
```

**行为**：
1. 读取草案内容
2. 执行 `openspec new change "<draftName>"`
3. 在 `openspec/changes/<draftName>/` 生成文档：
   - `proposal.md`
   - `design.md`
   - `tasks.md`

---

### 4.5 workflow-plan

从 OpenSpec 生成实现计划。

```typescript
args: {
  specName?: string
}
```

**行为**：
1. 执行 `openspec plan "<specName>"`
2. 生成 `.workflow/plans/<specName>.md`
3. 提示运行 `plan-review` 审查

---

### 4.6 workflow-task ⚠️ 待完善

从实现计划创建 bd 任务。

```typescript
args: {
  planName?: string
}
```

**当前行为**：
1. 读取 `.workflow/plans/<planName>.md`
2. 解析 `Spec-task-ref` 和 `Spec-ref` 标记
3. 调用 `openspec task "<planName>"`
4. 为每个 Spec-ref 创建 Valid 任务

**已知问题**：当前版本**未创建 Impl/Test 任务**，TDD 依赖未自动建立。

---

### 4.7 workflow-start

开始执行工作流任务。

```typescript
args: {}
```

**行为**：
1. 执行 `bd ready --json` 获取就绪任务
2. 尝试调用 Linus agent（编排器）
3. 回退：显示任务列表并指导手动执行

**Linus Agent**（如果可用）：
- 读取 `bd ready` 队列
- 按类型分组（Impl:/Test:/Valid:/Other）
- 认领并协调任务执行
- 调用 code-reviewer 进行验证

---

### 4.8 workflow-archive

归档已完成的变更。

```typescript
args: {
  changeName?: string
}
```

**行为**：
1. 备份草案到 `.archive/`
2. 执行 `openspec archive "<changeName>"`
3. 清理相关文件

---

### 4.9 workflow-status

查看工作流状态。

```typescript
args: {
  spec?: string,    // 按 Spec-ref 过滤
  all?: boolean     // 包含已关闭任务
}
```

**输出示例**：
```
## 工作流状态

### spec.md#requirement
- [Impl] ospb-worflow-plugin-abc1 - 实现功能A (○ open)
- [Test] ospb-worflow-plugin-abc2 - 测试功能A (○ open)
- [Valid] ospb-worflow-plugin-xyz - 验证 spec.md#requirement (○ open)

依赖: Impl → Test → Valid

### 全局统计
总任务: 16
进行中: 2
已完成: 8
```

---

### 4.10 plan-review

审查实现计划质量。

```typescript
args: {
  planName: string,
  autoFix?: boolean
}
```

**行为**：
1. 读取计划文件
2. 调用 plan-reviewer agent 审查
3. 检查项：
   - Spec refs 是否完整
   - 是否有 Test/Valid 标记
   - 步骤粒度是否合理
4. 可选自动修复

## 5. Hook 系统

### 5.1 tool.execute.before

命令执行前拦截，主要功能：

**1. 危险命令拦截**

```typescript
const PROHIBITED_PATTERNS = [
  /git\s+push\s+(-f|--force)/i,    // 禁止强制推送
  /rm\s+-rf\s+\//i,                 // 禁止递归删除根目录
  /:\s*!/,                          // 禁止命令注入
  /\$\(\s*rm/i,                     // 禁止 $() 执行的 rm
];
```

**2. 任务认领验证**

```
用户执行: bd update <id> --claim
            │
            ▼
┌─────────────────────────────────┐
│ 1. 检查 canClaimNewTask()       │
│    - requiresVerification=false │ → 允许
│    - currentTask=null          │ → 允许
│    - isVerified=true           │ → 允许
│    - 否则                     │ → 拒绝
└─────────────────────────────────┘
            │
            ▼（如果是 Valid 任务）
┌─────────────────────────────────┐
│ 3. 检查 isVerified              │
│    - 已验证 → 允许              │
│    - 未验证 → 提示运行 verify-code │
└─────────────────────────────────┘
```

### 5.2 session.idle

空闲时提醒未验证的任务。

### 5.3 experimental.session.compacting

压缩会话时持久化/恢复工作流状态。

## 6. TDD 工作流

### 6.1 正确的任务依赖链

```
Test: xxx  ──blocks──▶  Impl: xxx  ──blocks──▶  Valid: spec-ref
   ↑                              │
   └──────────────────────────────┘
         (Valid 被 Impl 阻塞)
```

### 6.2 createTddTaskPair 实现

```typescript
// bd.ts
async function createTddTaskPair(description, specRef) {
  // 1. 创建 Impl 任务
  const implTask = await createImplTask(description, specRef);
  
  // 2. 创建 Test 任务
  const testTask = await createTestTask(description, specRef);
  
  // 3. 添加依赖：Impl blocked by Test
  //    (Impl 必须等 Test 完成后才能进行)
  const dependency = await addTaskDependency(
    implTask.taskId,    // blocked
    testTask.taskId     // blocking
  );
  
  return { implTask, testTask, dependency };
}
```

### 6.3 依赖方向说明

```
addTaskDependency(A, B, "blocks")
   表示：A 被 B 阻塞（B 完成后 A 才能进行）

createTddTaskPair:
  addTaskDependency(impl, test) 
  → Impl 被 Test 阻塞（Test 先完成）

generateValidTasksFromPlan:
  addTaskDependency(valid, impl)
  → Valid 被 Impl 阻塞（Impl 完成后才能验证）
```

## 7. 状态管理

### 7.1 WorkflowState 接口

```typescript
interface WorkflowState {
  currentTask: string | null;      // 当前任务 ID
  isVerified: boolean;            // 是否已验证
  requiresVerification: boolean;  // 是否需要验证
  
  setCurrentTask(taskId: string): void;
  markVerified(): void;
  canClaimNewTask(): boolean;     // 核心判断逻辑
  setRequiresVerification(value: boolean): void;
}
```

### 7.2 canClaimNewTask 逻辑

```typescript
canClaimNewTask(): boolean {
  if (!this.requiresVerification) return true;  // 不需要验证
  if (!this.currentTask) return true;            // 无当前任务
  return this.isVerified;                         // 必须已验证
}
```

## 8. 快速上手

### 8.1 安装

```bash
# 克隆项目
git clone https://github.com/0xmaxbu/ospb-worflow-plugin.git
cd ospb-workflow-plugin

# 构建插件
cd packages/plugin-core
pnpm install
pnpm build

# 链接到目标项目
cd packages/plugin-core
bun link

cd /path/to/your-project
bun link @ospb/plugin-core
```

### 8.2 配置

在目标项目的 `opencode.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/absolute/path/to/ospb-workflow-plugin/packages/plugin-core/dist/index.js"
  ]
}
```

### 8.3 使用流程

```
1. /init-workflow          # 初始化环境
2. /workflow-explore        # 探索需求
3. /workflow-propose        # 生成 OpenSpec 文档
4. /workflow-plan          # 生成实现计划
5. /workflow-task          # 创建任务
6. /workflow-start         # 开始执行
   │
   ├─ Test: xxx           # 编写测试
   ├─ Impl: xxx           # 实现功能  
   └─ Valid: spec-ref     # 验证实现
7. /workflow-archive       # 归档完成
```

## 9. 已知问题

### 9.1 workflow-task 未创建 TDD 任务

**问题**：`workflow-task` 工具只创建了 Valid 任务，没有创建 Impl/Test 任务。

**状态**：待修复

### 9.2 generateValidTasksFromPlan 依赖方向

**问题**：在某些路径下，Valid 任务的依赖方向可能不符合预期。

**建议**：验证 `addTaskDependency(validTaskId, outputTaskId)` 的调用顺序。

### 9.3 checkOutputExists 为占位符

**问题**：验证时的输出检查逻辑未完整实现。

**建议**：应运行测试或检查生成的文件。

### 9.4 测试超时

**问题**：`workflowStatusTool` 的 6 个测试超时。

**原因**：测试中 mock 未正确拦截 `execAsync` 调用，导致实际执行了 `bd` 命令。

## 10. 开发指南

### 10.1 添加新工具

1. 在 `workflow-tools.ts` 中定义 tool：
```typescript
export const myTool = tool({
  description: '工具描述',
  args: {
    param: z.string().describe('参数描述'),
  },
  async execute(args, context) {
    // 实现逻辑
  },
});
```

2. 在 `index.ts` 的 `workflowTools` 对象中注册：
```typescript
export const workflowTools = {
  myTool,
  // ...其他工具
};
```

### 10.2 添加新 Hook

1. 在 `hooks/` 目录创建实现文件
2. 在 `index.ts` 中注册：
```typescript
function createHooks(): RegisteredHooks {
  return {
    'tool.execute.before': myHook,
    // ...
  };
}
```

### 10.3 测试

```bash
cd packages/plugin-core
pnpm test          # 运行所有测试
pnpm run test:unit  # 单元测试
```

## 11. 相关资源

- [OpenCode 插件文档](https://opencode.ai/docs/plugins/)
- [OpenSpec CLI](https://github.com/0xmaxbu/openspec)
- [bd (beads) 任务追踪](https://github.com/0xmaxbu/beads)
