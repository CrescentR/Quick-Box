import { ToolShell } from './ToolShell'
import { useToolInput, useToolContext } from '../../core/tool/tool-context'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  clearClipboardHistory,
  deleteClipboardHistoryItem,
  loadClipboardHistory,
  readClipboardText,
  recordClipboardText,
  writeClipboardText,
} from '../../api/clipboard-api'
import type { ClipboardHistoryItem } from '../../api/clipboard-api'
import { pickScreenColor } from '../../api/file-tools-api'
import type { ScreenColor } from '../../api/file-tools-api'
import type { PluginViewProps } from '../../core/plugin/plugin-types'
import { useLauncherStore } from '../../stores/launcher-store'
import { CodeBlock, Detail, Markdown, Tag } from '../../ui'

interface ToolShellProps {
  title: string
  level: string
  description: string
  children: ReactNode
  notes?: string
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type UnitCategory = 'length' | 'weight' | 'data' | 'temperature'
type JwtAlgorithm = 'HS256'
type FileHashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'
type DiffMode = 'lines' | 'words' | 'json'
type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore' | 'revert'
type PlaceholderMode = 'latin' | 'chinese'

const sampleJson = `{
  "id": 1001,
  "name": "QuickBox",
  "tags": ["桌面", "工具"],
  "active": true
}`


function getStringParam(params: PluginViewProps['params'], key: string, fallback: string) {
  const value = params?.[key]
  return typeof value === 'string' ? value : fallback
}

function decodeUnicodeEscapes(value: string) {
  return value.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, codePoint, codeUnit) => {
    const hex = codePoint || codeUnit
    return String.fromCodePoint(Number.parseInt(hex, 16))
  })
}

function encodeUnicodeEscapes(value: string) {
  return Array.from(value)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0
      return code <= 0x7f ? char : code <= 0xffff ? `\\u${code.toString(16).padStart(4, '0')}` : `\\u{${code.toString(16)}}`
    })
    .join('')
}

export function UnicodeToolView() {
  const [input, setInput] = useState('QuickBox -> \\u5de5\\u5177\\u7bb1')
  const encoded = useMemo(() => encodeUnicodeEscapes(input), [input])
  const decoded = useMemo(() => decodeUnicodeEscapes(input), [input])

  return (
    <ToolShell title="Unicode 编码转换" level="L1" description="将文本转换为 Unicode 转义，也可以把转义字符串还原成可读文本。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">编码结果</span>
          <CodeBlock code={encoded} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">解码结果</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function encodeHtmlEntities(value: string) {
  return value.replace(/[&<>"']/g, (char) => entityMap[char])
}

function decodeHtmlEntities(value: string) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export function HtmlEntityToolView() {
  const [input, setInput] = useState('<button title="QuickBox">复制并运行</button>')
  const encoded = useMemo(() => encodeHtmlEntities(input), [input])
  const decoded = useMemo(() => decodeHtmlEntities(input), [input])

  return (
    <ToolShell title="HTML Entity 编码转换" level="L1" description="把 HTML 特殊字符转换为实体编码，也可以把实体编码还原为普通文本。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">编码结果</span>
          <CodeBlock code={encoded} language="html" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">解码结果</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function words(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
}

function titleCase(value: string) {
  return words(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function TextCaseToolView() {
  const [input, setInput] = useState('quick_box text-case helper')
  const variants = useMemo(() => {
    const parts = words(input)
    const pascal = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('')
    const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1)
    return {
      小写: input.toLowerCase(),
      大写: input.toUpperCase(),
      标题格式: titleCase(input),
      小驼峰: camel,
      大驼峰: pascal,
      下划线: parts.map((part) => part.toLowerCase()).join('_'),
      短横线: parts.map((part) => part.toLowerCase()).join('-'),
    }
  }, [input])

  return (
    <ToolShell title="文本大小写转换" level="L1" description="为代码命名、文件名和粘贴文本快速生成常见大小写格式。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        {Object.entries(variants).map(([label, value]) => (
          <div className="qb-tool-field" key={label}>
            <span className="qb-tool-label">{label}</span>
            <CodeBlock code={value} language="txt" wrap copyable />
          </div>
        ))}
      </div>
    </ToolShell>
  )
}


const regexTemplates = [
  {
    category: '身份与联系方式',
    name: '国内手机号',
    pattern: '^1[3-9]\\d{9}$',
    flags: '',
    sample: '13812345678',
  },
  {
    category: '身份与联系方式',
    name: '邮箱地址',
    pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
    flags: 'i',
    sample: 'dev@quickbox.local',
  },
  {
    category: '身份与联系方式',
    name: '中国居民身份证号',
    pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[0-9Xx]$',
    flags: '',
    sample: '11010519900307123X',
  },
  {
    category: '网络',
    name: 'IPv4',
    pattern: '^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$',
    flags: '',
    sample: '192.168.1.1',
  },
  {
    category: '网络',
    name: 'URL',
    pattern: '^https?:\\/\\/[^\\s/$.?#].[^\\s]*$',
    flags: 'i',
    sample: 'https://quickbox.local/tools?q=regex',
  },
  {
    category: '网络',
    name: '域名',
    pattern: '^(?!-)([A-Za-z0-9-]{1,63}\\.)+[A-Za-z]{2,63}$',
    flags: 'i',
    sample: 'quickbox.local',
  },
  {
    category: '开发',
    name: 'UUID v4',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    flags: 'i',
    sample: '550e8400-e29b-41d4-a716-446655440000',
  },
  {
    category: '开发',
    name: '十六进制颜色',
    pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$',
    flags: '',
    sample: '#3b82f6',
  },
  {
    category: '开发',
    name: '语义化版本',
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z.-]+))?(?:\\+([0-9A-Za-z.-]+))?$',
    flags: '',
    sample: 'v1.2.3-beta.1+build.7',
  },
  {
    category: '文本',
    name: '空白行',
    pattern: '^\\s*$',
    flags: 'gm',
    sample: 'line 1\n\nline 3',
  },
  {
    category: '文本',
    name: 'HTML 标签',
    pattern: '<([A-Za-z][A-Za-z0-9]*)\\b[^>]*>(.*?)<\\/\\1>',
    flags: 'gs',
    sample: '<button>QuickBox</button>',
  },
  {
    category: '文件',
    name: 'Windows 路径',
    pattern: '^[A-Za-z]:\\\\(?:[^\\\\/:*?"<>|\\r\\n]+\\\\)*[^\\\\/:*?"<>|\\r\\n]*$',
    flags: '',
    sample: 'C:\\Users\\QuickBox\\Desktop\\demo.txt',
  },
]

