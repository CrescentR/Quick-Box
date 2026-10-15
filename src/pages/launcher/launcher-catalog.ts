import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  ArrowLeftRight,
  Binary,
  Braces,
  Calculator,
  Calendar,
  CalendarClock,
  CaseSensitive,
  Clipboard,
  ClipboardList,
  Clock,
  Code,
  Command,
  Cookie,
  Database,
  Dices,
  Diff,
  Eraser,
  EyeOff,
  FileCheck,
  FileCode,
  FileCog,
  FilePen,
  FileSearch,
  FileText,
  GitBranch,
  Globe,
  Hash,
  Image,
  KeyRound,
  KeySquare,
  Languages,
  Link,
  Link2,
  ListOrdered,
  Lock,
  Network,
  Palette,
  Pipette,
  QrCode,
  Quote,
  Regex,
  Replace,
  Route,
  Ruler,
  Server,
  Settings2,
  Sheet,
  ShieldCheck,
  Shuffle,
  Table,
  Tag,
  Terminal,
  Timer,
  Type,
  Unplug,
  Workflow,
} from 'lucide-react'
import type { Command as QuickBoxCommand } from '../../core/command/command-types'

/** 工具分类 id */
export type ToolCategoryId = 'network' | 'codec' | 'text' | 'time' | 'dev' | 'system' | 'other'

/** 侧栏筛选值：'all' 不过滤，'quick' 只看常用 */
export type ToolCategoryFilter = ToolCategoryId | 'all' | 'quick'

export interface ToolCategory {
  id: ToolCategoryId
  name: string
  /** 侧栏里的分类图标 */
  icon: LucideIcon
}

export interface ToolMeta {
  category: ToolCategory
  icon: LucideIcon
}

/** 分类列表，顺序即侧栏与列表分组的顺序 */
export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'network', name: '网络与端口', icon: Network },
  { id: 'codec', name: '编码与加密', icon: Lock },
  { id: 'text', name: 'JSON / 文本', icon: Braces },
  { id: 'time', name: '时间与生成', icon: Clock },
  { id: 'dev', name: '开发与设计', icon: Code },
  { id: 'system', name: '系统运维', icon: Terminal },
  { id: 'other', name: '其他', icon: AppWindow },
]

const CATEGORY_BY_ID = new Map(TOOL_CATEGORIES.map((category) => [category.id, category]))

