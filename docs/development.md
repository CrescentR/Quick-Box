# 开发指南

[返回首页](../README.md) · [开发内置工具](插件示范.md) · [构建与发布](release.md)

本指南按仓库当前实现编写，涵盖本地启动、代码分层、数据约定和提交前检查。插件市场等后续设计可见 [架构设计稿](Architecture.md) 与 [插件市场方案](插件市场需求与技术方案.md)，其中的规划不代表当前功能已经上线。

## 1. 准备开发环境

| 依赖 | 本仓库采用的版本或配置 |
| --- | --- |
| Node.js | 24，与 GitHub Actions 保持一致 |
| pnpm | 9.15.4，由 `package.json` 的 `packageManager` 固定 |
| Rust | stable；桌面功能和安装包构建需要 |
| Git | 用于拉取代码与管理版本 |
| Windows 原生依赖 | Visual Studio Build Tools 的 C++ 构建工具及 Windows SDK、WebView2 Runtime |

尚未安装 pnpm 时，可执行：

```bash
npm install --global pnpm@9.15.4
```

**请把仓库克隆到当前用户可写的位置**，例如 `C:\Projects\Quick-Box` 或 `D:\Projects\Quick-Box`，磁盘由开发者选择。开发版的数据默认位于 `src-tauri/target/debug/data`，跟随调试可执行文件所在目录，不另行默认写入 AppData。

```bash
git clone https://github.com/CrescentR/Quick-Box.git
cd Quick-Box
pnpm install --frozen-lockfile
```

Windows 的 `pnpm tauri:*` 脚本会尝试定位 Rust 与 Visual Studio C++ 环境，但仍需提前安装相应工具。

Linux 桌面开发需要本机原生依赖。当前 CI 在 Ubuntu 22.04 安装以下软件包，可作为相同系统的环境参考：

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf xdg-utils
```

项目保留 macOS 构建脚本；当前自动发布范围和平台说明见 [发布指南](release.md)。各平台安装包应在具备对应原生工具链的环境中构建。

## 2. 启动应用

### 桌面开发：一个终端

```bash
pnpm tauri:dev
```

该命令同时启动 Vite 与 Tauri 桌面窗口。默认前端地址为 `http://127.0.0.1:1420`；启动脚本会检查该端口，发现已有 Vite 服务时尝试复用。

### 桌面开发：两个终端

先在终端 A 启动前端：

```bash
pnpm dev:web
```

再在终端 B 启动桌面端：

```bash
pnpm tauri:dev:attach
```

`attach` 模式只检查并连接已有 Vite 服务，不会另起前端进程。适合单独观察前端和 Rust 日志。

### 只预览网页界面

```bash
pnpm dev
```

在浏览器打开 `http://127.0.0.1:1420`。浏览器预览适合调整布局和纯文本工具，其能力与桌面端有明确差异：

| 行为 | 浏览器预览 | Tauri 桌面应用 |
| --- | --- | --- |
| JSON、编码、文本转换等前端工具 | 可用 | 可用 |
| 配置、工作台等数据 | 通过预览适配存入浏览器 `localStorage` | 通过 Rust 存入本地数据目录 |
| 系统窗口、全局热键、托盘 | 不提供真实桌面能力 | 使用系统能力 |
| 文件夹选择、磁盘备份与数据迁移 | 明确提示需要桌面应用 | 使用原生文件对话框与文件系统 |
| 端口、文件搜索、屏幕取色等 | 按 API 返回占位结果或不支持提示 | 调用 Rust；能力仍受平台与系统权限限制 |
| 剪贴板 | 受浏览器权限与 Clipboard API 限制 | 通过桌面剪贴板接口 |

预览数据与桌面 SQLite 数据相互独立；浏览器里修改配置不会修改已安装应用。

## 3. 常用命令

