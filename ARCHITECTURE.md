# QuickBox 架构说明

[返回首页](README.md) · [开发指南](docs/development.md) · [插件开发示例](docs/插件示范.md) · [核心组件](docs/核心组件规范.md)

QuickBox 是基于 **Tauri 2 + React + TypeScript + Rust** 的桌面工具箱。React 负责搜索、工具视图和交互，Rust 负责窗口、系统能力和本地持久化。本文描述当前实现；环境安装、开发命令和发布流程见对应指南。

## 模块如何协作

```text
App / MainLayout
├─ LauncherPage             搜索、分类、常用工具、执行命令
│  └─ ToolViewPane          注册表查找视图、加载状态、错误边界、工具上下文
├─ PluginManagerPage        内置插件说明与启停
└─ SettingsPage             应用设置、存储位置、统一备份
          │
          ├─ core/          插件注册、命令搜索、工具输入与结果传递
          ├─ stores/        页面状态、配置、插件状态、个人工作台
          └─ api/           带类型的 Tauri command 封装
                  │ invokeCommand
                  ▼
          Rust commands/    参数校验、系统操作、错误返回
          ├─ platform/     Windows / macOS / Unix 平台实现
          └─ storage/      SQLite、目录解析、迁移与数据库升级
```

| 目录 / 入口 | 职责 | 修改场景 |
| --- | --- | --- |
| [`src/App.tsx`](src/App.tsx)、[`src/app/`](src/app/) | 应用初始化、页面切换、主题、应用快捷键 | 增加应用级行为 |
| [`src/pages/`](src/pages/) | 启动器、插件页、设置页及其局部组件 | 修改主界面和页面流程 |
| [`src/builtin-plugins/`](src/builtin-plugins/) | 内置插件清单、工具视图和本地计算逻辑 | 新增或修改工具 |
| [`src/core/`](src/core/) | 插件 / 命令模型、注册表、搜索和工具上下文 | 修改工具接入机制 |
| [`src/ui/`](src/ui/)、[`src/styles/`](src/styles/) | 公共组件、主题变量与工具布局样式 | 统一交互和视觉 |
| [`src/stores/`](src/stores/) | Zustand 状态与持久化入口协调 | 管理跨组件状态 |
| [`src/api/`](src/api/) | TypeScript 请求 / 响应类型及桌面调用封装 | 增加原生能力接口 |
| [`src-tauri/src/commands/`](src-tauri/src/commands/) | Rust command 实现 | 文件、剪贴板、端口等系统操作 |
| [`src-tauri/src/storage/`](src-tauri/src/storage/) | 数据库、数据目录和迁移 | 修改持久化行为 |
| [`src-tauri/src/platform/`](src-tauri/src/platform/) | 平台相关实现 | 调整系统兼容性 |

## 插件、命令、视图是三个概念

**一个插件可以包含多个工具入口。** `ToolPlugin.commands` 描述可被搜索和执行的命令，`ToolPlugin.views` 描述可显示的 React 视图。命令通过 `run(ctx)` 执行，通常调用 `ctx.openView(viewId, params)` 打开工具；类型也支持 `immediate` 命令。

例如，`official.json-tool` 包含一个主要工具入口；`official.utility-tools` 则将多个工具组织在同一插件中。不要把“插件数量”“启动器工具入口数量”和 Linux 手册的命令条目数量混为一谈。

当前加载流程：

1. `App` 调用 [`ensureAppBootstrapped`](src/app/bootstrap.ts)，由它调用 [`loadBuiltinPlugins`](src/core/plugin/builtin-loader.ts)。
2. [`PluginRegistry.register`](src/core/plugin/plugin-registry.ts) 保存插件和视图，同时把命令交给 [`CommandRegistry`](src/core/command/command-registry.ts)。重复的插件、视图或命令 ID 会报错。
3. `LauncherPage` 根据插件启用状态筛选命令，再结合查询、分类和使用记录生成列表。
4. 用户打开命令后，`runCommand` 调用它的 `run`；启动器把 `viewId`、参数及 `commandId` 写入 `launcher-store`。
5. `ToolViewPane` 按 ID 获取组件，由 `Suspense` 加载 lazy 视图，在 `ToolProvider` 和 `ToolErrorBoundary` 内渲染。

注册清单先就绪，较重的工具视图通过 `React.lazy` 延迟导入。新增工具不需要在 `LauncherPage` 中追加按 ID 判断的 JSX。具体实现见 [React 视图渲染规则](docs/React渲染插件View规则.md)。

### 当前插件机制的边界

`PluginSource` 中预留了 `builtin | local | market`，但当前加载器只注册仓库内的内置插件。**尚未实现外部插件安装、插件市场或独立插件沙箱。**

`permissions` 是插件能力声明元数据，目前没有按插件 ID 强制检查每次 API 调用的通用授权层。代码应统一通过 `src/api` 使用原生能力，Rust 校验具体输入和操作条件；这项开发约定不等于已实现不可信插件隔离。扩展外部插件前，需要另行设计可信来源、授权和执行边界。

## 状态与持久化

