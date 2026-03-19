# ospb-workflow-plugin

OpenCode 插件 - 规范化开发工作流工具集

## 功能概述

- **工作流工具**: `/init-workflow`, `/verify-code`, `/workflow-explore`, `/workflow-propose`, `/workflow-plan`, `/workflow-task`, `/workflow-start`, `/workflow-archive`, `/plan-review`
- **Hook 拦截器**: `tool.execute.before` (防止危险命令、验证任务认领)
- **会话管理**: `session.idle`, `session.compacting`

---

## 集成到项目

### 方式一：本地插件（推荐开发时使用）

#### 步骤 1：构建插件

```bash
cd packages/plugin-core
pnpm install
pnpm build
```

#### 步骤 2：链接插件

```bash
cd packages/plugin-core
bun link

# 然后在目标项目中链接
cd /path/to/your-project
bun link @ospb/plugin-core
```

#### 步骤 3：配置插件

在目标项目的 `opencode.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/absolute/path/to/packages/plugin-core/dist/index.js"
  ]
}
```

---

### 方式二：发布到 npm（推荐生产环境）

#### 步骤 1：发布包

```bash
cd packages/plugin-core
npm publish --access public
```

#### 步骤 2：在目标项目安装

```bash
npm install @ospb/plugin-core
```

#### 步骤 3：配置

```json
{
  "plugin": [
    "@ospb/plugin-core"
  ]
}
```

---

## 目录结构要求

OpenCode 插件加载顺序：

1. 全局配置 (`~/.config/opencode/opencode.json`)
2. 项目配置 (`opencode.json`)
3. 全局插件目录 (`~/.config/opencode/plugins/`)
4. 项目插件目录 (`.opencode/plugins/`)

### 本地开发目录结构

```
~/.config/opencode/
├── opencode.json      # 全局配置
├── plugins/           # 全局插件
│   └── my-plugin.ts
└── package.json       # 插件依赖（可选）

your-project/
├── opencode.json      # 项目配置
├── .opencode/
│   ├── plugins/      # 项目插件
│   │   └── my-plugin.ts
│   └── package.json  # 插件依赖
└── ...
```

---

## 插件配置

### 在 opencode.json 中注册

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///path/to/ospb-workflow-plugin",
    "@ospb/plugin-core@latest"
  ]
}
```

### 使用包管理器依赖

如果插件需要外部包，在 `.opencode/package.json` 中声明：

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "latest",
    "zod": "^4.0.0"
  }
}
```

OpenCode 启动时会自动运行 `bun install`。

---

## 验证插件是否加载成功

### 方法 1：查看日志

```bash
opencode --verbose
```

### 方法 2：检查工具注册

启动会话后，输入 `/` 查看可用工具列表，应该能看到：
- `init-workflow`
- `verify-code`
- `workflow-explore`
- 等等

### 方法 3：测试命令

```bash
# 初始化工作流
/init-workflow

# 查看就绪任务
/workflow-start
```

---

## 快速开始

### 完整集成步骤

```bash
# 1. 克隆插件项目
git clone https://github.com/0xmaxbu/ospb-worflow-plugin.git
cd ospb-worflow-plugin

# 2. 安装依赖并构建
cd packages/plugin-core
pnpm install
pnpm build

# 3. 链接到目标项目
bun link
cd /path/to/your-project
bun link @ospb/plugin-core

# 4. 配置 opencode.json
echo '{
  "plugin": ["/path/to/ospb-workflow-plugin/packages/plugin-core/dist/index.js"]
}' >> opencode.json

# 5. 启动 OpenCode 测试
opencode
```

---

## 工作流命令

| 命令 | 描述 |
|------|------|
| `/init-workflow` | 初始化工作流环境（bd init + openspec init） |
| `/verify-code` | 验证实现是否符合 Spec 要求 |
| `/workflow-explore` | 探索需求，澄清范围 |
| `/workflow-propose` | 将探索草案转换为 OpenSpec 文档 |
| `/workflow-plan` | 从 OpenSpec 生成详细实现计划 |
| `/workflow-task` | 从实现计划创建 bd 任务 |
| `/workflow-start` | 开始执行 bd ready 队列中的任务 |
| `/workflow-archive` | 归档已完成的变更 |
| `/plan-review` | 审查实现计划的质量和完整性 |

---

## 常见问题

### Q: 插件加载失败？

检查：
1. `opencode.json` 中的路径是否正确（使用绝对路径）
2. 插件包是否正确构建（检查 `dist/index.js` 是否存在）
3. 运行 `opencode --verbose` 查看详细错误

### Q: 工具不可用？

1. 确认插件已加载（查看日志）
2. 确认 `hooks.tool` 已正确注册
3. 检查 `packages/plugin-core/src/index.ts` 中的导出

### Q: 依赖缺失？

在 `.opencode/package.json` 中添加依赖后，运行：

```bash
cd .opencode
bun install
```

---

## 官方资源

- **官方文档**: https://opencode.ai/docs/plugins/
- **Plugin SDK**: `@opencode-ai/plugin`
- **官方示例**: https://gist.github.com/rstacruz/946d02757525c9a0f49b25e316fbe715

---

## 项目结构

```
ospb-worflow-plugin/
├── packages/
│   ├── plugin-core/      # 核心插件包
│   │   └── src/
│   │       ├── hooks/   # Hook 实现
│   │       ├── workflow-tools.ts  # 工作流工具
│   │       ├── verify-code.ts    # 验证逻辑
│   │       ├── bd.ts            # bd CLI 封装
│   │       └── workflow-state.ts # 状态管理
│   ├── plugin-cli/      # CLI 包
│   └── plugin-commands/  # 命令定义包
├── openspec/             # OpenSpec 变更定义
└── docs/                # 文档
```
