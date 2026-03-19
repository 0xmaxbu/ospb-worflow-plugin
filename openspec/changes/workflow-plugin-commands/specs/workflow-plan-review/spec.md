## ADDED Requirements

### Requirement: Plan 审查触发机制
系统 SHALL 在生成完整计划后自动触发审查流程。

#### Scenario: 审查自动触发
- **WHEN** Agent 完成计划生成
- **THEN** 通过 hook 机制调起 plan reviewer Agent

#### Scenario: 审查输入
- **WHEN** plan reviewer Agent 开始审查时
- **THEN** 接收完整的 plan 内容和对应的 spec 文档

### Requirement: Plan 审查维度
Plan reviewer Agent SHALL 从以下维度审查计划：

#### Scenario: 符合性检查
- **WHEN** reviewer 审查计划时
- **THEN** 验证计划步骤是否与 Spec 设计一致

#### Scenario: 完整性检查
- **WHEN** reviewer 审查计划时
- **THEN** 验证计划是否可落地（步骤明确、可执行）

#### Scenario: 设计质量检查
- **WHEN** reviewer 审查计划时
- **THEN** 检查是否有设计错误或缺失会导致开发中断

### Requirement: 审查问题处理
系统 SHALL 提供与用户沟通审查问题的机制。

#### Scenario: 发现问题时
- **WHEN** reviewer 发现计划有问题时
- **THEN** 通过 question tool 与用户沟通并收集反馈

#### Scenario: 问题修改后
- **WHEN** 用户确认修改方案后
- **THEN** Agent 更新计划并重新触发审查

### Requirement: 审查方法迭代
审查方法 SHALL 随使用情况持续调整优化。

#### Scenario: 审查规则更新
- **WHEN** 用户或 Agent 建议改进审查规则时
- **THEN** 通过 hook 机制更新审查方法

#### Scenario: 审查历史记录
- **WHEN** 每次审查完成后
- **THEN** 记录审查结果到 `.workflow/bd.md` 供后续参考