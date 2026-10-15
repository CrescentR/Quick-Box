# QuickBox UI 设计系统与组件规范 V0.1

> **历史设计稿**：本文保留 V0.1 阶段的视觉方向和未来插件方案，部分配色、组件与 UI Schema 设想不等同于当前实现。开发时请参阅 [核心组件规范](核心组件规范.md)、[React 插件 View 规则](React渲染插件View规则.md) 和 [开发指南](development.md)。[返回文档中心](README.md)。

> 项目定位：轻量级桌面端快捷工具启动器，Windows 优先，未来兼容 macOS / Linux。  
> 技术方向：Tauri 2 + React + TypeScript + Rust Core + SQLite。  
> 插件方向：V0.1 支持官方内置插件；未来第三方 Standard UI 插件使用声明式 UI Schema，由主程序统一渲染。

---

## 1. 设计目标

QuickBox 的 UI 目标不是做一个复杂的桌面管理后台，而是做一个可以被频繁呼出、快速输入、快速执行、快速关闭的高效率工具入口。

核心关键词：

- Lightweight：轻量，不打扰。
- Fast：呼出快、响应快、操作链路短。
- Unified：所有插件保持统一视觉和交互。
- Keyboard-first：键盘优先，鼠标辅助。
- Developer-oriented：适合开发者和高级用户，支持代码、JSON、日志等信息展示。
- Extensible：从 V0.1 起为插件化和未来 UI Schema 预留结构。

界面文案策略：

- V0.1 统一使用中文界面文案。
- JSON、Base64、UUID、ISO、Unix 等技术术语允许保留英文。
- 内部 plugin id、permission id、view id 不应作为主文案直接暴露给用户。

---

## 2. 设计原则

### 2.1 暗色优先

V0.1 需要支持 Dark / Light / System 三种主题，但设计和验收以 Dark Mode 为第一优先级。

原因：

- 启动器类产品经常在开发、办公、夜间环境中使用。
- 暗色悬浮窗口对桌面环境干扰更低。
- 开发者工具、JSON、日志、代码预览更适合暗色背景。

### 2.2 Windows Fluent-inspired，但不炫技

主窗口应具备 Fluent / Mica 风格的轻微材质感，但不能为了透明和毛玻璃牺牲可读性。

默认策略：

- Mica-like 背景优先。
- Acrylic / 高强度毛玻璃仅作为未来可选主题。
- 不透明度保持在 90% 以上。
- 文字区域必须稳定清晰。

### 2.3 主程序控制视觉，插件只声明内容

V0.1 内置插件可以直接使用 React 组件，但未来第三方插件不能直接渲染任意 ReactNode。

长期架构：

- 插件输出 JSON-safe UI Schema。
- 主程序将 Schema 映射为官方 React 组件。
- 插件不能直接控制 DOM、CSS、Tauri API 或主渲染进程状态。

---

## 3. Design Tokens

所有视觉参数必须抽象为 CSS Variables。组件中禁止硬编码颜色、圆角、阴影、动效时间。

### 3.1 色彩系统：Dark First

| Token | 默认值 | 用途 |
|---|---:|---|
| `--qb-bg-window` | `rgba(24, 24, 30, 0.94)` | 主窗口背景 |
| `--qb-bg-surface` | `rgba(255, 255, 255, 0.04)` | 列表项 hover、卡片、输入框背景 |
| `--qb-bg-focus` | `rgba(255, 255, 255, 0.07)` | 当前选中项、输入框聚焦 |
| `--qb-bg-overlay` | `rgba(0, 0, 0, 0.40)` | Action Panel 遮罩 |
| `--qb-border-subtle` | `rgba(255, 255, 255, 0.08)` | 窗口描边、分割线 |
| `--qb-border-focus` | `rgba(124, 92, 255, 0.45)` | 聚焦描边 |
| `--qb-accent-primary` | `#7C5CFF` | 主高亮色、焦点条、主按钮 |
| `--qb-text-primary` | `#F1F1F4` | 主标题、输入内容 |
| `--qb-text-secondary` | `#A1A1AA` | 描述、提示、快捷键 |
| `--qb-text-muted` | `rgba(161, 161, 170, 0.72)` | 更弱的辅助信息 |
| `--qb-status-success` | `#34D399` | 成功状态 |
| `--qb-status-warning` | `#FBBF24` | 警告状态 |
| `--qb-status-danger` | `#F87171` | 错误、危险操作 |

