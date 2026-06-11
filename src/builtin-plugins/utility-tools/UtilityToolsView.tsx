import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Tag } from '../../ui'

interface ToolShellProps {
  title: string
  level: string
  description: string
  children: ReactNode
  notes?: string
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type UnitCategory = 'length' | 'weight' | 'data' | 'temperature'

const sampleJson = `{
  "id": 1001,
  "name": "QuickBox",
  "tags": ["桌面", "工具"],
  "active": true
}`

function ToolShell({ title, level, description, children, notes }: ToolShellProps) {
  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">{title}</div>
          <div className="qb-tool-view__description">{description}</div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{level}</Tag>
        </div>
      </header>
      {children}
      {notes ? <Detail title="说明" markdown={notes} /> : null}
    </section>
  )
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
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}`
}

export function QueryBuilderToolView() {
  const [baseUrl, setBaseUrl] = useState('https://api.quickbox.local/search')
  const [params, setParams] = useState('q=桌面工具\nsort=recent\npage=1')
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
  const [input, setInput] = useState(sampleJson)
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
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAxIiwibmFtZSI6IlF1aWNrQm94IiwiaWF0IjoxNzE2NDAwMDAwfQ.demo',
  )
  const output = useMemo(() => decodeJwt(token), [token])

  return (
    <ToolShell title="JWT 解析器" level="L2" description="在本地解析 JWT 的 header 与 payload，不把 token 发送到网络。">
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

export function ColorConverterToolView() {
  const [hex, setHex] = useState('#3b82f6')
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