/** 内置命令 → 分类与图标，key 为去掉 `official.` 前缀的命令 id */
const BUILTIN_TOOL_META: Record<string, [ToolCategoryId, LucideIcon]> = {
  'snippet-tool.open': ['dev', FileCode],
  'library-tool.open': ['dev', Terminal],
  'task-tool.open': ['dev', ClipboardList],
  'json-tool.open': ['text', Braces],
  'timestamp-tool.open': ['time', Clock],
  'base64-tool.open': ['codec', Binary],
  'uuid-tool.open': ['time', Dices],
  'hash-tool.open': ['codec', Hash],
  'port-killer-tool.open': ['network', Unplug],
  'command-cheatsheet-tool.open': ['system', Terminal],
  'chmod-calculator-tool.open': ['system', Lock],
  'url-tool.open': ['network', Link],
  'regex-tool.open': ['text', Regex],
  'jwt-key-tool.open': ['codec', KeyRound],
  'yaml-properties-tool.open': ['text', FileCog],
  'cidr-tool.open': ['network', Network],
  'cookie-tool.open': ['network', Cookie],
  'json-schema-tool.open': ['text', ShieldCheck],

  'utility-tools.unicode': ['codec', Languages],
  'utility-tools.html-entity': ['codec', Code],
  'utility-tools.text-case': ['text', CaseSensitive],
  'utility-tools.text-diff': ['text', Diff],
  'utility-tools.regex-library': ['text', Regex],
  'utility-tools.date-diff': ['time', Calendar],
  'utility-tools.timezone-converter': ['time', Globe],
  'utility-tools.random-string': ['time', Shuffle],
  'utility-tools.query-builder': ['network', Link2],
  'utility-tools.json-to-typescript': ['dev', FileCode],
  'utility-tools.jwt-decoder': ['codec', KeySquare],
  'utility-tools.jwt-generator': ['codec', KeyRound],
  'utility-tools.redis-ttl': ['dev', Timer],
  'utility-tools.http-status': ['network', Server],
  'utility-tools.radix-converter': ['codec', Calculator],
  'utility-tools.markdown-table': ['text', Table],
  'utility-tools.markdown-preview': ['text', FileText],
  'utility-tools.file-hash': ['codec', FileCheck],
  'utility-tools.color-converter': ['dev', Palette],
  'utility-tools.screen-color-picker': ['dev', Pipette],
  'utility-tools.qr-code-studio': ['codec', QrCode],
  'utility-tools.git-commit-formatter': ['dev', GitBranch],
  'utility-tools.clipboard-history': ['system', Clipboard],
  'utility-tools.lorem-ipsum': ['time', Type],
  'utility-tools.mongo-object-id': ['dev', Database],
  'utility-tools.svg-cleaner': ['dev', Image],
  'utility-tools.unit-converter': ['dev', Ruler],

  'advanced-tools.yaml': ['text', FileCode],
  'advanced-tools.xml': ['text', Code],
  'advanced-tools.sql-formatter': ['text', Database],
  'advanced-tools.hmac': ['codec', ShieldCheck],
  'advanced-tools.cron': ['time', CalendarClock],
  'advanced-tools.password-strength': ['codec', Lock],
  'advanced-tools.sensitive-mask': ['text', EyeOff],
  'advanced-tools.css-clamp': ['dev', Ruler],
  'advanced-tools.ast-visualizer': ['dev', Workflow],
  'advanced-tools.batch-rename': ['system', FilePen],
  'advanced-tools.file-content-search': ['system', FileSearch],

  'workflow-tools.json-string': ['text', Quote],
  'workflow-tools.text-cleaner': ['text', Eraser],
  'workflow-tools.text-deduplicate': ['text', ListOrdered],
  'workflow-tools.regex-replace': ['text', Replace],
  'workflow-tools.csv-to-json': ['text', Sheet],
  'workflow-tools.json-to-csv': ['text', Sheet],
  'workflow-tools.json-to-rust': ['dev', FileCode],
  'workflow-tools.json-path': ['text', Route],
  'workflow-tools.aes-gcm': ['codec', Lock],
  'workflow-tools.curl-fetch': ['network', ArrowLeftRight],
  'workflow-tools.env-parser': ['dev', Settings2],
  'workflow-tools.gitignore-generator': ['dev', GitBranch],
  'workflow-tools.semver-helper': ['dev', Tag],
}

/**
 * 取命令的短别名，用于列表里显示 `/json` 这类检索词
 * @param command 命令
 */
export function getCommandAlias(command: QuickBoxCommand) {
  const keyword = command.keywords.find((item) => /^[a-z][a-z0-9-]{1,14}$/i.test(item))
  return keyword ? `/${keyword}` : undefined
}

/**
 * 获取命令的分类与图标，未登记的命令归入「其他」
 * @param command 命令
 */
export function getToolMeta(command: QuickBoxCommand): ToolMeta {
  const entry = BUILTIN_TOOL_META[command.id.replace(/^official\./, '')]

  if (entry) {
    return { category: CATEGORY_BY_ID.get(entry[0])!, icon: entry[1] }
  }

  return {
    category: CATEGORY_BY_ID.get('other')!,
    icon: command.executeMode === 'view' ? AppWindow : Command,
  }
}

/**
 * 把最近使用时间格式化为相对时间
 * @param lastRunAt ISO 时间字符串
 */
export function formatLastRun(lastRunAt?: string) {
  if (!lastRunAt) return '还没用过'

  const time = new Date(lastRunAt).getTime()
  if (Number.isNaN(time)) return '还没用过'

  const minutes = Math.floor((Date.now() - time) / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  return `${Math.floor(hours / 24)} 天前`
}
