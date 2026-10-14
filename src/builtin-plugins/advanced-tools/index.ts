import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const AstVisualizerToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.AstVisualizerToolView })))
const BatchRenameToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.BatchRenameToolView })))
const CronToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.CronToolView })))
const CssClampToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.CssClampToolView })))
const FileContentSearchToolView = lazy(() => import('./FileContentSearchToolView'))
const HmacToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.HmacToolView })))
const PasswordStrengthToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.PasswordStrengthToolView })))
const SensitiveMaskToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.SensitiveMaskToolView })))
const SqlFormatterToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.SqlFormatterToolView })))
const XmlToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.XmlToolView })))
const YamlToolView = lazy(() => import('./AdvancedToolsView').then((module) => ({ default: module.YamlToolView })))

const tools = [
  {
    id: 'yaml',
    title: 'YAML 格式化与校验',
    description: '整理 YAML 缩进并提示常见结构问题',
    keywords: ['yaml', '格式化', '校验', '配置'],
    component: YamlToolView,
  },
  {
    id: 'xml',
    title: 'XML 格式化与校验',
    description: '解析 XML 文本并输出缩进结构',
    keywords: ['xml', '格式化', '校验'],
    component: XmlToolView,
  },
  {
    id: 'sql-formatter',
    title: 'SQL 格式化',
    description: '格式化和压缩常见 SQL 语句',
    keywords: ['sql', 'format', '格式化', '压缩'],
    component: SqlFormatterToolView,
  },
  {
    id: 'hmac',
    title: 'HMAC 生成器',
    description: '生成接口签名调试常用的 HMAC 摘要',
    keywords: ['hmac', '签名', '摘要', 'sha'],
    component: HmacToolView,
  },
  {
    id: 'cron',
    title: 'Cron 表达式解析器',
    description: '把 5 段 Cron 表达式转换为可读说明',
    keywords: ['cron', '定时', '表达式', '解析'],
    component: CronToolView,
  },
  {
    id: 'password-strength',
    title: '密码强度检测',
    description: '评估密码长度、字符类型和重复模式',
    keywords: ['password', '密码', '强度', '安全'],
    component: PasswordStrengthToolView,
  },
  {
    id: 'sensitive-mask',
    title: '敏感信息脱敏',
    description: '识别并脱敏邮箱、手机号、银行卡号和密钥字段',
    keywords: ['脱敏', '敏感信息', '邮箱', '手机号', 'token'],
    component: SensitiveMaskToolView,
  },
  {
    id: 'css-clamp',
    title: 'CSS Clamp 计算器',
    description: '生成响应式 CSS clamp 表达式',
    keywords: ['css', 'clamp', '响应式', '字号'],
    component: CssClampToolView,
  },
  {
    id: 'ast-visualizer',
    title: 'AST 可视化工具',
    description: '把代码片段拆成轻量 token 树形视图',
    keywords: ['ast', '代码', '可视化', 'parser', '语法树'],
    component: AstVisualizerToolView,
  },
  {
    id: 'batch-rename',
    title: '批量文件重命名',
    description: '按正则替换、序号和日期规则重命名文件',
    keywords: ['文件', '批量', '重命名', 'rename', '正则'],
    component: BatchRenameToolView,
  },
  {
    id: 'file-content-search',
    title: '文件内容搜索',
    description: '递归搜索目录中的文本内容并返回文件行号',
    keywords: ['文件', '内容', '搜索', 'grep', 'todo', 'java', 'ts', 'rs'],
    component: FileContentSearchToolView,
  },
]

const plugin: ToolPlugin = {
  id: 'official.advanced-tools',
  name: '进阶工具集',
  version: '0.1.0',
  description: '来自 QuickBox 工具规划的中高难度内置工具',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: tools.map((tool) => ({
    id: `official.advanced-tools.${tool.id}`,
    pluginId: 'official.advanced-tools',
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    source: 'builtin',
    executeMode: 'view',
    run: async (ctx) => {
      await ctx.openView(`official.advanced-tools.${tool.id}.view`)
    },
  })),
  views: tools.map((tool) => ({
    id: `official.advanced-tools.${tool.id}.view`,
    title: tool.title,
    component: tool.component,
  })),
}

export default plugin