### 3.2 字体系统

```css
:root {
  --qb-font-sans: system-ui, "Segoe UI", "Microsoft YaHei UI", -apple-system, sans-serif;
  --qb-font-mono: "JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, monospace;
}
```

字号阶梯：

| Token | 默认值 | 用途 |
|---|---:|---|
| `--qb-font-size-search` | `16px` | 搜索框 |
| `--qb-font-size-body` | `14px` | 列表标题、正文 |
| `--qb-font-size-caption` | `12px` | 标签、快捷键、辅助说明 |
| `--qb-line-height-search` | `24px` | 搜索框行高 |
| `--qb-line-height-body` | `20px` | 正文行高 |
| `--qb-line-height-caption` | `16px` | 辅助文本行高 |

### 3.3 圆角、阴影、间距

| Token | 默认值 | 用途 |
|---|---:|---|
| `--qb-radius-window` | `18px` | 主窗口 |
| `--qb-radius-panel` | `16px` | Action Panel、详情面板 |
| `--qb-radius-item` | `12px` | 列表项 |
| `--qb-radius-control` | `10px` | 输入框、按钮 |
| `--qb-shadow-window` | `0 24px 80px rgba(0,0,0,0.45)` | 主窗口阴影 |
| `--qb-shadow-panel` | `0 18px 60px rgba(0,0,0,0.40)` | 面板阴影 |
| `--qb-space-1` | `4px` | 极小间距 |
| `--qb-space-2` | `8px` | 小间距 |
| `--qb-space-3` | `12px` | 标准间距 |
| `--qb-space-4` | `16px` | 中等间距 |
| `--qb-space-5` | `20px` | 大间距 |
| `--qb-space-6` | `24px` | 容器内边距 |

### 3.4 动效 Tokens

| Token | 默认值 | 用途 |
|---|---:|---|
| `--qb-motion-fast` | `120ms` | hover、focus |
| `--qb-motion-normal` | `160ms` | Action Panel |
| `--qb-motion-panel` | `180ms` | Split View |
| `--qb-ease-out` | `ease-out` | 常规缓动 |
| `--qb-ease-panel` | `cubic-bezier(0.16, 1, 0.3, 1)` | 面板展开 |

---

## 4. 核心布局

### 4.1 Launcher Mode

默认呼出窗口：

- Width：720px
- Height：460px
- Border Radius：18px
- Search Area Height：64px
- List Item Height：52px 单行 / 64px 双行
- 默认居中显示，置顶，跳过任务栏。

结构：

```text
┌──────────────────────────────────────────────┐
│ Search Input                                  │ 64px
├──────────────────────────────────────────────┤
│ Command List                                  │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│ Optional Footer / Status Bar                  │ 28-32px
└──────────────────────────────────────────────┘
```

### 4.2 Split View Mode

用于 Detail 详情展示，作为设计目标预留。

推荐尺寸：

- Width：960px
- Height：560px
- Left List：380px
- Right Detail：580px

V0.1 可以先采用页面入栈模式实现，V0.2 再完成 Split View。

### 4.3 Action Panel

触发方式：`Ctrl + K`。

布局：

- 底部居中悬浮。
- Width：520px。
- Max Height：320px。
- 背景遮罩透明度：0.4。
- 支持动作搜索、分组、快捷键提示。

---

## 5. V0.1 React UI SDK 组件清单

### 5.1 V0.1 必须实现

基础组件：

