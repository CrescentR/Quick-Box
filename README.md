# QuickBox

QuickBox 是一个轻量级跨平台桌面工具启动器，第一阶段 Windows 优先，后续兼容 macOS 和 Linux。

## 技术栈

- Tauri 2
- React
- TypeScript
- Rust
- SQLite
- pnpm
- Vite
- Zustand

## 当前骨架能力

- React 命令面板和插件 View 动态渲染
- CommandRegistry / PluginRegistry
- BuiltinPluginLoader
- JSON、时间戳、Base64、UUID 四个 builtin plugin
- Tauri typed API wrapper
- Rust command 结构化错误
- 窗口显示、隐藏、切换命令
- SQLite 迁移入口
- 平台差异目录

## 开发

```bash
pnpm install
pnpm dev
pnpm tauri:dev
```

## 架构约束

- `LauncherPage` 只依赖注册中心，不直接导入具体工具。
- 所有工具必须通过 `CommandRegistry` 注册。
- 内置工具必须通过 `BuiltinPluginLoader` 加载。
- 插件 View 必须由 `PluginRegistry` 通过 `ComponentType` 动态渲染。
- 插件不能直接访问系统能力，必须通过 `src/api` 下的 typed wrapper 调用 Rust command。
- Rust command 必须返回结构化错误。
- 数据库迁移集中在 `src-tauri/src/storage/migrations.rs`。
- 平台差异代码集中在 `src-tauri/src/platform/`。
