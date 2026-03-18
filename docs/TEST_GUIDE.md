# OSPB Workflow Plugin 测试指南

## 本地测试方案（无需发布到 npm）

OpenCode 支持直接从本地文件加载插件，有两种方式：

### 方式 1: 自动发现（推荐）⭐

```
项目目录/
├── .opencode/
│   ├── plugins/           ← 插件放这里！
│   │   └── ospb-workflow-plugin.ts
│   └── opencode.json     ← 可选
└── package.json
```

OpenCode 会自动扫描 `.opencode/plugins/` 目录中的 `.ts` 文件并加载。

### 方式 2: file:// 显式引用

```json
{
  "plugins": [
    "file:///absolute/path/to/ospb-workflow-plugin.ts"
  ]
}
```

---

## 环境准备

### 1. 复制插件文件到测试项目

```bash
# 假设你的测试项目在 ~/test-project
cp .opencode/plugins/ospb-workflow-plugin.ts ~/test-project/.opencode/plugins/
```

### 2. 确保依赖已安装

OpenCode 会自动在 `.opencode/` 目录运行 `bun install`，确保 `@opencode-ai/plugin` 可用。

### 3. 启动 OpenCode

```bash
cd ~/test-project
opencode
```

插件应该自动加载，无报错即可。

---

## 测试用例

### 模块 1: 工作流状态管理 (workflow-state)

#### TC-WF-01: 初始化状态
```
预期: currentTask = null, isVerified = false, requiresVerification = true
验证方式: 启动新 session，检查状态
```

#### TC-WF-02: 设置当前任务
```
操作: 在 OpenCode 中执行任务相关命令
预期: currentTask 更新为当前任务 ID
```

#### TC-WF-03: 标记任务已验证
```
操作: 使用验证命令标记任务完成
预期: isVerified = true
```

#### TC-WF-04: 重置状态
```
操作: 任务切换或 session 结束
预期: currentTask = null, isVerified = false
```

---

### 模块 2: 工具检测 (tool-check)

#### TC-TC-01: 检测 openspec
```bash
# 在 OpenCode 终端中执行
openspec --version
```
**预期**: 返回版本号，工具可用

#### TC-TC-02: 检测 beads
```bash
bd --version
```
**预期**: 返回版本号，工具可用

#### TC-TC-03: 工具不可用时
```
预期: 插件给出警告信息，提示安装相应工具
```

---

### 模块 3: Workflow Guard (execute-before Hook)

#### TC-WG-01: 允许正常 bd claim（无当前任务）
```
前置条件: 当前无进行中的任务
操作: bd claim <task-id>
预期: 命令正常执行
```

#### TC-WG-02: 阻止未验证的 bd claim
```
前置条件: 当前有任务但未验证
操作: bd claim <new-task-id>
预期: 抛出错误 "Workflow Violation: Cannot claim task until current task is verified"
```

#### TC-WG-03: 允许已验证后的 claim
```
前置条件: 当前任务已验证
操作: bd claim <new-task-id>
预期: 命令正常执行
```

#### TC-WG-04: 阻止 git push --force
```
操作: git push --force origin main
预期: 抛出错误 "Prohibited command detected"
```

#### TC-WG-05: 阻止危险命令
```
操作: rm -rf /
预期: 抛出错误 "Prohibited command detected"
```

#### TC-WG-06: 允许正常 git 命令
```
操作: git status
预期: 命令正常执行
```

#### TC-WG-07: 非 bash 工具放行
```
操作: 使用 read, write 等非 bash 工具
预期: 工具正常执行，Hook 不拦截
```

---

### 模块 4: 聊天上下文注入 (chat-transform Hook)

#### TC-CT-01: 无任务时无注入
```
前置条件: currentTask = null
操作: 发送聊天消息
预期: 消息内容不变
```

#### TC-CT-02: 有任务时注入上下文
```
前置条件: currentTask = "bd-123", isVerified = false
操作: 发送聊天消息
预期: 消息前添加 Workflow Context，包含任务 ID 和验证状态
```

