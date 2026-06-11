import type { ToolPlugin } from '../../core/plugin/plugin-types'
import {
  AesGcmToolView,
  CsvToJsonToolView,
  CurlFetchToolView,
  EnvParserToolView,
  GitignoreGeneratorToolView,
  JsonPathToolView,
  JsonStringToolView,
  JsonToCsvToolView,
  JsonToRustToolView,
  RegexReplaceToolView,
  SemverHelperToolView,
  TextCleanerToolView,
  TextDeduplicateToolView,
} from './WorkflowToolsView'

const tools = [
  {
    id: 'json-string',
    title: 'JSON 字符串转义',
    description: '在普通文本与 JSON 字符串字面量之间转换',
    keywords: ['json', 'string', 'escape', 'unescape', '字符串', '转义'],
    component: JsonStringToolView,
  },
  {
    id: 'text-cleaner',
    title: '换行与空格清洗',
    description: '清理粘贴文本中的多余空格、空行和行尾字符',
    keywords: ['text', 'clean', 'space', 'newline', '文本', '空格', '换行'],
    component: TextCleanerToolView,
  },
  {
    id: 'text-deduplicate',
    title: '文本去重与排序',
    description: '按行去重、排序并统计处理结果',
    keywords: ['text', 'unique', 'sort', 'list', '文本', '去重', '排序'],
    component: TextDeduplicateToolView,
  },
  {
    id: 'regex-replace',
    title: '正则替换器',
    description: '使用正则表达式批量查找并替换文本',
    keywords: ['regex', 'replace', 'regexp', '正则', '替换'],
    component: RegexReplaceToolView,
  },
  {
    id: 'csv-to-json',
    title: 'CSV 转 JSON',
    description: '把 CSV 表格文本转换为 JSON 数组',
    keywords: ['csv', 'json', 'table', '数据', '转换'],
    component: CsvToJsonToolView,
  },
  {
    id: 'json-to-csv',
    title: 'JSON 转 CSV',
    description: '把 JSON 对象数组转换为可复制的 CSV 文本',
    keywords: ['json', 'csv', 'export', '导出', '表格'],
    component: JsonToCsvToolView,
  },
  {
    id: 'json-to-rust',
    title: 'JSON 转 Rust Struct',
    description: '从示例 JSON 推断 Rust 结构体和 serde 字段',
    keywords: ['json', 'rust', 'struct', 'serde', '类型'],
    component: JsonToRustToolView,
  },
  {
    id: 'json-path',
    title: 'JSONPath 测试器',
    description: '用路径表达式从 JSON 中提取匹配结果',
    keywords: ['jsonpath', 'json', 'path', 'query', '路径', '查询'],
    component: JsonPathToolView,
  },
  {
    id: 'aes-gcm',
    title: 'AES-GCM 加解密',
    description: '使用 Web Crypto 在本地加密或解密文本',
    keywords: ['aes', 'gcm', 'encrypt', 'decrypt', '加密', '解密'],
    component: AesGcmToolView,
  },
  {
    id: 'curl-fetch',
    title: 'cURL 与 fetch 互转',
    description: '在 cURL 命令和 fetch 调用片段之间转换',
    keywords: ['curl', 'fetch', 'http', 'api', '转换', '请求'],
    component: CurlFetchToolView,
  },
  {
    id: 'env-parser',
    title: '.env 配置解析器',
    description: '解析 .env 文本并输出 JSON、键值清单和统计信息',
    keywords: ['env', '.env', 'dotenv', 'config', 'environment', '环境变量', '配置'],
    component: EnvParserToolView,
  },
  {
    id: 'gitignore-generator',
    title: 'Gitignore 片段生成器',
    description: '按项目类型生成可复制的 .gitignore 片段',
    keywords: ['gitignore', '.gitignore', 'git', 'ignore', '模板', '忽略', '片段'],
    component: GitignoreGeneratorToolView,
  },
  {
    id: 'semver-helper',
    title: 'SemVer 版本助手',
    description: '解析语义化版本并生成 major、minor、patch 递增结果',
    keywords: ['semver', 'version', 'release', '版本', '发布', 'major', 'minor', 'patch'],
    component: SemverHelperToolView,
  },
]

const plugin: ToolPlugin = {
  id: 'official.workflow-tools',
  name: '开发工作流工具集',
  version: '0.1.0',
  description: '继续 QuickBox 工具库清单的 13 个开发者高频工具',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: tools.map((tool) => ({
    id: `official.workflow-tools.${tool.id}`,
    pluginId: 'official.workflow-tools',
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    source: 'builtin',
    executeMode: 'view',
    run: async (ctx) => {
      await ctx.openView(`official.workflow-tools.${tool.id}.view`)
    },
  })),
  views: tools.map((tool) => ({
    id: `official.workflow-tools.${tool.id}.view`,
    title: tool.title,
    component: tool.component,
  })),
}

export default plugin
