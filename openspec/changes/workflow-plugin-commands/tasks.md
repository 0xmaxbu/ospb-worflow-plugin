## 1. 工作流工具定义 (TypeScript Tools)

> **实现方式**: 使用 OpenCode Plugin SDK 的 `tool()` 函数定义 TypeScript Tools
> **注册位置**: `packages/plugin-core/src/index.ts` 的 `hooks.tool` 对象

- [ ] 1.1 实现 `init-workflow` Tool
  - **输入**: 无
  - **输出**: 工作环境初始化完成
  - **执行**: `bd init --quiet` + `openspec init --tools opencode` + 创建/更新 `openspec/config.yaml` (lang: zh)
  - **Spec-ref**: `workflow-plugin-core/spec.md` - "init-workflow 工具"

- [ ] 1.2 实现 `workflow-explore` Tool
  - **输入**: 用户需求描述 (可选参数)
  - **输出**: 在 `./workflow/drafts/` 下生成需求草案文件
  - **行为规范**:
    1. 启动**探索 Agent** (非 subAgent) 与用户进行对话式需求讨论
    2. 探索 Agent **主动提问**引导需求澄清 (是什么？为什么？期望结果？)
    3. 将需求关键内容增量写入 `./workflow/drafts/<draft-name>.md`
    4. 草案文件名使用英文 kebab-case
    5. 通过 `context.ask()` 与用户确认草案方向
  - **探索 Agent 职责**:
    - 直接与用户对话提问 (注: subAgent 无法与用户对话)
    - 理解用户原始需求
    - 发现隐性需求和约束
    - 记录关键技术决策
  - **Spec-ref**: `workflow-plugin-core/spec.md` - "workflow-explore 工具"

