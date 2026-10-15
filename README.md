# QuickBox

QuickBox 是一个键盘优先的桌面工具启动器，灵感来自 Raycast / Alfred。通过全局快捷键呼出命令面板，快速搜索并打开内置开发者工具，减少在浏览器标签页和零散脚本之间切换的成本。

当前版本：`0.1.2`

## 特性

- **命令面板**：模糊搜索命令，支持中英文关键词、使用频率排序与收藏
- **插件化工具**：所有工具以插件形式注册，命令与视图解耦，便于扩展
- **全局快捷键**：默认 `Alt+Space` 呼出/隐藏启动器，可在设置中切换
- **系统托盘**：支持最小化到托盘，后台常驻
- **本地优先**：配置、插件状态与命令使用记录持久化到 SQLite，无账号、无云同步
- **命令与文件**：在启动器搜索“命令与文件”，记录、编辑、检索和复制命令，保存文件独立副本并导出（单个文件最大 20 MB）
- **安装目录存储**：数据默认保存在程序安装目录的 `data` 文件夹，位置配置 `storage-location.json` 也保存在安装目录；Windows 禁止将应用数据保存到 C 盘。设置中使用原生文件夹选择器迁移数据库、附件和备份，旧目录保留副本
- **统一备份管理**：任意格式文件直接复制到数据目录下的 `backups` 文件夹，不解析内容，无 JSON 格式或 20 MB 限制，支持多选、同名独立副本、导出和删除
- **跨平台骨架**：Windows 优先交付，Rust 层已预留 macOS / Linux 平台差异目录

## 内置工具

### Linux 命令大全

