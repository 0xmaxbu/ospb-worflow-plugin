## 1. 项目结构搭建

- [x] 1.1 初始化 Monorepo 结构（pnpm workspaces 或 npm workspaces）
- [x] 1.2 创建 packages 目录结构
- [x] 1.3 添加 root package.json（包含 workspaces 配置）
- [x] 1.4 配置 Turborepo 或类似的构建工具

## 2. 核心插件包 (packages/plugin-core)

### 2.1 目录与配置
- [x] 2.1.1 创建 packages/plugin-core 目录
- [x] 2.1.2 初始化 plugin-core 的 package.json（声明 @opencode-ai/plugin 依赖）
- [x] 2.1.3 创建 TypeScript 配置（tsconfig.json）

### 2.2 工作流状态管理模块 (TDD: 测试先行)
- [x] 2.2.1 **编写单元测试** `src/workflow-state.test.ts`（验证状态管理逻辑）
- [x] 2.2.2 实现 `src/workflow-state.ts`（让测试通过）

### 2.3 工具检查功能 (TDD: 测试先行)
- [x] 2.3.1 **编写单元测试** `src/tool-check.test.ts`（验证工具检测逻辑）
- [x] 2.3.2 实现 `src/tool-check.ts`（让测试通过）

### 2.4 Hook 实现

#### 2.4.1 tool.execute.before Hook（命令拦截）
- [x] 2.4.1.1 **编写单元测试** `src/hooks/execute-before.test.ts`
- [x] 2.4.1.2 实现 `src/hooks/execute-before.ts`（包含 Workflow Guard 逻辑）
- [x] 2.4.1.3 实现拦截 `bd claim` 命令验证
- [x] 2.4.1.4 实现拦截禁止的 bash 命令

#### 2.4.2 chat.params Hook（注入工作流上下文）
- [x] 2.4.2.1 **编写单元测试** `src/hooks/chat-transform.test.ts`
- [x] 2.4.2.2 实现 `src/hooks/chat-transform.ts`（注入工作流上下文）

#### 2.4.3 session.idle Hook
- [x] 2.4.3.1 **编写单元测试** `src/hooks/session-idle.test.ts`
- [x] 2.4.3.2 实现 `src/hooks/session-idle.ts`（验证检查）

#### 2.4.4 experimental.session.compacting Hook
- [x] 2.4.4.1 **编写单元测试** `src/hooks/session-compacting.test.ts`
- [x] 2.4.4.2 实现 `src/hooks/session-compacting.ts`（状态持久化）

### 2.5 插件入口与集成测试
- [x] 2.5.1 实现插件入口函数 `src/index.ts`（注册所有 Hooks）
- [x] 2.5.2 **编写集成测试** `src/index.integration.test.ts`
- [ ] 2.5.3 在本地 OpenCode 环境测试插件加载

## 3. CLI 包 (packages/plugin-cli)

### 3.1 目录与配置
- [x] 3.1.1 创建 packages/plugin-cli 目录
- [x] 3.1.2 初始化 plugin-cli 的 package.json（声明 bin 字段）

### 3.2 初始化命令 (TDD: 测试先行)
- [x] 3.2.1 **编写单元测试** `src/commands/init.test.ts`
- [x] 3.2.2 实现 `src/commands/init.ts`（ospb init 命令）
- [x] 3.2.3 实现工具检测逻辑（openspec、beads）
- [ ] 3.2.4 实现交互式配置向导

## 4. 命令定义包 (packages/plugin-commands)

- [x] 4.1 创建 packages/plugin-commands 目录
- [x] 4.2 初始化 plugin-commands 的 package.json
- [x] 4.3 复制现有 .opencode/command/*.md 文件
- [x] 4.4 复制现有 .opencode/skills/*.md 文件
- [x] 4.5 验证命令定义格式

## 5. 构建和发布配置

- [x] 5.1 配置 ESBuild 或 Rollup 进行构建
- [x] 5.2 配置 package.json 的 build 和 prepublish 脚本
- [x] 5.3 创建 .npmignore 和 LICENSE 文件
- [x] 5.4 配置 TypeScript 编译选项（Declaration、Module 等）

## 6. 端到端测试

- [ ] 6.1 测试工作流验证功能（Workflow Guard）
- [ ] 6.2 测试 CLI 命令（ospb init）
- [ ] 6.3 测试命令定义文件是否正确识别