以下命令均来自当前 [package.json](../package.json)。

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Vite，供浏览器或桌面端连接 |
| `pnpm dev:web` | 与 `dev` 相同，便于表达仅启动前端 |
| `pnpm tauri:dev` | 启动前端服务与桌面开发窗口 |
| `pnpm tauri:dev:attach` | 连接已运行的前端服务并启动桌面开发窗口 |
| `pnpm typecheck` | 执行 `tsc --noEmit`，检查前端类型 |
| `pnpm prebuild` | 检查部分必要前端依赖，可在构建前单独运行 |
| `pnpm build` | 检查 TypeScript 并生成 `dist/` 前端产物 |
| `pnpm check:rust` | 在 `src-tauri/` 执行 `cargo check` |
| `pnpm verify` | 依次执行类型检查、前端测试、前端构建与 Rust 编译检查 |
| `pnpm test` | 运行一次 Vitest 前端测试 |
| `pnpm test:watch` | 启动 Vitest 交互式监听模式 |
| `pnpm preview` | 在本地预览已有 `dist/`；先执行 `pnpm build` |
| `pnpm tauri <参数>` | 经项目环境脚本调用本地 Tauri CLI |
| `pnpm tauri:build` | 使用当前平台的 Tauri 配置构建安装产物 |
| `pnpm tauri:build:win` | 构建 Windows NSIS `.exe` 与 MSI `.msi` |
| `pnpm tauri:build:linux` | 构建 Linux `.AppImage` 与 `.deb` |
| `pnpm tauri:build:mac` | 构建 macOS `.app` 与 `.dmg` |
| `pnpm tauri:build:mac:universal` | 构建 macOS 通用架构产物，需准备对应 Rust 目标和原生环境 |
| `pnpm sync:linux-commands` | 从上游同步 Linux 命令文档、索引、来源信息与许可证，需要网络和 `tar` |

**`pnpm verify` 不包含 Rust 单元测试。** 提交涉及 Rust、存储或桌面行为的改动时，另行执行：

```bash
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
```

Linux 命令资料也可按指定上游提交同步，便于复现来源：

```bash
pnpm sync:linux-commands <上游提交号>
```

同步后应一并提交 `src/builtin-plugins/command-cheatsheet-tool/data/` 中更新的数据、`source.json` 和许可证。该同步脚本只拉取资料，不执行上游脚本。

## 4. 项目结构与调用关系

```text
Quick-Box/
├─ src/
│  ├─ app/                 应用初始化、主题与快捷键
│  ├─ pages/               启动器、插件管理、设置与备份界面
│  ├─ builtin-plugins/     工具元数据、懒加载视图及工具逻辑
│  ├─ core/
│  │  ├─ command/         命令类型、注册、检索与执行
│  │  ├─ plugin/          插件类型与内置插件登记
│  │  ├─ tool/            工具输入、进程内草稿、预设与结果传递
│  │  ├─ config/          配置类型与默认值
│  │  └─ workspace/       工作台数据结构与校验
│  ├─ stores/             Zustand 应用状态
│  ├─ api/                带类型的 Rust command 调用与浏览器预览适配
│  ├─ ui/                 共用组件
│  └─ styles/             主题变量、全局样式与工具样式
├─ src-tauri/
│  ├─ src/commands/        桌面命令入口
│  ├─ src/storage/         SQLite、迁移、数据目录与持久化逻辑
│  ├─ src/platform/        平台相关能力
│  ├─ src/lib.rs           桌面初始化与 command 注册
│  └─ tauri.conf.json      应用、窗口与打包配置
├─ tests/                  Vitest 测试
├─ scripts/                启动环境、资料同步等辅助脚本
├─ docs/                   使用、开发与发布文档
└─ .github/workflows/      自动构建与发布
```

界面和纯计算逻辑放在 React / TypeScript 层；系统文件、数据库、窗口、快捷键及进程能力由 Rust 提供。典型调用关系为：

```text
页面 / 工具视图 → Zustand 或 src/api → invokeCommand → Rust command → 存储 / 平台能力
```

