# QuickBox

QuickBox 是一个键盘优先的桌面工具启动器，Windows 优先，后续兼容 macOS 和 Linux。

当前版本：`0.1.1`

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
- JSON、时间戳、Base64、UUID、Hash、URL、正则和中文工具集
- Tauri typed API wrapper
- Rust command 结构化错误
- 窗口显示、隐藏、切换命令
- SQLite 配置、插件状态和命令使用记录持久化
- 平台差异目录

## 开发

```bash
pnpm install
pnpm dev
pnpm tauri:dev
```

## 发布前验证

```bash
pnpm verify
```

该命令会依次执行 TypeScript 类型检查、前端生产构建和 Rust `cargo check`。
