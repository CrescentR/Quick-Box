# QuickBox

QuickBox 是一个键盘优先的桌面工具启动器，第一阶段 Windows 优先，后续兼容 macOS 和 Linux。

当前版本：`1.0.0`

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

## 当前设计蓝图

项目后续开发以 [docs/QuickBox_全流程重设计方案.md](docs/QuickBox_全流程重设计方案.md) 为总设计入口。

辅助文档：

- [docs/QuickBox_V0.4_开发推进计划.md](docs/QuickBox_V0.4_开发推进计划.md)
- [docs/QuickBox_V0.3_继续开发计划.md](docs/QuickBox_V0.3_继续开发计划.md)
- [docs/QuickBox_工具库制作列表.md](docs/QuickBox_工具库制作列表.md)
- [docs/quickbox_product_ui_rebuild_plan.md](docs/quickbox_product_ui_rebuild_plan.md)
- [docs/quickbox_ui_design_system.md](docs/quickbox_ui_design_system.md)

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

## 架构约束

- `LauncherPage` 只依赖注册中心，不直接导入具体工具。
- 所有工具必须通过 `CommandRegistry` 注册。
- 内置工具必须通过 `BuiltinPluginLoader` 加载。
- 插件 View 必须由 `PluginRegistry` 通过 `ComponentType` 动态渲染。
- 插件不能直接访问系统能力，必须通过 `src/api` 下的 typed wrapper 调用 Rust command。
- Rust command 必须返回结构化错误。
- 数据库迁移集中在 `src-tauri/src/storage/migrations.rs`。
- 平台差异代码集中在 `src-tauri/src/platform/`。
