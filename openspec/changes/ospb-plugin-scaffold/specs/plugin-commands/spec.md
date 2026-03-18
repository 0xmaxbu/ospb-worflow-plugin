## ADDED Requirements

### Requirement: 命令定义文件

插件 SHALL 在 `.opencode/command/` 目录中包含以下 Markdown 命令定义文件：

- `opsx-propose.md`: 创建新变更提案的命令
- `opsx-apply.md`: 应用变更实现任务的命令
- `opsx-archive.md`: 归档已完成变更的命令
- `opsx-explore.md`: 探索想法和问题的命令

### Requirement: 命令元数据

每个命令定义文件 SHALL 包含 YAML frontmatter，其中 `description` 字段 SHALL 提供命令的功能描述。

### Requirement: 命令指示词

每个命令定义文件的 Markdown 内容 SHALL 包含完整的 Agent 指示词，定义命令执行的具体步骤和约束条件。

#### Scenario: propose 命令执行

- **WHEN** 用户输入 `/opsx-propose <变更名称或描述>`
- **THEN** 插件 SHALL 激活 openspec-propose 技能
- **AND** SHALL 创建变更目录结构（proposal.md、design.md、tasks.md）
- **AND** SHALL 更新 openspec 状态

#### Scenario: apply 命令执行

- **WHEN** 用户输入 `/opsx-apply <变更名称>`
- **THEN** 插件 SHALL 激活 openspec-apply-change 技能
- **AND** SHALL 按 tasks.md 中的顺序执行任务
- **AND** SHALL 在每个任务后触发验证检查

#### Scenario: archive 命令执行

- **WHEN** 用户输入 `/opsx-archive <变更名称>`
- **THEN** 插件 SHALL 验证所有任务是否完成
- **AND** SHALL 同步 delta specs 到主 specs
- **AND** SHALL 将变更移动到 archive 目录

#### Scenario: explore 命令执行

- **WHEN** 用户输入 `/opsx-explore` 或 `/opsx-explore <主题>`
- **THEN** 插件 SHALL 进入探索模式
- **AND** SHALL 提供开放式的思考和调查环境
- **AND** SHALL 不执行任何代码修改
