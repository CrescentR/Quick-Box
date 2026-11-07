# Codex 任务

## Phase 0

- 创建 Tauri 2 + React + TypeScript 项目。
- 使用 pnpm。
- 添加项目结构。
- 添加 README、架构文档和任务文档。

## Phase 1

- 添加启动器窗口命令。
- 在 Rust 中注册 `Alt+Space` 全局快捷键。
- 通过 Rust command 使用 `Esc` 隐藏启动器。

## Phase 2

- 实现命令类型。
- 实现 `CommandRegistry`。
- 实现命令搜索与命令运行器。

## Phase 3

- 实现插件类型。
- 实现 `PluginRegistry`。
- 实现 `BuiltinPluginLoader`。
- 注册内置插件。

## Phase 4

- 添加 JSON、时间戳、Base64 和 UUID 内置插件。
- 确保每个插件都包含 `index.ts`、commands 和 views。

## Phase 5

- 通过 `PluginRegistry.getView` 动态渲染插件视图。