简单的工具内部状态使用 React hooks；跨页面状态由 Zustand 管理。`launcher-store` 保存检索与当前视图，`config-store` 管理应用配置，`plugin-store` 管理启用状态，`workspace-store` 管理常用工具、非敏感预设与代码片段。

### 新增工具

工具通过 `ToolPlugin` 声明元数据、命令与视图，在 `builtin-loader.ts` 注册；视图使用 React `lazy`，分类和图标登记在 `launcher-catalog.ts`。完整可照着实现的示例见 [内置工具开发指南](插件示范.md)。

### 新增 Rust 能力

1. 在 `src-tauri/src/commands/` 的对应领域模块实现 `#[tauri::command]`，使用明确的入参与可序列化返回类型；失败返回 `CommandError`。
2. 新模块在 `commands/mod.rs` 声明，并在 `src-tauri/src/lib.rs` 的 `generate_handler!` 中登记命令。
3. 在 `src/api/` 增加带类型的调用函数，经 `invokeCommand` 调用，供页面、工具或 store 使用。
4. 在 `src/api/tauri-api.ts` 为浏览器预览给出合理行为：可模拟的返回预览数据，需要系统能力的明确提示不可用。
5. 文件路径、输入边界、平台支持和错误处理在 Rust 端校验；耗时工作使用后台任务，参考文件搜索与备份模块。

不要在工具视图里分散裸 `invoke`、SQL 或文件系统操作。`permissions` 是当前插件模型的声明元数据，并不代表已经存在独立的插件权限执行器或安全沙箱。

### 状态与持久化

- 持久化前先校验数据，给新增配置提供默认值，并考虑旧数据升级。
- 沿用现有 store 的加载、保存、错误状态和失败恢复模式；避免多个组件各自维护同一份持久化数据。
- 非敏感的小型工具选项可以使用 `useToolOption`；输入原文和密钥不要放入该入口。
- 临时工具输入使用 `useToolInput`，草稿仅在当前进程内保留。明确需要长期保存的内容由用户保存到代码片段或命令与文件资料库。

### SQL 与迁移约定

本项目使用 SQLite。数据库结构修改集中在 `src-tauri/src/storage/migrations.rs`，通过迁移版本管理，并验证旧库升级后数据仍可读取。

- 禁止物理外键。
- 禁止无意义函数、存储过程、视图和触发器。
- 建表或增加字段时，必须在 SQL 语句中写明表和字段的用途注释。
- SQLite 不提供通用的 `COMMENT ON` 表/列注释语法，项目使用 `schema_comments` 持久保存结构说明。DDL 注释与该表中的表、字段注释应同步维护。
- 使用参数绑定传递值；涉及多步写入或迁移时，考虑事务与失败恢复。

## 5. 数据位置与开发注意事项

默认数据根目录为**当前可执行文件所在目录的 `data/`**，不另行默认写入 AppData。Linux AppImage 优先以 AppImage 文件所在目录计算。Windows 默认调试构建对应 `src-tauri/target/debug/data/`，Release 可执行文件对应其运行目录；安装、存储与导出都允许选择 C 盘或其他磁盘，目录需具有相应写权限。

| 位置 | 内容 |
| --- | --- |
| `<安装目录>/storage-location.json` | 用户迁移数据目录后保存的位置指针 |
| `<数据目录>/quickbox.sqlite3` | 配置、工作台、插件状态、使用记录、资料库索引等 |
| `<数据目录>/saved-files/` | 命令与文件资料库的附件副本 |
| `<数据目录>/backups/` | 统一备份管理保存的任意格式文件副本 |
| `<数据目录>/webview/` | WebView 的缓存与本地状态 |

通过「设置 → 数据存储位置」选择用户需要的可写空目录后迁移。新旧目录不能相互包含；迁移会复制数据库、附件与备份，原目录保留副本。WebView 数据目录在窗口创建时确定，迁移后重启应用会使用新位置。