启动器搜索“Linux”“命令大全”或命令名称，即可打开内置命令插件。完整接入 [jaywcjlove/linux-command](https://github.com/jaywcjlove/linux-command) 的 **621 份 Markdown 手册**（包含上游索引尚未列出的 4 份文档），支持离线阅读、按命令名 / 中文用途 / 参数与示例全文检索、分类筛选、复制代码块和完整原文；原有 tldr 快速示例保留在独立页签。

文档固定于提交 `cd17682d612e6fdfaff29261c11ffbc3f951f41d`（上游版本 `1.22.0`）。完整 MIT 许可与作者署名保存在 `src/builtin-plugins/command-cheatsheet-tool/data/LICENSE.linux-command.txt`，也可在插件的“版本与许可证”中查看。数据随应用打包，使用时无需访问外网；正文与 Markdown 解析组件按需加载。

维护时执行 `pnpm sync:linux-commands` 同步上游当前全部文档，或执行 `pnpm sync:linux-commands <提交号>` 同步固定版本。同步脚本仅读取文档、索引、分类和许可证，不执行上游代码；同步后请检查来源清单并更新固定快照测试，再运行 `pnpm test` 与 `pnpm build`。

“命令与文件”的资料独立于代码片段。设置中的“统一备份管理”用于保存用户文件的原样副本；完整应用数据备份请退出应用后复制当前数据目录（包含 `quickbox.sqlite3`、`saved-files`、`backups`）。桌面窗口的 WebView 缓存保存在 `data/webview`；改变数据目录后重启可切换缓存位置。升级时会只读检查旧 AppData 数据并复制到新位置，旧数据保留。浏览器预览中的资料保存在 IndexedDB；磁盘备份管理和目录选择使用桌面应用中的系统对话框。

| 分类 | 工具 |
| --- | --- |
| 基础工具 | JSON 格式化、时间戳转换、Base64 编解码、UUID 生成、Hash 摘要、URL 编解码、正则测试 |
| 通用工具集 | Unicode / HTML Entity 编解码、文本大小写转换、日期差值、时区转换、随机字符串、Query 构建、JSON 转 TypeScript、JWT 解析、颜色转换、Mongo ObjectId 解析、SVG 清理、单位换算 |
| 开发工作流 | JSON 字符串转义、文本清洗/去重、正则替换、CSV ↔ JSON、JSON 转 Rust Struct、JSONPath 测试、AES-GCM 加解密、cURL ↔ fetch、.env 解析、Gitignore 生成、SemVer 助手 |
| 进阶工具 | YAML / XML / SQL 格式化、HMAC 生成、Cron 解析、密码强度检测、敏感信息脱敏、CSS Clamp 计算、AST 可视化、批量重命名预演 |
| 新增独立工具 | JWT 密钥生成、YAML ↔ Properties 互转、CIDR 子网计算、Cookie / Set-Cookie 解析、JSON Schema 生成 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面壳 | [Tauri 2](https://v2.tauri.app/) |
| 前端 | React 18、TypeScript、Vite 6 |
| 状态 | Zustand |
| 后端 | Rust、SQLite（rusqlite） |
| 包管理 | pnpm 9 |

## 环境要求

- **Node.js** 18+（推荐 LTS）
- **pnpm** 9.15.4（见 `package.json` 的 `packageManager` 字段）
- **Rust** stable（含 Cargo）
- **平台依赖**（Tauri 2 官方要求）：
  - Windows：WebView2（Win10/11 通常已内置）
  - Linux：WebKitGTK 等（见 [Tauri 文档](https://v2.tauri.app/start/prerequisites/)）
  - macOS：Xcode Command Line Tools

## 快速开始

```bash
# 安装依赖（首次或更新 .npmrc 后建议重装）
pnpm install

# 仅启动前端（浏览器调试 UI，改 UI 时最快）
pnpm dev

# 启动完整桌面应用（首次会编译 Rust，较慢）
pnpm tauri:dev
```

### 更快的日常开发（推荐）

前端改动频繁时，用**双终端**分离 Vite 与 Tauri，避免反复触发 Rust 编译：

```bash
# 终端 1：只跑前端热更新
pnpm dev

# 终端 2：只附加桌面壳（要求 1420 端口已有 Vite）
pnpm tauri:dev:attach
```

仅改 `src/` 时保持终端 1 运行即可；只有改 `src-tauri/` 时才需要重启终端 2。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` / `pnpm dev:web` | Vite 开发服务器（`http://127.0.0.1:1420`） |
| `pnpm tauri:dev` | Tauri 开发模式（自动启动或复用 Vite） |
| `pnpm tauri:dev:attach` | 仅启动 Tauri，复用已运行的 Vite（更快） |
| `pnpm build` | 前端生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm check:rust` | Rust `cargo check` |
| `pnpm verify` | 依次执行 typecheck、build、cargo check |
| `pnpm tauri:build` | 打包当前平台安装包 |
| `pnpm tauri:build:win` | Windows：NSIS + MSI |
| `pnpm tauri:build:linux` | Linux：AppImage + deb |
| `pnpm tauri:build:mac` | macOS：app + dmg |
| `pnpm tauri:build:mac:universal` | macOS Universal 二进制 |

## 构建加速

| 优化项 | 项目配置 | 说明 |
| --- | --- | --- |
| Vite 依赖预构建 | `vite.config.ts` → `optimizeDeps.include` | 首次 `pnpm dev` 预打包核心依赖，后续启动更快 |
| pnpm 扁平化 | `.npmrc` → `shamefully-hoist` | 减少深层 `node_modules`，加快模块解析 |
| Rust 增量编译 | `src-tauri/.cargo/config.toml` | 默认开启 `incremental` |
| Rust 编译缓存 | 安装 [sccache](https://github.com/mozilla/sccache) | `tauri:dev` 会自动检测并启用 `RUSTC_WRAPPER=sccache` |
| 前端热更新 | `pnpm dev` + `pnpm tauri:dev:attach` | 改 UI 不触发 Rust 全量重编译 |
| Windows 文件系统 | 项目放 SSD，避开 OneDrive 同步目录 | 减少 `cargo` / Vite 文件监控与 I/O 开销 |

内存较小的机器若 Rust 编译 OOM，可限制并行度：

```powershell
$env:CARGO_BUILD_JOBS=1
pnpm tauri:dev
```

## 发布

GitHub Actions 会在推送代码到 `main` 或 `master` 后自动构建并发布预览版 Release；推送与应用版本一致的 `vX.Y.Z` 标签时发布正式版。全部平台验证和打包成功后才统一公开安装包与 SHA256 校验文件，无需手动发布草稿。

```bash
# 发布前请同步以下三处版本号
# package.json / src-tauri/Cargo.toml / src-tauri/tauri.conf.json

git tag v1.0.0
git push origin v1.0.0
```

当前 CI 目标：

- Windows：`.exe`（NSIS）、`.msi`
- Linux：`.AppImage`、`.deb`
- macOS：代码已保留，CI 发布暂暂停

详细步骤见 [docs/release.md](docs/release.md)。

## 架构概览

```
┌─────────────────────────────────────┐
│  React 体验层                        │
│  命令面板 · 工具视图 · 设置 · Store   │
│  CommandRegistry / PluginRegistry   │
└──────────────┬──────────────────────┘
               │ typed Tauri API
┌──────────────▼──────────────────────┐
│  Rust 能力层                         │
│  窗口 · 快捷键 · 托盘 · 剪贴板 · SQLite │
│  权限校验 · 平台差异 (platform/)      │
└─────────────────────────────────────┘
```

- 前端负责 UI、命令搜索与内置工具逻辑
- Rust 负责系统能力与敏感 API 边界
- 插件通过 `PluginRegistry` 注册命令和 React 视图，不能直接调用敏感 Tauri API

更多说明：

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/Architecture.md](docs/Architecture.md)
- [docs/项目结构.md](docs/项目结构.md)

## 目录结构

```
Quick-Box/
├── src/                    # React 前端
│   ├── pages/              # 启动器、设置、插件管理
│   ├── core/               # 命令与插件注册中心
│   ├── builtin-plugins/    # 内置工具插件
│   ├── stores/             # Zustand 状态
│   ├── api/                # Tauri command 封装
│   └── ui/                 # 设计系统组件
├── src-tauri/              # Rust 后端
│   ├── src/commands/       # Tauri commands
│   ├── src/storage/        # SQLite 持久化
│   └── src/platform/       # 平台差异逻辑
├── docs/                   # 设计与开发文档
└── scripts/                # 构建与启动脚本
```

## 开发文档

| 文档 | 内容 |
| --- | --- |
| [docs/插件示范.md](docs/插件示范.md) | 插件开发示例 |
| [docs/React渲染插件View规则.md](docs/React渲染插件View规则.md) | 插件 View 渲染约定 |
| [docs/核心组件规范.md](docs/核心组件规范.md) | UI 组件规范 |
| [docs/quickbox_ui_design_system.md](docs/quickbox_ui_design_system.md) | 设计系统说明 |

## 许可证

本项目为私有仓库（`package.json` 中 `"private": true`）。如需对外分发，请补充合适的开源许可证。
