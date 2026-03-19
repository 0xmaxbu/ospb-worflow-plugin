## ADDED Requirements

### Requirement: CLI 包入口

插件 CLI 包 SHALL 提供可执行命令 `ospb`，通过 npm bin 字段声明为可执行脚本。

### Requirement: 初始化命令

`ospb init` 命令 SHALL 执行以下检查和初始化：

#### Scenario: 完整环境检测

- **WHEN** 用户运行 `ospb init`
- **THEN** 系统 SHALL 检测 openspec CLI 是否已安装
- **AND** SHALL 检测 beads 是否已安装
- **AND** SHALL 检测当前目录是否已有 openspec 配置

#### Scenario: 工具缺失提示

- **WHEN** 检测到 openspec 或 beads 未安装
- **THEN** 系统 SHALL 输出错误信息，包含缺失工具名称
- **AND** SHALL 提供安装命令（brew install、npm install 等）

#### Scenario: 成功初始化

- **WHEN** 所有工具都已安装且目录有效
- **THEN** 系统 SHALL 输出成功信息
- **AND** SHALL 显示当前工作流状态

### Requirement: 交互式配置向导

`ospb init` 命令 SHALL 支持交互模式，引导用户完成：

- 选择要创建的变更类型
- 输入变更名称
- 确认工作流配置

#### Scenario: 交互模式执行

- **WHEN** 用户运行 `ospb init --interactive`
- **THEN** 系统 SHALL 提示用户输入变更名称
- **AND** SHALL 验证变更名称格式（kebab-case）
- **AND** SHALL 调用 openspec 创建变更结构