#### TC-CT-03: 已验证任务显示状态
```
前置条件: currentTask = "bd-123", isVerified = true
操作: 发送聊天消息
预期: 上下文显示 "Verified: true"
```

---

### 模块 5: Session 空闲提醒 (session-idle Hook)

#### TC-SI-01: 无待验证任务时不提醒
```
前置条件: currentTask = null
预期: Hook 返回 null
```

#### TC-SI-02: 有未验证任务时提醒
```
前置条件: currentTask = "bd-123", isVerified = false
操作: Session 空闲超过阈值
预期: 返回提醒消息，包含任务 ID 和验证提示
```

#### TC-SI-03: 任务已验证时不提醒
```
前置条件: currentTask = "bd-123", isVerified = true
预期: Hook 返回 null
```

---

### 模块 6: Session 压缩状态持久化 (session-compacting Hook)

#### TC-SC-01: 压缩前持久化状态
```
操作: Session 进行压缩/compact
预期: persistState() 被调用，状态保存
```

#### TC-SC-02: 压缩后恢复状态
```
操作: Session 压缩完成
预期: loadState() 被调用，状态恢复
```

---

### 模块 7: CLI 命令 (plugin-cli)

#### TC-CLI-01: ospb init 交互模式
```bash
node packages/plugin-cli/dist/index.js init
```
**预期**:
- 显示工具检测结果
- 提示输入配置选项
- 生成 `.opencode/opencode.json`

#### TC-CLI-02: ospb init 非交互模式
```bash
node packages/plugin-cli/dist/index.js init --yes
```
**预期**: 使用默认值快速初始化

#### TC-CLI-03: ospb init 检测工具
```
输出显示:
  openspec: ✅ 或 ❌
  beads: ✅ 或 ❌
```

#### TC-CLI-04: ospb init 创建配置
```
预期: 在 .opencode/ 目录创建 opencode.json
```

---

## 手动测试清单

### 测试前检查
- [ ] 插件文件已复制到 `.opencode/plugins/`
- [ ] OpenCode 可以启动
- [ ] 无插件加载错误

### 功能测试

| 测试项 | 操作 | 预期结果 | 通过 |
|--------|------|----------|------|
| 插件加载 | 启动 OpenCode | 无错误，加载成功 | ☐ |
| bd claim 拦截 | 有未验证任务时 claim | 抛出 Workflow Violation | ☐ |
| bd claim 放行 | 无任务或已验证时 claim | 命令执行成功 | ☐ |
| 危险命令拦截 | 执行 `git push --force` | 抛出 Prohibited command | ☐ |
| 上下文注入 | 有任务时聊天 | 消息包含 Workflow Context | ☐ |
| 空闲提醒 | 有未验证任务空闲 | 显示提醒消息 | ☐ |
| CLI init | 运行 `ospb init` | 生成配置文件 | ☐ |

### 测试后检查
- [ ] 所有预期结果与实际一致
- [ ] 无意外错误或异常
- [ ] 测试后清理测试数据

---

## 常见问题排查

### Q: 插件未加载
```
检查 .opencode/plugins/ 目录是否存在
检查插件文件名是否以 .ts 或 .js 结尾
查看 OpenCode 启动日志是否有错误
```

### Q: Hook 未生效
```
检查 OpenCode 版本是否支持对应 hook
某些 hook 可能是实验性功能 (experimental.*)
```

### Q: 命令拦截无效
```
检查插件代码中的 PROHIBITED_PATTERNS 数组
确认正则表达式正确匹配你的命令
```

---

## 测试报告模板

```markdown
## 测试报告

### 环境信息
- OpenCode 版本: 
- 插件版本: 
- Node 版本: 
- 测试日期: 

### 测试结果

| 用例 | 预期 | 实际 | 结果 |
|------|------|------|------|
| TC-WG-01 | ... | ... | ✅/❌ |

### 问题记录

1. **问题描述**: 
   - 预期: 
   - 实际: 
   - 截图: 

### 总结

- 通过: X/Y
- 失败: Y/Y
- 备注: 
```
