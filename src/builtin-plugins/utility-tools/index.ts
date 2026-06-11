import type { ToolPlugin } from '../../core/plugin/plugin-types'
import {
  ColorConverterToolView,
  DateDiffToolView,
  HtmlEntityToolView,
  JsonToTypeScriptToolView,
  JwtDecoderToolView,
  MongoObjectIdToolView,
  QueryBuilderToolView,
  RandomStringToolView,
  SvgCleanerToolView,
  TextCaseToolView,
  TimezoneConverterToolView,
  UnitConverterToolView,
  UnicodeToolView,
} from './UtilityToolsView'

const tools = [
  {
    id: 'unicode',
    title: 'Unicode 编码转换',
    description: 'Unicode 转义字符串编码与解码',
    keywords: ['unicode', 'escape', 'encode', 'decode', '编码', '解码', '转义'],
    component: UnicodeToolView,
  },
  {
    id: 'html-entity',
    title: 'HTML Entity 编码转换',
    description: 'HTML 实体编码与解码',
    keywords: ['html', 'entity', 'escape', 'decode', '实体', '编码', '解码'],
    component: HtmlEntityToolView,
  },
  {
    id: 'text-case',
    title: '文本大小写转换',
    description: '在常见命名格式之间转换文本',
    keywords: ['case', 'camel', 'pascal', 'snake', 'kebab', '大小写', '驼峰', '下划线'],
    component: TextCaseToolView,
  },
  {
    id: 'date-diff',
    title: '日期差值计算器',
    description: '计算两个日期时间之间的精确差值',
    keywords: ['date', 'time', 'diff', 'duration', '日期', '时间', '差值'],
    component: DateDiffToolView,
  },
  {
    id: 'timezone-converter',
    title: '时区转换器',
    description: '把 ISO 时间或 Unix 时间戳转换到常用时区',
    keywords: ['timezone', 'time zone', 'utc', 'gmt', 'Asia/Shanghai', '时区', '时间转换'],
    component: TimezoneConverterToolView,
  },
  {
    id: 'random-string',
    title: '随机字符串生成器',
    description: '按自定义字符集生成随机字符串',
    keywords: ['random', 'string', 'token', 'password', 'id', '随机', '字符串', '密码'],
    component: RandomStringToolView,
  },
  {
    id: 'query-builder',
    title: 'Query 参数构建器',
    description: '从键值行构建 URL query 字符串',
    keywords: ['query', 'url', 'params', 'builder', '参数', '构建'],
    component: QueryBuilderToolView,
  },
  {
    id: 'json-to-typescript',
    title: 'JSON 转 TypeScript 类型',
    description: '从 JSON 推断 TypeScript 类型',
    keywords: ['json', 'typescript', 'interface', 'type', '类型', '接口'],
    component: JsonToTypeScriptToolView,
  },
  {
    id: 'jwt-decoder',
    title: 'JWT 解析器',
    description: '在本地解析 JWT 的 header 与 payload',
    keywords: ['jwt', 'token', 'decode', 'auth', '解析', '鉴权'],
    component: JwtDecoderToolView,
  },
  {
    id: 'color-converter',
    title: 'HEX / RGB / HSL 颜色转换',
    description: '把 HEX 颜色转换为 RGB 与 HSL',
    keywords: ['color', 'hex', 'rgb', 'hsl', 'css', '颜色', '转换'],
    component: ColorConverterToolView,
  },
  {
    id: 'mongo-object-id',
    title: 'Mongo ObjectId 解析器',
    description: '解析 ObjectId 中的创建时间、随机段和计数器',
    keywords: ['mongo', 'mongodb', 'objectid', 'object id', 'bson', '解析', '时间'],
    component: MongoObjectIdToolView,
  },
  {
    id: 'svg-cleaner',
    title: 'SVG 清理器',
    description: '清理脚本、事件处理器、元数据和冗余 SVG 属性',
    keywords: ['svg', 'clean', 'sanitize', 'optimize', 'icon', '清理', '图标'],
    component: SvgCleanerToolView,
  },
  {
    id: 'unit-converter',
    title: '单位换算器',
    description: '换算长度、重量、数据容量和温度单位',
    keywords: ['unit', 'convert', 'length', 'weight', 'data', 'temperature', '单位', '换算'],
    component: UnitConverterToolView,
  },
]

const plugin: ToolPlugin = {
  id: 'official.utility-tools',
  name: '通用工具集',
  version: '0.1.0',
  description: '来自 QuickBox 工具规划的 12 个内置工具',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: tools.map((tool) => ({
    id: `official.utility-tools.${tool.id}`,
    pluginId: 'official.utility-tools',
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    source: 'builtin',
    executeMode: 'view',
    run: async (ctx) => {
      await ctx.openView(`official.utility-tools.${tool.id}.view`)
    },
  })),
  views: tools.map((tool) => ({
    id: `official.utility-tools.${tool.id}.view`,
    title: tool.title,
    component: tool.component,
  })),
}

export default plugin