- `WindowShell`
- `CommandInput`
- `List`
- `List.Item`
- `List.Section`
- `EmptyState`
- `LoadingState`
- `Skeleton`
- `Spinner`
- `Tag`
- `Icon`
- `KeyboardShortcut`

工具与反馈组件：

- `Detail`
- `Markdown`
- `CodeBlock`
- `Toast`
- `ActionPanel`
- `Action`
- `ErrorState`

### 5.2 V0.2 后置组件

- `List.Dropdown`
- `Grid`
- `Table`
- `Progress`
- `Tabs`
- `Tree`
- 虚拟滚动增强版 List

---

## 6. 核心组件 API 草案

> 注意：以下是内部 React 组件 Props。未来第三方插件不能传递 ReactNode，必须使用 JSON-safe UI Schema。

### 6.1 List

```tsx
interface ListProps {
  isLoading?: boolean
  selectedId?: string
  onSelectionChange?: (id: string) => void
  children: React.ReactNode
}
```

### 6.2 List.Item

```tsx
interface ListItemProps {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  accessory?: React.ReactNode
  actions?: React.ReactNode
  detail?: React.ReactNode
  isSelected?: boolean
  onSelect?: (id: string) => void
}
```

### 6.3 Detail

```tsx
interface MetadataItem {
  label: string
  value: string
}

interface DetailProps {
  title?: string
  markdown?: string
  metadata?: MetadataItem[]
  isLoading?: boolean
}
```

### 6.4 CodeBlock

```tsx
interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  wrap?: boolean
  copyable?: boolean
}
```

### 6.5 ErrorState

```tsx
interface ErrorStateProps {
  title?: string
  description: string
  pluginName?: string
  stackTrace?: string
  onRetry?: () => void
  onDisable?: () => void
  onCopyError?: () => void
}
```

---

## 7. 交互与焦点规范

### 7.1 键盘优先

必须支持：

| 快捷键 | 行为 |
|---|---|
| `Alt + Space` | 呼出 / 隐藏窗口 |
| `Esc` | 返回上一级 / 隐藏窗口 |
| `ArrowUp` / `ArrowDown` | 切换选中项 |
| `Enter` | 执行当前命令 |
| `Ctrl + K` | 打开 Action Panel |
| `Ctrl + ,` | 打开设置 |

### 7.2 Focus 样式

当前选中列表项：

- 背景：`--qb-bg-focus`
- 描边：`1px solid var(--qb-border-focus)`
- 左侧指示条：3px 宽，50% 高度，`--qb-accent-primary`
- 切换时背景即时响应，不要拖慢键盘操作。

### 7.3 Loading 状态

- Runtime Busy：搜索框右侧 16x16 Spinner。
- Data Fetching：列表区域显示 3-5 行 Skeleton。
- 异步完成 / 失败：使用 Toast。

### 7.4 动效

- List Navigation：0ms 延迟，背景即时变化。
- Hover / Focus：100-120ms。
- Action Panel：160ms，`cubic-bezier(0.16, 1, 0.3, 1)`。
- Split View：180ms ease-out。
- Toast：180ms。

---

## 8. Empty State 与 Error State

### 8.1 EmptyState 结构

```text
Icon
Title
Description
Primary Action
Optional Secondary Action
```

典型场景：

- 搜索无结果。
- 插件没有命令。
- 插件管理页为空。
- 剪贴板历史为空。
- 本地插件目录为空。

示例：

```text
未找到相关命令
尝试更换搜索词，或打开插件管理器安装更多工具。
```

### 8.2 ErrorState 结构

当插件超时、崩溃、权限被拒绝或运行时错误时，必须原地显示错误状态，不得影响主启动器。

必须提供：

- 错误标题。
- 简短说明。
- 插件名称。
- 可展开技术详情。
- 重试 / 重启插件。
- 禁用插件。
- 复制错误信息。

---

## 9. 插件 UI Schema 设计注意事项

### 9.1 内部 React Props 与外部 Schema 分离