export function RegexLibraryToolView() {
  const [query, setQuery] = useState('')
  const openView = useLauncherStore((state) => state.openView)
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return regexTemplates
    return regexTemplates.filter((template) =>
      [template.category, template.name, template.pattern].some((value) => value.toLowerCase().includes(keyword)),
    )
  }, [query])

  return (
    <ToolShell title="常用正则表达式库" level="L1" description="内置常用正则模板，可复制表达式或带入正则测试工具。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">搜索模板</span>
          <input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">模板</span>
          <div className="qb-tool-template-list">
            {filtered.map((template) => (
              <section className="qb-tool-template" key={`${template.category}-${template.name}`}>
                <div className="qb-tool-template__head">
                  <div>
                    <div className="qb-tool-template__title">{template.name}</div>
                    <div className="qb-tool-template__meta">{template.category}</div>
                  </div>
                  <Tag tone="default">{template.flags || '无 flags'}</Tag>
                </div>
                <CodeBlock code={template.pattern} language="txt" wrap copyable />
                <div className="qb-tool-actions">
                  <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(template.pattern)}>
                    复制表达式
                  </button>
                  <button
                    className="qb-tool-button qb-tool-button--primary"
                    type="button"
                    onClick={() =>
                      openView('official.regex-tool.view', {
                        pattern: template.pattern,
                        flags: template.flags,
                        text: template.sample,
                      })
                    }
                  >
                    跳入正则测试
                  </button>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </ToolShell>
  )
}

function dateDiff(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '日期输入无效'
  }

  const ms = endDate.getTime() - startDate.getTime()
  const abs = Math.abs(ms)
  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const seconds = Math.floor((abs % 60_000) / 1000)

  return JSON.stringify(
    {
      方向: ms >= 0 ? '向后' : '向前',
      毫秒差: ms,
      绝对差值: { 天: days, 小时: hours, 分钟: minutes, 秒: seconds },
    },
    null,
    2,
  )
}

export function DateDiffToolView() {
  const [start, setStart] = useState('2026-05-23T09:00')
  const [end, setEnd] = useState('2026-06-01T18:30')
  const result = useMemo(() => dateDiff(start, end), [end, start])

  return (
    <ToolShell title="日期差值计算器" level="L1" description="计算两个日期时间之间的精确差值，适合排期、SLA 和记录场景。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">开始时间</span>
          <input className="qb-tool-input" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">结束时间</span>
          <input className="qb-tool-input" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">计算结果</span>
          <CodeBlock code={result} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const timeZones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo']

function parseTimeInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) return null
    return new Date(trimmed.length <= 10 ? numeric * 1000 : numeric)
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date)
}

function convertTimeZones(input: string) {
  const date = parseTimeInput(input)
  if (!date) {
    return JSON.stringify(
      {
        valid: false,
        message: '请输入 ISO 时间或 Unix 时间戳',
      },
      null,
      2,
    )
  }

  return JSON.stringify(
    {
      valid: true,
      input,
      instant: {
        unixSeconds: Math.floor(date.getTime() / 1000),
        unixMilliseconds: date.getTime(),
        iso: date.toISOString(),
      },
      zones: Object.fromEntries(timeZones.map((timeZone) => [timeZone, formatInTimeZone(date, timeZone)])),
    },
    null,
    2,
  )
}

export function TimezoneConverterToolView() {
  const [input, setInput] = useState('2026-06-11T09:00:00Z')
  const output = useMemo(() => convertTimeZones(input), [input])

  return (
    <ToolShell title="时区转换器" level="L1" description="把同一个时间点转换到常用时区，适合跨地区排期、日志和接口调试。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">ISO 时间或 Unix 时间戳</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">转换结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function generateRandomString(length: number, charset: string) {
  if (!charset) return ''
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => charset[value % charset.length]).join('')
}