**清理 `src-tauri/target/` 前先备份开发数据**，因为默认开发数据也位于该目录下。数据目录迁移不改变安装目录本身仍需可写的要求：位置指针保存在安装目录。

## 6. 检查、构建与发布

通常先执行：

```bash
pnpm verify
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
```

前端测试放在 `tests/`，Rust 单元测试随模块放在 `#[cfg(test)]` 中。对数据校验、迁移、检索或工具转换逻辑优先添加有意义的回归用例；界面调整还应在实际页面检查布局、加载状态和错误提示。涉及系统能力时，在桌面端验证相应操作。

本机打包示例：

```bash
pnpm tauri:build:win
```

常规构建的安装包输出到 `src-tauri/target/release/bundle/`，不同包格式位于各自的子目录。`pnpm build` 只生成前端资源，不生成桌面安装包。

推送 `main` / `master` 会自动构建预览版；正式版使用与三处应用版本一致的 `vX.Y.Z` 标签。版本同步、权限、产物和失败重试流程见 [构建与发布指南](release.md)。

### 更新应用图标

图标母版为 [`src-tauri/app-icon.png`](../src-tauri/app-icon.png)。更换时使用正方形、带透明圆角的 PNG，再重新生成整套桌面资源：

```bash
pnpm tauri icon src-tauri/app-icon.png
```

此命令生成 Windows ICO、macOS ICNS 和各尺寸 PNG。不要只更新一个尺寸；窗口、托盘、安装器、卸载器及快捷方式都会使用这套资源。网页与应用标题栏使用 `public/app-icon.png`，浏览器 favicon 使用 `public/favicon.ico`，Windows 下可同步如下：

```powershell
Copy-Item 'src-tauri/icons/128x128@2x.png' 'public/app-icon.png' -Force
Copy-Item 'src-tauri/icons/icon.ico' 'public/favicon.ico' -Force
```

README 顶部直接展示图标母版。更新后运行桌面打包，并检查标题栏、网页图标及安装包资源。

## 7. 常见问题

| 现象 | 排查方式 |
| --- | --- |
| 首次 Rust 构建或 `Build installers` 很慢 | 检查日志是否仍在下载、`Compiling` 或 `Bundling`。测试构建与 Release 优化构建产物不同，首次打包仍可能编译较久。开发脚本启用增量编译，检测到 `sccache` 时会使用它；重复清理 `target/` 会失去本地编译缓存。 |
| `1420` 端口被占用 | 先检查是否已有本项目 Vite 服务。双终端开发使用 `tauri:dev:attach`；若为其他服务，停止冲突进程后重启。Vite 使用严格端口模式，不会自动换端口。 |
| `tauri:dev:attach` 提示找不到 Vite | 先执行 `pnpm dev:web`，确认可访问 `http://127.0.0.1:1420`，再启动桌面端。 |
| 全局热键无效 | 确认运行的是桌面版，且没有重复实例或其他软件占用组合键；在设置中换一个组合键并保存。启动时程序会尝试备用热键，调试日志可查看注册失败信息。 |
| Rust 或原生依赖找不到 | 确认 Rust stable、Windows C++ Build Tools / SDK 或 Linux 依赖已经安装。安装工具链后重开终端，再执行对应命令。 |
| 安装目录不可写或启动失败 | 使用当前用户可写的安装目录；仅迁移数据不能解决安装目录中位置指针不可写的问题。Linux 系统安装目录若不可写，也需要调整部署位置或权限。 |
| 已配置的数据位置不可用 | 连接原磁盘或恢复原数据目录，确认 `quickbox.sqlite3` 存在；程序会拒绝静默创建空库，以免把旧数据误判为已丢失。 |
| `storage-location.json` 损坏 | 先保留当前文件和数据目录，再恢复正确的位置指针；不要直接删除配置或原数据来绕过错误。 |
| 浏览器里某工具只有空列表或模拟结果 | 查看预览与桌面能力对照，在 `pnpm tauri:dev` 中验证真实系统行为。 |
