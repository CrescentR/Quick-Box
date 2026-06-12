# QuickBox

QuickBox 是一个键盘优先的桌面工具启动器，灵感来自 Raycast / Alfred。通过全局快捷键呼出命令面板，快速搜索并打开内置开发者工具，减少在浏览器标签页和零散脚本之间切换的成本。

当前版本：`1.0.0`

## 特性

- **命令面板**：模糊搜索命令，支持中英文关键词、使用频率排序与收藏
- **插件化工具**：所有工具以插件形式注册，命令与视图解耦，便于扩展
- **全局快捷键**：默认 `Alt+Space` 呼出/隐藏启动器，可在设置中切换
- **系统托盘**：支持最小化到托盘，后台常驻
- **本地优先**：配置、插件状态与命令使用记录持久化到 SQLite，无账号、无云同步
- **跨平台骨架**：Windows 优先交付，Rust 层已预留 macOS / Linux 平台差异目录

## 内置工具

| 分类 | 工具 |
| --- | --- |
| 基础工具 | JSON 格式化、时间戳转换、Base64 编解码、UUID 生成、Hash 摘要、URL 编解码、正则测试 |
| 通用工具集 | Unicode / HTML Entity 编解码、文本大小写转换、日期差值、时区转换、随机字符串、Query 构建、JSON 转 TypeScript、JWT 解析、颜色转换、Mongo ObjectId 解析、SVG 清理、单位换算 |
| 开发工作流 | JSON 字符串转义、文本清洗/去重、正则替换、CSV ↔ JSON、JSON 转 Rust Struct、JSONPath 测试、AES-GCM 加解密、cURL ↔ fetch、.env 解析、Gitignore 生成、SemVer 助手 |
| 进阶工具 | YAML / XML / SQL 格式化、HMAC 生成、Cron 解析、密码强度检测、敏感信息脱敏、CSS Clamp 计算、AST 可视化、批量重命名预演 |

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
# 安装依赖
pnpm install

# 仅启动前端（浏览器调试 UI）
pnpm dev

# 启动完整桌面应用（推荐）
pnpm tauri:dev
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | Vite 开发服务器（`http://127.0.0.1:1420`） |
| `pnpm tauri:dev` | Tauri 开发模式，热更新前端 |
| `pnpm build` | 前端生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm check:rust` | Rust `cargo check` |
| `pnpm verify` | 依次执行 typecheck、build、cargo check |
| `pnpm tauri:build` | 打包当前平台安装包 |
| `pnpm tauri:build:win` | Windows：NSIS + MSI |
| `pnpm tauri:build:linux` | Linux：AppImage + deb |
| `pnpm tauri:build:mac` | macOS：app + dmg |
| `pnpm tauri:build:mac:universal` | macOS Universal 二进制 |

## 发布

GitHub Actions 会在推送 `v*` 标签时自动构建 Release 安装包。

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