| 数据 | 当前管理位置 | 保存方式 |
| --- | --- | --- |
| 搜索词、选中项、打开的视图与参数 | `launcher-store` | 页面运行状态，不作为业务数据持久化 |
| 全局快捷键、主题、托盘和置顶设置 | `config-store` → 配置 API | Rust / SQLite |
| 插件启停状态 | `plugin-store` → 插件 API | Rust / SQLite |
| 常用工具、工具预设、代码片段、剪贴板推荐开关 | `workspace-store` | 校验后的版本化 JSON，由 Rust 写入 SQLite |
| 命令使用记录、剪贴板历史、端口使用记录 | 对应 API / Rust store | SQLite |
| 命令与文件资料库 | `library-api` / Rust library command | 元数据和命令保存在 SQLite，文件副本保存在 `saved-files/` |
| 统一备份管理 | 备份 API / Rust backups command | 扫描 `backups/` 生成清单，文件副本保存在其中的独立子目录 |
| 工具输入草稿 | `useToolInput` 的内存 Map | 仅当前应用进程；不会通过该 hook 写入数据库 |

`useToolOption` 用于保存简单、非敏感的工具选项，不能用于自动保存原文或密钥。结果可通过 `ToolResultActions` 传给已登记、已启用且接收该类型的工具。相关接口见 [核心组件规范](docs/核心组件规范.md)。

### 原生 API 的调用链

```text
工具 / 页面
  → src/api/<feature>-api.ts
  → invokeCommand<TResponse>(command, args)
  → lib.rs 注册的 Rust command
  → 平台能力 / storage
```

[`tauri-api.ts`](src/api/tauri-api.ts) 根据是否存在 Tauri 运行时选择桌面调用或浏览器预览实现。预览模式对部分设置和工作台使用浏览器存储，部分原生操作则返回模拟结果或明确报错。因此 `pnpm dev:web` 适合检查 UI，文件夹选择、磁盘迁移、真实进程操作等必须在桌面运行时验证。

新增接口应同步维护 TypeScript 类型、Rust 参数 / 返回结构、`lib.rs` 的 command 注册，以及必要的预览行为。异步事件中的错误由调用者处理，不能依赖 React 错误边界代为捕获。

## 数据目录与启动顺序

数据默认保存在**安装目录下的 `data/`**；自定义位置记录在安装目录的 `storage-location.json`。Windows 安装目录和数据目录都必须可写且位于非 C 盘，路径校验也会检查已有祖先目录的真实位置。

```text
安装目录/
├─ quickbox.exe                 # Windows 可执行文件
├─ storage-location.json        # 更改数据位置后创建的位置指针
└─ data/                        # 默认数据目录，可迁移到其他位置
   ├─ quickbox.sqlite3
   ├─ saved-files/              # 命令与文件资料库的文件副本
   ├─ backups/                  # 统一备份管理的文件副本
   └─ webview/                  # WebView 缓存与浏览器存储
```

[`lib.rs`](src-tauri/src/lib.rs) 先解析 / 初始化数据目录、执行数据库迁移，再创建主 WebView 并指定 `data_directory`，最后注册快捷键、托盘和窗口属性。这样可以在窗口启动前确定应用缓存位置。

目录迁移由 [`storage/location.rs`](src-tauri/src/storage/location.rs) 负责：

- 新目录必须为空，不能与原目录相互包含。
- SQLite 通过 `VACUUM INTO` 生成一致性快照，再复制 `saved-files/` 和 `backups/`；原数据保留。
- 常规数据库访问持有数据位置的共享读锁，迁移持有独占写锁；这是应用层的数据位置协调，避免迁移期间继续向旧位置写入。
- 位置指针保存成功后，后续数据库调用使用新目录；WebView 缓存在重启后使用新位置，不随业务文件复制。
- 已指定的数据目录不可用时返回错误，避免创建空库造成“数据丢失”的错觉。旧版 AppData 数据仅用于首次升级时的读取与迁移。

Linux AppImage 以 `APPIMAGE` 所在目录作为安装目录，其他情况使用可执行文件所在目录；当前同样要求该目录可写。安装和备份细节见 [使用指南](docs/usage.md#data-management)。

## 数据库变更约定

当前使用 SQLite / `rusqlite`。应用关系由业务代码维护，不建立物理外键；不使用存储过程、视图、触发器，也不引入没有实际用途的 SQL 函数。

建表、加字段时同时提供 SQL 内注释和数据库内可查询的表 / 字段说明。SQLite 没有通用的 `COMMENT ON` 语法，本项目通过 `schema_comments` 保存说明，参见 [`storage/migrations.rs`](src-tauri/src/storage/migrations.rs)。数据库变更还应考虑旧库升级、版本控制、重复执行和已有数据保留。

## 继续阅读

- [开发指南](docs/development.md)：环境、脚本、验证与故障排查。
- [插件开发示例](docs/插件示范.md)：新增一个内置工具的具体步骤。
- [核心组件规范](docs/核心组件规范.md)：已有 UI 组件、工具 hooks 和样式约定。
- [React 视图渲染规则](docs/React渲染插件View规则.md)：lazy 导入、上下文和视图生命周期。
- [发布指南](docs/release.md)：GitHub Actions 和安装包发布。