内部 React 组件可以使用 `ReactNode`。  
未来第三方插件返回的 UI 必须是 JSON-safe Schema。

错误方向：

```tsx
accessory?: ReactNode
```

第三方 Schema 应使用：

```ts
interface ListItemSchema {
  id: string
  title: string
  subtitle?: string
  icon?: IconSchema
  accessory?: AccessorySchema
  actions?: ActionSchema[]
  detail?: DetailSchema
}
```

### 9.2 示例 Schema

```json
{
  "type": "List",
  "props": {
    "isLoading": false
  },
  "children": [
    {
      "type": "List.Item",
      "props": {
        "id": "format-json",
        "title": "Format JSON",
        "subtitle": "Format clipboard JSON",
        "icon": {
          "type": "builtin",
          "name": "braces"
        },
        "accessory": {
          "type": "tag",
          "label": "Official",
          "tone": "primary"
        }
      }
    }
  ]
}
```

---

## 10. V0.1 实施顺序

不要直接从业务工具开始写。建议按以下顺序落地：

1. 建立 `docs/DESIGN_SYSTEM.md`、`docs/UI_SDK.md`、`docs/PLUGIN_UI_SCHEMA.md`。
2. 实现 `src/styles/tokens.css`。
3. 实现 `src/styles/global.css`。
4. 实现基础 UI 组件：`WindowShell`、`CommandInput`、`List`、`List.Item`、`EmptyState`、`LoadingState`、`Spinner`。
5. 使用 mock 数据搭建 Launcher 静态原型。
6. 完成 UI Review。
7. 接入 CommandRegistry。
8. 接入 BuiltinPluginLoader。
9. 实现 JSON / 时间戳 / Base64 / UUID 内置插件。
10. 再考虑 Split View、虚拟滚动和更复杂的插件视图。

---

## 11. Codex 任务模板：Design System 基础层

```text
请开始实现 QuickBox 的 Design System 基础层。

上下文：
- 项目是 Tauri 2 + React + TypeScript + Rust。
- UI 方案见 docs/DESIGN_SYSTEM.md。
- 目标是先实现设计令牌和全局样式，不实现业务逻辑。

任务：
1. 创建 src/styles/tokens.css
2. 创建 src/styles/global.css
3. 在 src/main.tsx 中引入全局样式
4. 定义 dark theme CSS variables
5. 预留 light theme CSS variables
6. 定义字体变量、颜色变量、圆角变量、阴影变量、动效变量、尺寸变量
7. 实现 .qb-window、.qb-divider、.qb-scrollbar、.qb-focus-ring 等基础 class
8. 所有颜色必须来自 CSS variables
9. 不允许引入大型 UI 框架
10. 不允许实现具体业务组件

验收标准：
- pnpm typecheck 通过
- pnpm dev 可运行
- 应用基础背景符合 QuickBox dark-first 设计
- 没有硬编码业务功能
```

---

## 12. Codex 任务模板：基础 UI 组件

```text
请实现 QuickBox V0.1 基础 UI 组件。

要求：
1. 组件放在 src/ui/
2. 每个组件独立目录，例如 src/ui/List/List.tsx
3. 所有样式必须基于 CSS Variables
4. 不允许写业务逻辑
5. 不允许依赖插件系统
6. 组件必须支持键盘优先场景
7. 使用 TypeScript 严格类型
8. 为每个组件导出 Props 类型

需要实现：
- WindowShell
- CommandInput
- List
- ListItem
- EmptyState
- LoadingState
- Spinner
- Tag
- Icon
- KeyboardShortcut
```

---

## 13. 暂缓项

V0.1 暂不强制实现：

- 独立第三方插件运行时。
- QuickJS Runtime。
- 插件市场。
- 完整虚拟滚动。
- 复杂 Split View 窗口动画。
- 高级 WebView 插件。
- 复杂主题编辑器。

这些能力只做架构预留，不进入第一版开发目标。