- [ ] 1.3 实现 `workflow-propose` Tool
  - **输入**: 草案名称 (可选，无参数时列出所有草案)
  - **输出**: 生成 OpenSpec 文档 (proposal.md, design.md, specs/*)
  - **执行**: 调用 `openspec-propose` Skill 生成 OpenSpec artifacts
  - **Spec-ref**: `workflow-plugin-core/spec.md` - "workflow-propose 工具"

- [ ] 1.4 实现 `workflow-plan` Tool
  - **输入**: OpenSpec change 名称
  - **输出**: `.workflow/plans/<change-name>.md`
  - **行为规范**:
    1. 读取对应 spec 文档
    2. **Planner Agent** 生成可执行计划，步骤粒度达到**可独立验证**程度
    3. **Planner Agent 同时确定任务依赖关系**，使用 DAG 结构
    4. 每个步骤标注 `Spec-task-ref` (小任务) 或 `Spec-ref` (阶段)
    5. 计划生成后**自动触发** Plan Review (调用 plan reviewer Agent)
  - **依赖关系确定**: 由同一 Planner Agent 在规划时确定，而非独立 Agent
    - **证据来源**: 
      - Anthropic Orchestrator-workers 模式: "central LLM dynamically breaks down tasks and delegates" (https://www.anthropic.com/research/building-effective-agents)
      - DAG-based planning 研究: DAG 结构比线性规划效率高 52.8% (https://arxiv.org/html/2406.09953v1)
      - OpenAI Agent Guide: "Make sure every step corresponds to a specific action" (https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
  - **Plan Review 触发**: 通过 hook 调起 plan reviewer Agent
  - **Spec-ref**: `workflow-plugin-core/spec.md` - "workflow-plan 工具"

- [ ] 1.5 实现 `workflow-task` Tool
  - **输入**: 计划文件名
  - **输出**: 创建 bd 任务 + 生成 `.workflow/bd.md` 任务依赖图
  - **行为规范**:
    1. 读取计划文件中 **Planner Agent 已确定的依赖关系**
    2. **解析 Spec-task-ref 标注**: 创建 Validate 任务 (blocked by 产出任务)
    3. **解析 Spec-ref 标注**: 创建阶段级 Validate 任务 (blocked by 该阶段所有产出)
    4. **TDD 强制**: 实现任务的测试任务作为 blocker
    5. 通过 `$.bash('bd create ...')` 创建任务
    6. 通过 `$.bash('bd dep add ...')` 建立依赖关系（由 Planner Agent 确定）
    7. 生成并同步 `.workflow/bd.md` 任务依赖关系图
  - **职责说明**: 
    - **Planner Agent** (1.4): 确定任务依赖关系
    - **workflow-task Tool** (1.5): 仅解析并执行 bd 命令，不分析依赖
  - **依赖关系模板** (`.workflow/bd.md`):
    ```yaml
    tasks:
      - id: task-1
        title: "描述"
        spec-ref: "spec.md#requirement-name"  # 追溯来源
      - id: task-2
        title: "描述"
        spec-task-ref: "spec.md#requirement-name"  # 小任务
        blocked-by: [task-1, validate-task-1]
    ```
  - **Spec-ref**: 
    - `workflow-plugin-core/spec.md` - "workflow-task 工具"
    - `workflow-task-manager/spec.md` - 任务与依赖管理

- [ ] 1.6 实现 `workflow-start` Tool
  - **输入**: 无
  - **输出**: 执行 bd ready 任务
  - **行为规范**:
    1. 读取 `bd ready --json` 获取就绪任务
    2. 按依赖顺序执行
    3. **认领监听**: 拦截 `bd claim/update --claim`，暂停 Agent
    4. **验证流程**: 认领验证任务时调用 codeReviewerAgent
    5. **失败恢复**: 验证失败则 reopen 从上一个验证点到失败点的所有任务
    6. **认领拦截**: 验证链执行期间禁止切换到其他任务
  - **Spec-ref**: 
    - `workflow-plugin-core/spec.md` - "workflow-start 工具"
    - `workflow-executor/spec.md` - 验证与失败恢复

## 2. Plan Review 功能

> **说明**: Plan Review 在 1.4 workflow-plan 中自动触发，此处定义其具体实现

- [ ] 2.1 定义 plan reviewer Agent 调用接口
  - **调用方式**: 通过 SDK Client 启动 subAgent
  - **输入**: 计划文件内容 + spec 文档
  - **输出**: 审查报告 (通过/需修改/具体问题)
  - **Spec-ref**: `workflow-plan-review/spec.md`

- [ ] 2.2 定义审查维度清单
  - **维度**:
    1. Spec 符合性: 计划步骤是否覆盖 spec 要求
    2. 完整性: 是否有遗漏的关键步骤
    3. 可执行性: 步骤粒度是否达到可独立执行
    4. 依赖合理性: 任务依赖是否正确
    5. TDD 合规性: 实现任务是否被测试任务阻塞
  - **Spec-ref**: `workflow-plan-review/spec.md`

- [ ] 2.3 实现审查问题与用户沟通流程
  - **沟通方式**: 通过 `context.ask()` 向用户确认修改
  - **流程**: 审查失败 → 提出修改建议 → 用户确认 → 更新计划
  - **Spec-ref**: `workflow-plan-review/spec.md`

## 3. Task Manager 功能

> **bd 依赖说明**: bd (beads) 是外部 CLI 工具，插件通过 `$.bash()` 调用，不实现 bd 本身

- [ ] 3.1 调用 `bd create` 创建任务
  - **命令格式**: `$.bash('bd create "title" -t task|feature -p 0-4 --json')`
  - **Spec-ref**: `workflow-task-manager/spec.md`

- [ ] 3.2 调用 `bd dep add` 管理任务依赖关系
  - **命令格式**: `$.bash('bd dep add <blocked> <blocking> --type blocks --json')`
  - **Spec-ref**: `workflow-task-manager/spec.md`

- [ ] 3.3 实现 TDD 测试阻塞机制
  - **规则**: feature 类型任务的测试任务必须先完成
  - **实现**: 创建 feature 任务时，自动创建对应的 test 任务作为 blocker
  - **Spec-ref**: `workflow-task-manager/spec.md` - "TDD 强制执行"

- [ ] 3.4 实现验证任务生成逻辑
  - **规则**:
    - `Spec-task-ref` 标注 → 创建 Validate 任务
    - `Spec-ref` 标注 → 创建阶段级 Validate 任务
  - **Spec-ref**: `workflow-task-manager/spec.md` - "验证任务生成"

## 4. Executor 功能

- [ ] 4.1 实现任务认领监听器
  - **Hook**: `tool.execute.before` 拦截 `bd claim/update --claim`
  - **行为**: 记录当前认领状态，触发验证流程
  - **Spec-ref**: `workflow-executor/spec.md`

- [ ] 4.2 实现 codeReviewerAgent 调用逻辑
  - **调用方式**: 通过 SDK Client 启动 codeReviewerAgent
  - **输入**: 任务上下文 + 对应的 spec 引用
  - **输出**: 验证结果 (pass/fail + 原因)
  - **Spec-ref**: `workflow-executor/spec.md`

- [ ] 4.3 实现验证失败恢复流程
  - **流程**:
    1. codeReviewerAgent 返回失败
    2. 定位上一个成功验证点到失败点的任务
    3. 调用 `bd reopen <task-id>` 重新打开任务
    4. 将失败原因告知 Agent
  - **Spec-ref**: `workflow-executor/spec.md`

- [ ] 4.4 实现任务认领拦截器
  - **规则**: 验证链执行期间，Agent 只能认领验证链上的任务
  - **实现**: 
    1. 维护验证链状态 (当前验证任务 + 已完成验证)
    2. 拦截 `bd claim` 时检查目标任务是否在链上
    3. 不在链上则抛出错误
  - **Spec-ref**: `workflow-executor/spec.md`

## 5. 测试配置与执行

- [ ] 5.1 配置 vitest.config.ts 测试框架
- [ ] 5.2 创建 tests/setup.ts 测试环境初始化
- [ ] 5.3 配置 package.json 测试脚本（test:level1, test:level2, test:level3, test:e2e）
- [ ] 5.4 创建 .github/workflows/test.yml CI/CD 配置

## 6. Mock 工厂

- [ ] 6.1 创建 tests/helpers/mock-context.ts Mock Context 工厂
- [ ] 6.2 创建 tests/helpers/mock-client.ts SDK Client Mock
- [ ] 6.3 创建 tests/helpers/mock-shell.ts Shell Mock

## 7. 单元测试

- [ ] 7.1 补充 workflow-state.test.ts 状态转换测试
- [ ] 7.2 补充 execute-before.test.ts Hook 拦截边界测试
- [ ] 7.3 补充 session-idle.test.ts 会话空闲测试
- [ ] 7.4 补充 chat-transform.test.ts Chat 转换测试

## 8. 结构验证测试

- [ ] 8.1 创建 packages/plugin-core/src/validation/tool-validator.test.ts 工具定义验证
- [ ] 8.2 创建 packages/plugin-core/src/validation/bd-metadata-validator.test.ts bd 元数据验证
- [ ] 8.3 创建 packages/plugin-core/src/validation/openspec-validator.test.ts OpenSpec 变更验证

## 9. 集成测试

- [ ] 9.1 创建 packages/plugin-core/src/workflow.integration.test.ts 工作流集成测试
- [ ] 9.2 创建 packages/plugin-core/src/index.sdk-integration.test.ts SDK 集成测试
- [ ] 9.3 创建 packages/plugin-cli/src/commands/init.integration.test.ts CLI 集成测试

## 10. E2E 测试

- [ ] 10.1 创建 e2e.config.ts Playwright 配置
- [ ] 10.2 创建 e2e/workflow.spec.ts 工作流 E2E 测试
- [ ] 10.3 创建 e2e/tools.spec.ts 工具调用 E2E 测试
- [ ] 10.4 创建 e2e/validation.spec.ts 验证流程 E2E 测试

## 11. 验证机制测试

- [ ] 11.1 创建 tests/mocks/code-reviewer-agent.mock.ts codeReviewerAgent Mock
- [ ] 11.2 创建 tests/mocks/plan-reviewer-agent.mock.ts plan reviewer Agent Mock
- [ ] 11.3 创建 validation/verify-task.test.ts 验证任务触发测试
- [ ] 11.4 创建 validation/fail-recovery.test.ts 验证失败恢复测试
- [ ] 11.5 创建 validation/task-claiming.test.ts 任务认领拦截测试
- [ ] 11.6 创建 validation/validation-chain.test.ts 验证链状态测试

## 12. 覆盖率验收

- [ ] 12.1 运行 test:coverage 生成覆盖率报告
- [ ] 12.2 验证 plugin-core 达到 80% 语句覆盖
- [ ] 12.3 验证 plugin-cli 达到 75% 语句覆盖
- [ ] 12.4 验证 plugin-commands 达到 70% 语句覆盖

---

## Spec 映射表

| Task | Spec 文件 | 对应 Requirement |
|------|-----------|------------------|
| 1.1 | workflow-plugin-core | init-workflow 工具 |
| 1.2 | workflow-plugin-core | workflow-explore 工具 |
| 1.3 | workflow-plugin-core | workflow-propose 工具 |
| 1.4 | workflow-plugin-core | workflow-plan 工具 |
| 1.4 | workflow-plan-review | Plan Review 机制 |
| 1.5 | workflow-plugin-core | workflow-task 工具 |
| 1.5 | workflow-task-manager | 任务与依赖管理 |
| 1.6 | workflow-plugin-core | workflow-start 工具 |
| 1.6 | workflow-executor | 验证与失败恢复 |
| 2.1-2.3 | workflow-plan-review | Plan Review 功能 |
| 3.1-3.4 | workflow-task-manager | Task Manager 功能 |
| 4.1-4.4 | workflow-executor | Executor 功能 |
