# QuickBox 架构

QuickBox 采用“前端体验层 + Rust 能力层”的模型。

## Frontend

- 启动器 UI
- 命令输入与命令列表
- 内置工具视图
- 设置页与插件管理页外壳
- 命令与插件注册中心
- Zustand 状态 Store
- `src/api` 下的 typed Tauri command wrapper

## Rust Core

- 窗口管理
- 全局快捷键注册
- 托盘集成
- 剪贴板访问
- SQLite 存储
- 本地配置
- 安全与权限边界
- `src-tauri/src/platform` 下的平台差异逻辑

## 插件模型

每个工具都是插件。内置工具通过 `loadBuiltinPlugins` 加载，注册到 `PluginRegistry`，并将命令注册到 `CommandRegistry`。

插件视图使用 React `ComponentType`。`LauncherPage` 只向 `PluginRegistry` 请求当前视图组件，然后动态渲染。

插件不能直接调用敏感 Tauri API。它们必须使用前端 typed wrapper，由 wrapper 调用 Rust command。