export function RandomStringToolView() {
  const [length, setLength] = useState(32)
  const [charset, setCharset] = useState('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
  const output = useMemo(() => generateRandomString(Math.max(1, Math.min(512, length)), charset), [charset, length])

  return (
    <ToolShell title="随机字符串生成器" level="L1" description="按自定义字符集生成随机令牌、短 ID 和测试用字符串。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">长度</span>
          <input className="qb-tool-input" type="number" min={1} max={512} value={length} onChange={(event) => setLength(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">字符集</span>
          <input className="qb-tool-input qb-mono" value={charset} onChange={(event) => setCharset(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输出</span>
          <CodeBlock code={output || '// 字符集为空'} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)} disabled={!output}>
          复制输出
        </button>
      </div>
    </ToolShell>
  )
}

function buildQuery(baseUrl: string, rawParams: string) {
  const search = new URLSearchParams()
  rawParams
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separator = line.includes('=') ? '=' : ':'
      const [key, ...valueParts] = line.split(separator)
      if (key.trim()) search.append(key.trim(), valueParts.join(separator).trim())
    })

  const query = search.toString()
  if (!baseUrl.trim()) return query ? `?${query}` : ''
  const [address, ...hash] = baseUrl.split('#')
  return `${address}${query ? `${address.includes('?') ? '&' : '?'}${query}` : ''}${hash.length ? `#${hash.join('#')}` : ''}`
}

export function QueryBuilderToolView() {
  const { input: incoming } = useToolContext()
  const initialUrl = (() => { try { return incoming ? new URL(incoming.text) : null } catch { return null } })()
  const [baseUrl, setBaseUrl] = useState(initialUrl ? `${initialUrl.origin}${initialUrl.pathname}${initialUrl.hash}` : 'https://api.quickbox.local/search')
  const [params, setParams] = useState(initialUrl ? Array.from(initialUrl.searchParams).map(([key, value]) => `${key}=${value}`).join('\n') : 'q=桌面工具\nsort=recent\npage=1')
  const output = useMemo(() => buildQuery(baseUrl, params), [baseUrl, params])

  return (
    <ToolShell title="Query 参数构建器" level="L1" description="把简单的键值行转换为已编码的 URL query 字符串。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">基础 URL</span>
          <input className="qb-tool-input qb-mono" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">参数</span>
          <textarea className="qb-tool-textarea qb-mono" value={params} onChange={(event) => setParams(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">URL</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function inferType(value: JsonValue, name: string, depth = 0): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    const inner = value.length ? inferType(value[0], name, depth + 1) : 'unknown'
    return `${inner}[]`
  }
  if (typeof value !== 'object') return typeof value

  const indent = '  '.repeat(depth + 1)
  const closeIndent = '  '.repeat(depth)
  const fields = Object.entries(value)
    .map(([key, child]) => `${indent}${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${inferType(child, key, depth + 1)}`)
    .join('\n')
  return `{\n${fields}\n${closeIndent}}`
}

function jsonToTypeScript(input: string, typeName: string) {
  try {
    const parsed = JSON.parse(input) as JsonValue
    const safeName = /^[A-Za-z_$][\w$]*$/.test(typeName) ? typeName : 'GeneratedType'
    const inferred = inferType(parsed, safeName)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? `export interface ${safeName} ${inferred}`
      : `export type ${safeName} = ${inferred}`
  } catch (error) {
    return error instanceof Error ? error.message : 'JSON 无效'
  }
}

export function JsonToTypeScriptToolView() {
  const [input, setInput] = useToolInput(sampleJson)
  const [typeName, setTypeName] = useState('QuickBoxItem')
  const output = useMemo(() => jsonToTypeScript(input, typeName), [input, typeName])

  return (
    <ToolShell title="JSON 转 TypeScript 类型" level="L2" description="根据示例 JSON 对象或数组推断 TypeScript 类型定义。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">类型名称</span>
          <input className="qb-tool-input qb-mono" value={typeName} onChange={(event) => setTypeName(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">TypeScript</span>
          <CodeBlock code={output} language="ts" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  )
}

function decodeJwt(token: string) {
  try {
    const [header, payload, signature = ''] = token.trim().split('.')
    if (!header || !payload) return 'JWT 必须包含 header 和 payload 两段内容'
    return JSON.stringify(
      {
        header: JSON.parse(decodeBase64Url(header)),
        payload: JSON.parse(decodeBase64Url(payload)),
        signature长度: signature.length,
        是否有signature: Boolean(signature),
      },
      null,
      2,
    )
  } catch (error) {
    return error instanceof Error ? error.message : 'JWT 无效'
  }
}

export function JwtDecoderToolView() {
  const [token, setToken] = useToolInput(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAxIiwibmFtZSI6IlF1aWNrQm94IiwiaWF0IjoxNzE2NDAwMDAwfQ.demo',
  )
  const output = useMemo(() => decodeJwt(token), [token])

  return (
    <ToolShell title="JWT 解析器" level="L2" description="在本地解析 JWT 的 header 与 payload，不把 token 发送到网络。这里只解析内容，未验证签名。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JWT</span>
          <textarea className="qb-tool-textarea qb-mono" value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解析结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value))
}

async function signHs256(message: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return bytesToBase64Url(new Uint8Array(signature))
}

async function createJwt(payloadText: string, secret: string, algorithm: JwtAlgorithm) {
  if (algorithm !== 'HS256') return '当前版本仅支持 HS256'

  const payload = JSON.parse(payloadText) as JsonValue
  const header = { alg: algorithm, typ: 'JWT' }
  const encodedHeader = textToBase64Url(JSON.stringify(header))
  const encodedPayload = textToBase64Url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = await signHs256(signingInput, secret)
  return `${signingInput}.${signature}`
}

export function JwtGeneratorToolView() {
  const [payload, setPayload] = useState('{\n  "id": 1,\n  "name": "QuickBox",\n  "iat": 1781200000\n}')
  const [secret, setSecret] = useState('quickbox-secret')
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>('HS256')
  const [token, setToken] = useState('')

  const generateToken = async () => {
    try {
      setToken(await createJwt(payload, secret, algorithm))
    } catch (error) {
      setToken(error instanceof Error ? error.message : 'JWT 生成失败')
    }
  }

  return (
    <ToolShell
      title="JWT 生成器"
      level="L1"
      description="输入 payload 和密钥，在本地生成 HS256 JWT，适合接口鉴权联调。"
      notes="- 生成过程只在本地完成，不会把密钥或 payload 发送到网络。\n- 当前版本按文档需求实现 HS256。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Payload JSON</span>
          <textarea className="qb-tool-textarea qb-mono" value={payload} onChange={(event) => setPayload(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">算法</span>
          <select className="qb-tool-input" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as JwtAlgorithm)}>
            <option value="HS256">HS256</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">密钥</span>
          <input className="qb-tool-input qb-mono" value={secret} onChange={(event) => setSecret(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JWT</span>
          <CodeBlock code={token || '// 点击生成 JWT'} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void generateToken()}>
          生成 JWT
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(token)} disabled={!token}>
          复制 JWT
        </button>
      </div>
    </ToolShell>
  )
}

function formatDurationFromSeconds(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '请输入非负秒数'
  const seconds = Math.floor(totalSeconds)
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const restSeconds = seconds % 60
  const parts = [
    days ? `${days}天` : '',
    hours ? `${hours}小时` : '',
    minutes ? `${minutes}分钟` : '',
    restSeconds || seconds === 0 ? `${restSeconds}秒` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

function parseTtlText(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Math.floor(Number(trimmed))

  const unitSeconds: Record<string, number> = {
    秒: 1,
    s: 1,
    sec: 1,
    second: 1,
    分钟: 60,
    分: 60,
    m: 60,
    min: 60,
    minute: 60,
    小时: 3_600,
    时: 3_600,
    h: 3_600,
    hour: 3_600,
    天: 86_400,
    日: 86_400,
    d: 86_400,
    day: 86_400,
  }
  let total = 0
  let matched = false
  const pattern = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+|[\u4e00-\u9fa5]+)/g
  let match = pattern.exec(trimmed)

  while (match) {
    const unit = match[2].toLowerCase()
    const seconds = unitSeconds[unit]
    if (!seconds) return null
    total += Number(match[1]) * seconds
    matched = true
    match = pattern.exec(trimmed)
  }

  return matched ? Math.floor(total) : null
}

function analyzeRedisTtl(input: string) {
  const seconds = parseTtlText(input)
  if (seconds === null) {
    return JSON.stringify(
      {
        valid: false,
        message: '请输入秒数，或输入 7天、1小时30分钟 这类时长',
      },
      null,
      2,
    )
  }

  return JSON.stringify(
    {
      valid: true,
      seconds,
      readable: formatDurationFromSeconds(seconds),
      redis: {
        EX: seconds,
        PX: seconds * 1000,
      },
    },
    null,
    2,
  )
}

export function RedisTtlToolView() {
  const [input, setInput] = useState('7天')
  const output = useMemo(() => analyzeRedisTtl(input), [input])

  return (
    <ToolShell title="Redis Key TTL 计算器" level="L1" description="在秒数和可读时长之间转换，并输出 Redis EX/PX 参数。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">秒数或时长</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

export function MarkdownPreviewToolView() {
  const [input, setInput] = useState('# Hello QuickBox\n\n- 支持标题、列表和段落\n- 支持 `inline code`、**加粗** 和 *斜体*')

  return (
    <ToolShell
      title="Markdown 实时预览"
      level="L1"
      description="左侧输入 Markdown，右侧实时预览常用文档结构。"
      notes="- 使用 QuickBox 内置 Markdown 渲染组件。\n- 当前支持标题、段落、无序列表、有序列表、行内代码、加粗和斜体。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Markdown</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">预览</span>
          <div className="qb-tool-preview">
            <Markdown content={input} />
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">源码</span>
          <CodeBlock code={input || '// 等待 Markdown 输入'} language="md" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const httpStatusRows = [
  { code: 100, phrase: 'Continue', category: '1xx', description: '客户端可以继续发送请求。' },
  { code: 101, phrase: 'Switching Protocols', category: '1xx', description: '服务器同意切换协议。' },
  { code: 200, phrase: 'OK', category: '2xx', description: '请求成功。' },
  { code: 201, phrase: 'Created', category: '2xx', description: '请求成功并创建了资源。' },
  { code: 202, phrase: 'Accepted', category: '2xx', description: '请求已接受，但处理尚未完成。' },
  { code: 204, phrase: 'No Content', category: '2xx', description: '请求成功，响应体为空。' },
  { code: 301, phrase: 'Moved Permanently', category: '3xx', description: '资源已永久移动到新地址。' },
  { code: 302, phrase: 'Found', category: '3xx', description: '资源临时位于其他地址。' },
  { code: 304, phrase: 'Not Modified', category: '3xx', description: '缓存资源仍可使用。' },
  { code: 307, phrase: 'Temporary Redirect', category: '3xx', description: '临时重定向，方法和请求体保持不变。' },
  { code: 308, phrase: 'Permanent Redirect', category: '3xx', description: '永久重定向，方法和请求体保持不变。' },
  { code: 400, phrase: 'Bad Request', category: '4xx', description: '请求语法或参数无效。' },
  { code: 401, phrase: 'Unauthorized', category: '4xx', description: '缺少有效认证信息。' },
  { code: 403, phrase: 'Forbidden', category: '4xx', description: '服务器拒绝执行请求。' },
  { code: 404, phrase: 'Not Found', category: '4xx', description: '目标资源不存在。' },
  { code: 405, phrase: 'Method Not Allowed', category: '4xx', description: '资源不支持当前 HTTP 方法。' },
  { code: 409, phrase: 'Conflict', category: '4xx', description: '请求与资源当前状态冲突。' },
  { code: 410, phrase: 'Gone', category: '4xx', description: '资源曾经存在，但现在已不可用。' },
  { code: 415, phrase: 'Unsupported Media Type', category: '4xx', description: '请求体媒体类型不被支持。' },
  { code: 422, phrase: 'Unprocessable Entity', category: '4xx', description: '语法正确，但语义校验失败。' },
  { code: 429, phrase: 'Too Many Requests', category: '4xx', description: '请求频率超过限制。' },
  { code: 500, phrase: 'Internal Server Error', category: '5xx', description: '服务器内部错误。' },
  { code: 501, phrase: 'Not Implemented', category: '5xx', description: '服务器不支持请求所需功能。' },
  { code: 502, phrase: 'Bad Gateway', category: '5xx', description: '网关从上游收到无效响应。' },
  { code: 503, phrase: 'Service Unavailable', category: '5xx', description: '服务暂时不可用。' },
  { code: 504, phrase: 'Gateway Timeout', category: '5xx', description: '网关等待上游响应超时。' },
] as const

export function HttpStatusToolView() {
  const [query, setQuery] = useState('422')
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return httpStatusRows
    return httpStatusRows.filter((row) =>
      [String(row.code), row.phrase, row.category, row.description].some((value) => value.toLowerCase().includes(keyword)),
    )
  }, [query])
  const output = useMemo(() => JSON.stringify(filtered, null, 2), [filtered])

  return (
    <ToolShell title="HTTP 状态码速查表" level="L1" description="按状态码、英文短语或说明快速查询常见 HTTP 响应含义。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">搜索</span>
          <input className="qb-tool-input qb-mono" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">匹配结果</span>
          <div className="qb-tool-template-list">
            {filtered.map((row) => (
              <section className="qb-tool-template" key={row.code}>
                <div className="qb-tool-template__head">
                  <div>
                    <div className="qb-tool-template__title">
                      {row.code} {row.phrase}
                    </div>
                    <div className="qb-tool-template__meta">{row.description}</div>
                  </div>
                  <Tag tone="default">{row.category}</Tag>
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function parseBigIntWithRadix(value: string, radix: number) {
  const normalized = value.trim().replace(/_/g, '')
  if (!normalized) return null
  const patterns: Record<number, RegExp> = {
    2: /^[+-]?[01]+$/,
    8: /^[+-]?[0-7]+$/,
    10: /^[+-]?\d+$/,
    16: /^[+-]?(?:0x)?[0-9a-fA-F]+$/,
  }
  if (!patterns[radix].test(normalized)) return null
  const sign = normalized.startsWith('-') ? -1n : 1n
  const unsigned = normalized.replace(/^[+-]/, '').replace(/^0x/i, '')
  let result = 0n
  for (const char of unsigned) {
    const digit = Number.parseInt(char, radix)
    result = result * BigInt(radix) + BigInt(digit)
  }
  return sign * result
}

function formatRadix(value: bigint | null) {
  if (value === null) {
    return {
      binary: '',
      octal: '',
      decimal: '',
      hexadecimal: '',
      report: '输入内容与所选进制不匹配',
    }
  }

  const sign = value < 0n ? '-' : ''
  const absValue = value < 0n ? -value : value
  return {
    binary: `${sign}${absValue.toString(2)}`,
    octal: `${sign}${absValue.toString(8)}`,
    decimal: value.toString(10),
    hexadecimal: `${sign}${absValue.toString(16).toUpperCase()}`,
    report: '转换成功',
  }
}

export function RadixConverterToolView() {
  const [radix, setRadix] = useState(10)
  const [input, setInput] = useState('255')
  const output = useMemo(() => formatRadix(parseBigIntWithRadix(input, radix)), [input, radix])

  return (
    <ToolShell title="进制/基数转换器" level="L1" description="在二进制、八进制、十进制和十六进制之间转换整数。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入进制</span>
          <select className="qb-tool-input" value={radix} onChange={(event) => setRadix(Number(event.target.value))}>
            <option value={2}>二进制</option>
            <option value={8}>八进制</option>
            <option value={10}>十进制</option>
            <option value={16}>十六进制</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">数值</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">二进制</span>
          <CodeBlock code={output.binary || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">八进制</span>
          <CodeBlock code={output.octal || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">十进制</span>
          <CodeBlock code={output.decimal || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">十六进制</span>
          <CodeBlock code={output.hexadecimal || output.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function parseDelimitedRows(input: string) {
  const delimiter = input.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)
  return rows.filter((item) => item.some((value) => value.trim()))
}

function escapeMarkdownCell(value: string) {
  return value.trim().replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

function toMarkdownTable(input: string, hasHeader: boolean) {
  const rows = parseDelimitedRows(input).map((row) => row.map(escapeMarkdownCell))
  if (!rows.length) return ''
  const columnCount = Math.max(...rows.map((row) => row.length))
  const normalizedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''))
  const header = hasHeader ? normalizedRows[0] : normalizedRows[0].map((_, index) => `列 ${index + 1}`)
  const body = hasHeader ? normalizedRows.slice(1) : normalizedRows
  const widths = header.map((cell, index) =>
    Math.max(cell.length, 3, ...body.map((row) => row[index].length)),
  )
  const formatRow = (row: string[]) => `| ${row.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`
  const divider = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`
  return [formatRow(header), divider, ...body.map(formatRow)].join('\n')
}

export function MarkdownTableToolView() {
  const [input, setInput] = useState('name\trole\nQuickBox\tlauncher\nPlugin\ttool view')
  const [hasHeader, setHasHeader] = useState(true)
  const output = useMemo(() => toMarkdownTable(input, hasHeader), [hasHeader, input])

  return (
    <ToolShell title="Markdown 表格转换器" level="L1" description="把 Excel 粘贴文本、TSV 或 CSV 转成对齐的 Markdown 表格。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">表格文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-checkbox">
          <input type="checkbox" checked={hasHeader} onChange={(event) => setHasHeader(event.target.checked)} />
          <span>第一行作为表头</span>
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Markdown</span>
          <CodeBlock code={output || '// 等待表格输入'} language="md" showLineNumbers copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)} disabled={!output}>
          复制 Markdown 表格
        </button>
      </div>
    </ToolShell>
  )
}

function rotateLeft(value: number, count: number) {
  return (value << count) | (value >>> (32 - count))
}

function md5WordToHex(value: number) {
  return [0, 8, 16, 24]
    .map((shift) => ((value >>> shift) & 0xff).toString(16).padStart(2, '0'))
    .join('')
}

function md5ArrayBuffer(buffer: ArrayBuffer) {
  const input = new Uint8Array(buffer)
  const paddedLength = (((input.length + 1 + 8 + 63) / 64) | 0) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(input)
  padded[input.length] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, (input.length * 8) >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(input.length / 0x20000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true))
    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f = 0
      let wordIndex = 0

      if (index < 16) {
        f = (b & c) | (~b & d)
        wordIndex = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        wordIndex = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        wordIndex = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        wordIndex = (7 * index) % 16
      }

      const shift = shifts[Math.floor(index / 16) * 4 + (index % 4)]
      const next = d
      d = c
      c = b
      b = (b + rotateLeft((a + f + constants[index] + words[wordIndex]) >>> 0, shift)) >>> 0
      a = next
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return [a0, b0, c0, d0].map(md5WordToHex).join('')
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function hashFile(file: File, algorithm: FileHashAlgorithm) {
  if (file.size > 32 * 1024 * 1024) throw new Error('当前浏览器哈希工具限制为 32 MB，请选择更小文件。')
  const buffer = await file.arrayBuffer()
  if (algorithm === 'MD5') return md5ArrayBuffer(buffer)
  const digest = await crypto.subtle.digest(algorithm, buffer)
  return arrayBufferToHex(digest)
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${Number(value.toFixed(unitIndex === 0 ? 0 : 2))} ${units[unitIndex]}`
}

export function FileHashToolView() {
  const [algorithm, setAlgorithm] = useState<FileHashAlgorithm>('SHA-256')
  const [expectedHash, setExpectedHash] = useState('')
  const [result, setResult] = useState('// 选择文件后点击计算')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const calculateHash = async () => {
    if (!selectedFile) {
      setResult('请先选择文件')
      return
    }

    try {
      const hash = await hashFile(selectedFile, algorithm)
      const normalizedExpected = expectedHash.trim().toLowerCase()
      const matches = normalizedExpected ? hash === normalizedExpected : null
      setResult(
        JSON.stringify(
          {
            file: {
              name: selectedFile.name,
              size: selectedFile.size,
              readableSize: formatBytes(selectedFile.size),
              lastModified: new Date(selectedFile.lastModified).toISOString(),
            },
            algorithm,
            hash,
            expectedHash: normalizedExpected || null,
            matches,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      setResult(error instanceof Error ? error.message : '文件哈希计算失败')
    }
  }

  return (
    <ToolShell
      title="文件哈希校验器"
      level="L1"
      description="对本地文件计算 MD5、SHA1、SHA256 或 SHA512，并可与期望值比对。"
      notes="- 文件只在本地浏览器上下文读取，不会上传。\n- 当前版本一次读取整个文件，超大文件后续可升级为分块计算。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">文件</span>
          <input className="qb-tool-input" type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">算法</span>
          <select className="qb-tool-input" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as FileHashAlgorithm)}>
            <option value="MD5">MD5</option>
            <option value="SHA-1">SHA1</option>
            <option value="SHA-256">SHA256</option>
            <option value="SHA-512">SHA512</option>
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">期望哈希，可留空</span>
          <input className="qb-tool-input qb-mono" value={expectedHash} onChange={(event) => setExpectedHash(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">结果</span>
          <CodeBlock code={result} language={result.trim().startsWith('{') ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void calculateHash()} disabled={!selectedFile}>
          计算哈希
        </button>
      </div>
    </ToolShell>
  )
}

function parseHex(hex: string) {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null
  const full = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l: Math.round(lightness * 100) }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4
  return { h: Math.round(hue * 60 + (hue < 0 ? 360 : 0)), s: Math.round(saturation * 100), l: Math.round(lightness * 100) }
}

export function ColorConverterToolView({ params }: PluginViewProps) {
  const [hex, setHex] = useState(() => getStringParam(params, 'hex', '#3b82f6'))
  const color = useMemo(() => parseHex(hex), [hex])
  const output = useMemo(() => {
    if (!color) return 'HEX 颜色无效'
    const hsl = rgbToHsl(color.r, color.g, color.b)
    return JSON.stringify(
      {
        hex: `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`,
        rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
        hsl: `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`,
      },
      null,
      2,
    )
  }, [color])

  return (
    <ToolShell title="HEX / RGB / HSL 颜色转换" level="L1" description="把 HEX 颜色转换为可直接用于 CSS 的 RGB 与 HSL 格式。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">HEX</span>
          <input className="qb-tool-input qb-mono" value={hex} onChange={(event) => setHex(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">预览</span>
          <div className="qb-tool-swatch" style={{ background: color ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'transparent' }} />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">格式</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function formatScreenColor(color: ScreenColor | null) {
  if (!color) return '// 点击取色后显示结果'
  return JSON.stringify(
    {
      position: { x: color.x, y: color.y },
      hex: color.hex,
      rgb: color.rgb,
      channels: { r: color.r, g: color.g, b: color.b },
    },
    null,
    2,
  )
}

export function ScreenColorPickerToolView() {
  const [color, setColor] = useState<ScreenColor | null>(null)
  const [message, setMessage] = useState('')
  const openView = useLauncherStore((state) => state.openView)

  const pickColor = async () => {
    try {
      const nextColor = await pickScreenColor()
      setColor(nextColor)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '屏幕取色失败')
    }
  }

  return (
    <ToolShell
      title="屏幕取色器"
      level="L2"
      description="读取当前鼠标所在屏幕像素颜色，并可带入颜色转换工具。"
      notes="- Windows 版本通过 Rust 调用系统 API 读取鼠标位置像素。\n- 取色前把鼠标移动到目标颜色上，再点击取色按钮或使用触控板点击。"
    >
      <div className="qb-tool-grid">
        <div className="qb-tool-field">
          <span className="qb-tool-label">颜色预览</span>
          <div className="qb-tool-swatch" style={{ background: color?.hex ?? 'transparent' }} />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">结果</span>
          <CodeBlock code={message || formatScreenColor(color)} language={color ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void pickColor()}>
          读取鼠标位置颜色
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(color?.hex ?? '')} disabled={!color}>
          复制 HEX
        </button>
        <button
          className="qb-tool-button"
          type="button"
          onClick={() => color && openView('official.utility-tools.color-converter.view', { hex: color.hex })}
          disabled={!color}
        >
          打开颜色转换
        </button>
      </div>
    </ToolShell>
  )
}

function formatHistoryTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function summarizeClipboardText(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 96) return normalized
  return `${normalized.slice(0, 96)}...`
}

export function ClipboardHistoryToolView() {
  const [items, setItems] = useState<ClipboardHistoryItem[]>([])
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(true)
  const [status, setStatus] = useState('正在加载剪贴板历史。')
  const lastRecordedRef = useRef('')

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => item.text.toLowerCase().includes(keyword))
  }, [items, query])

  const refreshHistory = async () => {
    try {
      const nextItems = await loadClipboardHistory()
      setItems(nextItems)
      setStatus(`已加载 ${nextItems.length} 条历史。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '加载剪贴板历史失败。')
    }
  }

  const captureClipboard = async () => {
    try {
      const text = await readClipboardText()
      if (!text.trim()) {
        setStatus('当前剪贴板没有可记录的纯文本。')
        return
      }
      if (text === lastRecordedRef.current) {
        setStatus('当前剪贴板文本已经记录。')
        return
      }
      const nextItems = await recordClipboardText(text)
      lastRecordedRef.current = text
      setItems(nextItems)
      setStatus(`已记录 ${nextItems.length} 条历史，最多保留 100 条。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '读取或记录剪贴板失败。')
    }
  }

  const copyHistoryItem = async (text: string) => {
    try {
      await writeClipboardText(text)
      lastRecordedRef.current = text
      const nextItems = await recordClipboardText(text)
      setItems(nextItems)
      setStatus('已复制并刷新到历史顶部。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '复制剪贴板历史失败。')
    }
  }

  const deleteHistoryItem = async (id: number) => {
    try {
      const nextItems = await deleteClipboardHistoryItem(id)
      setItems(nextItems)
      setStatus(`已删除，当前 ${nextItems.length} 条历史。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '删除剪贴板历史失败。')
    }
  }

  const clearHistory = async () => {
    try {
      await clearClipboardHistory()
      setItems([])
      setStatus('已清空剪贴板历史。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '清空剪贴板历史失败。')
    }
  }

  useEffect(() => {
    void refreshHistory()
  }, [])

  useEffect(() => {
    if (!listening) return undefined
    void captureClipboard()
    const timer = window.setInterval(() => {
      void captureClipboard()
    }, 2000)
    return () => window.clearInterval(timer)
  }, [listening])

  return (
    <ToolShell
      title="剪贴板纯文本历史记录"
      level="L2"
      description="监听系统剪贴板纯文本变化，记录到本地 SQLite，并只保留最新 100 条。"
      notes="- 仅记录纯文本，图片和文件不会进入历史。\n- 重复文本会刷新到最新位置。\n- 记录保存在本机 SQLite，不上传到网络。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">搜索历史</span>
          <input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">监听状态</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={listening} onChange={(event) => setListening(event.target.checked)} />
            <span>{listening ? '正在监听' : '已暂停'}</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">状态</span>
          <CodeBlock code={status} language="txt" wrap copyable={false} />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">历史记录</span>
          <div className="qb-tool-template-list">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <section className="qb-tool-template" key={item.id}>
                  <div className="qb-tool-template__head">
                    <div>
                      <div className="qb-tool-template__title">{summarizeClipboardText(item.text)}</div>
                      <div className="qb-tool-template__meta">
                        {formatHistoryTime(item.createdAt)} · {item.text.length} 字符
                      </div>
                    </div>
                    <Tag tone="default">文本</Tag>
                  </div>
                  <CodeBlock code={item.text} language="txt" wrap copyable />
                  <div className="qb-tool-actions">
                    <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void copyHistoryItem(item.text)}>
                      复制
                    </button>
                    <button className="qb-tool-button" type="button" onClick={() => void deleteHistoryItem(item.id)}>
                      删除
                    </button>
                  </div>
                </section>
              ))
            ) : (
              <CodeBlock code={query ? '没有匹配的剪贴板历史。' : '暂无剪贴板历史。'} language="txt" wrap copyable={false} />
            )}
          </div>
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void captureClipboard()}>
          记录当前剪贴板
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void refreshHistory()}>
          刷新
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void clearHistory()} disabled={!items.length}>
          清空历史
        </button>
      </div>
    </ToolShell>
  )
}

const commitTypes: CommitType[] = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']

function buildCommitMessage(type: CommitType, scope: string, subject: string, breaking: boolean, body: string) {
  const normalizedScope = scope.trim()
  const normalizedSubject = subject.trim()
  const header = `${type}${normalizedScope ? `(${normalizedScope})` : ''}${breaking ? '!' : ''}: ${normalizedSubject || 'update quickbox'}`
  return [header, body.trim()].filter(Boolean).join('\n\n')
}

export function GitCommitFormatterToolView() {
  const [type, setType] = useState<CommitType>('feat')
  const [scope, setScope] = useState('tools')
  const [subject, setSubject] = useState('add text diff view')
  const [body, setBody] = useState('')
  const [breaking, setBreaking] = useState(false)
  const message = useMemo(() => buildCommitMessage(type, scope, subject, breaking, body), [body, breaking, scope, subject, type])

  return (
    <ToolShell
      title="Git 标准 Commit 生成器"
      level="L1"
      description="按 Angular Conventional Commits 结构生成可复制的提交信息。"
      notes="- Header 格式为 `type(scope): subject`。\n- 勾选 breaking change 后会生成 `type(scope)!: subject`。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Type</span>
          <select className="qb-tool-input" value={type} onChange={(event) => setType(event.target.value as CommitType)}>
            {commitTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">Scope</span>
          <input className="qb-tool-input qb-mono" value={scope} onChange={(event) => setScope(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Subject</span>
          <input className="qb-tool-input" value={subject} onChange={(event) => setSubject(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Body，可留空</span>
          <textarea className="qb-tool-textarea qb-mono" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <label className="qb-tool-checkbox">
          <input type="checkbox" checked={breaking} onChange={(event) => setBreaking(event.target.checked)} />
          <span>Breaking change</span>
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Commit Message</span>
          <CodeBlock code={message} language="git" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(message)}>
          复制 Commit
        </button>
      </div>
    </ToolShell>
  )
}

const latinWords = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'integer',
  'facilisis',
  'nunc',
  'vitae',
  'semper',
  'porta',
  'mauris',
  'fermentum',
  'rhoncus',
  'tellus',
  'vel',
  'finibus',
]

const chineseWords = [
  '工具',
  '窗口',
  '命令',
  '数据',
  '调试',
  '配置',
  '流程',
  '面板',
  '本地',
  '快速',
  '清晰',
  '稳定',
  '输入',
  '输出',
  '预览',
  '复制',
  '生成',
  '检查',
  '转换',
  '记录',
]

function buildPlaceholderText(mode: PlaceholderMode, paragraphs: number, wordsPerParagraph: number) {
  const wordList = mode === 'latin' ? latinWords : chineseWords
  const safeParagraphs = Math.max(1, Math.min(20, Math.floor(paragraphs)))
  const safeWords = Math.max(1, Math.min(300, Math.floor(wordsPerParagraph)))
  const lines = Array.from({ length: safeParagraphs }, (_, paragraphIndex) => {
    const words = Array.from({ length: safeWords }, (_, wordIndex) => wordList[(paragraphIndex * 7 + wordIndex) % wordList.length])
    if (mode === 'chinese') {
      return `${words.join('')}。`
    }
    const sentence = words.join(' ')
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
  })
  return lines.join('\n\n')
}

export function LoremIpsumToolView() {
  const [mode, setMode] = useState<PlaceholderMode>('latin')
  const [paragraphs, setParagraphs] = useState(2)
  const [wordsPerParagraph, setWordsPerParagraph] = useState(48)
  const output = useMemo(() => buildPlaceholderText(mode, paragraphs, wordsPerParagraph), [mode, paragraphs, wordsPerParagraph])

  return (
    <ToolShell title="占位文本生成器" level="L1" description="生成拉丁或中文占位文本，用于原型、静态页面和排版测试。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">文本类型</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as PlaceholderMode)}>
            <option value="latin">Lorem Ipsum</option>
            <option value="chinese">中文假文</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">段落数</span>
          <input className="qb-tool-input" type="number" min={1} max={20} value={paragraphs} onChange={(event) => setParagraphs(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">每段词数</span>
          <input
            className="qb-tool-input"
            type="number"
            min={1}
            max={300}
            value={wordsPerParagraph}
            onChange={(event) => setWordsPerParagraph(Number(event.target.value))}
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">生成结果</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)}>
          复制占位文本
        </button>
      </div>
    </ToolShell>
  )
}

function parseMongoObjectId(value: string) {
  const normalized = value.trim()

  if (!/^[0-9a-fA-F]{24}$/.test(normalized)) {
    return JSON.stringify(
      {
        valid: false,
        message: 'ObjectId 必须是 24 位十六进制字符串',
      },
      null,
      2,
    )
  }

  const timestampSeconds = Number.parseInt(normalized.slice(0, 8), 16)
  const createdAt = new Date(timestampSeconds * 1000)
  const randomValue = normalized.slice(8, 18)
  const counterHex = normalized.slice(18, 24)
  const counter = Number.parseInt(counterHex, 16)

  return JSON.stringify(
    {
      valid: true,
      objectId: normalized.toLowerCase(),
      timestamp: {
        seconds: timestampSeconds,
        iso: createdAt.toISOString(),
        local: createdAt.toLocaleString(),
      },
      randomValue,
      counter: {
        hex: counterHex.toLowerCase(),
        decimal: counter,
      },
    },
    null,
    2,
  )
}

export function MongoObjectIdToolView() {
  const [objectId, setObjectId] = useState('6650f5a80000000000000001')
  const output = useMemo(() => parseMongoObjectId(objectId), [objectId])

  return (
    <ToolShell
      title="Mongo ObjectId 解析器"
      level="L1"
      description="解析 MongoDB ObjectId 中携带的创建时间、随机段和计数器，适合快速排查数据时间线。"
      notes="- ObjectId 的前 4 字节是 Unix 秒级时间戳。\n- 中间 5 字节和最后 3 字节分别用于随机值和计数器。\n- 该工具只做本地解析，不连接数据库。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">ObjectId</span>
          <input
            className="qb-tool-input qb-mono"
            value={objectId}
            onChange={(event) => setObjectId(event.target.value)}
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解析结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function cleanSvg(input: string) {
  try {
    const parser = new DOMParser()
    const document = parser.parseFromString(input, 'image/svg+xml')
    const parserError = document.querySelector('parsererror')
    if (parserError) return { output: parserError.textContent || 'SVG 无效', removed: 0 }

    let removed = 0
    document.querySelectorAll('script, metadata').forEach((node) => {
      node.remove()
      removed += 1
    })
    document.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase()
        const value = attribute.value.toLowerCase()
        if (name.startsWith('on') || value.includes('javascript:') || name === 'data-name') {
          node.removeAttribute(attribute.name)
          removed += 1
        }
      })
    })

    const serialized = new XMLSerializer()
      .serializeToString(document.documentElement)
      .replace(/>\s+</g, '><')
      .trim()

    return { output: serialized, removed }
  } catch (error) {
    return { output: error instanceof Error ? error.message : '无法清理 SVG', removed: 0 }
  }
}

export function SvgCleanerToolView() {
  const [input, setInput] = useState(
    '<svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><metadata>demo</metadata><rect data-name="box" width="120" height="80" fill="#111827"/><circle cx="60" cy="40" r="24" fill="#22c55e" onclick="alert(1)"/></svg>',
  )
  const result = useMemo(() => cleanSvg(input), [input])

  return (
    <ToolShell
      title="SVG 清理器"
      level="L3"
      description="清理本地 SVG 标记，移除高风险脚本、事件处理器、元数据和冗余属性。"
      notes="- 该工具只在本地运行，并使用浏览器 XML 解析器。\n- 它会移除明显不安全或冗余的标记，但不是面向不可信网页发布的完整安全净化器。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">SVG 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">清理结果</span>
          <CodeBlock code={result.output} language="svg" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={JSON.stringify({ 移除项: result.removed, 字节数: result.output.length }, null, 2)} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const unitDefinitions = {
  length: {
    label: '长度',
    base: 'm',
    units: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.344,
    },
  },
  weight: {
    label: '重量',
    base: 'g',
    units: {
      mg: 0.001,
      g: 1,
      kg: 1000,
      oz: 28.349523125,
      lb: 453.59237,
    },
  },
  data: {
    label: '数据容量',
    base: 'B',
    units: {
      B: 1,
      KB: 1000,
      MB: 1000 ** 2,
      GB: 1000 ** 3,
      KiB: 1024,
      MiB: 1024 ** 2,
      GiB: 1024 ** 3,
    },
  },
}

function convertLinearUnit(category: Exclude<UnitCategory, 'temperature'>, value: number, fromUnit: string) {
  const definition = unitDefinitions[category]
  const factor = definition.units[fromUnit as keyof typeof definition.units]
  if (!factor || !Number.isFinite(value)) return null
  const baseValue = value * factor

  return Object.fromEntries(
    Object.entries(definition.units).map(([unit, unitFactor]) => [unit, Number((baseValue / unitFactor).toPrecision(12))]),
  )
}

function convertTemperature(value: number, fromUnit: string) {
  if (!Number.isFinite(value)) return null

  const celsius = fromUnit === 'F' ? (value - 32) * (5 / 9) : fromUnit === 'K' ? value - 273.15 : value

  return {
    C: Number(celsius.toPrecision(12)),
    F: Number(((celsius * 9) / 5 + 32).toPrecision(12)),
    K: Number((celsius + 273.15).toPrecision(12)),
  }
}

function getUnitOptions(category: UnitCategory) {
  if (category === 'temperature') return ['C', 'F', 'K']
  return Object.keys(unitDefinitions[category].units)
}

function convertUnits(category: UnitCategory, value: number, fromUnit: string) {
  const values = category === 'temperature' ? convertTemperature(value, fromUnit) : convertLinearUnit(category, value, fromUnit)
  if (!values) {
    return JSON.stringify(
      {
        valid: false,
        message: '数值或单位无效',
      },
      null,
      2,
    )
  }

  return JSON.stringify(
    {
      valid: true,
      category,
      input: {
        value,
        unit: fromUnit,
      },
      values,
    },
    null,
    2,
  )
}

export function UnitConverterToolView() {
  const [category, setCategory] = useState<UnitCategory>('length')
  const [value, setValue] = useState(1000)
  const [fromUnit, setFromUnit] = useState('m')
  const unitOptions = useMemo(() => getUnitOptions(category), [category])
  const output = useMemo(() => convertUnits(category, value, fromUnit), [category, fromUnit, value])

  const updateCategory = (nextCategory: UnitCategory) => {
    setCategory(nextCategory)
    setFromUnit(getUnitOptions(nextCategory)[0])
  }

  return (
    <ToolShell title="单位换算器" level="L1" description="换算常见长度、重量、数据容量和温度单位，输出结构化结果。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">类别</span>
          <select className="qb-tool-input" value={category} onChange={(event) => updateCategory(event.target.value as UnitCategory)}>
            <option value="length">长度</option>
            <option value="weight">重量</option>
            <option value="data">数据容量</option>
            <option value="temperature">温度</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入单位</span>
          <select className="qb-tool-input" value={fromUnit} onChange={(event) => setFromUnit(event.target.value)}>
            {unitOptions.map((unit) => (
              <option value={unit} key={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">数值</span>
          <input className="qb-tool-input qb-mono" type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">换算结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
