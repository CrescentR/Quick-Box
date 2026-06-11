import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CodeBlock, Detail, Tag } from '../../ui'

interface ToolShellProps {
  title: string
  level: string
  description: string
  children: ReactNode
  notes?: string
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type JsonObject = { [key: string]: JsonValue }
type AesMode = 'encrypt' | 'decrypt'
type CurlFetchMode = 'curl-to-fetch' | 'fetch-to-curl'
type EnvParseIssue = { line: number; text: string; message: string }
type GitignoreTemplateKey = 'node' | 'rust' | 'tauri' | 'python' | 'os' | 'editor'

const sampleObjectJson = `[
  { "id": 1, "name": "QuickBox", "enabled": true },
  { "id": 2, "name": "Toolkit", "enabled": false }
]`

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
          <Tag tone={level.startsWith('L3') ? 'warning' : level.startsWith('L2') ? 'success' : 'default'}>
            {level}
          </Tag>
        </div>
      </header>
      {children}
      {notes ? <Detail title="说明" markdown={notes} /> : null}
    </section>
  )
}

function safeJsonParse(input: string): { ok: true; value: JsonValue } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(input) as JsonValue }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'JSON 无效' }
  }
}

function toJsonStringLiteral(input: string) {
  return JSON.stringify(input)
}

function fromJsonStringLiteral(input: string) {
  const parsed = safeJsonParse(input.trim())
  if (!parsed.ok) return parsed.message
  return typeof parsed.value === 'string' ? parsed.value : '输入不是 JSON 字符串字面量'
}

export function JsonStringToolView() {
  const [input, setInput] = useState('QuickBox "工具箱"\n复制后直接用于 JSON 字段')
  const escaped = useMemo(() => toJsonStringLiteral(input), [input])
  const unescaped = useMemo(() => fromJsonStringLiteral(input), [input])

  return (
    <ToolShell title="JSON 字符串转义" level="L1" description="把普通文本转成 JSON 字符串字面量，也可以反向还原已转义内容。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">转义为 JSON 字符串</span>
          <CodeBlock code={escaped} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">从 JSON 字符串还原</span>
          <CodeBlock code={unescaped} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function cleanText(input: string, trimLines: boolean, collapseSpaces: boolean, removeBlankLines: boolean) {
  const lines = input.split('\n').map((line) => {
    let next = trimLines ? line.trim() : line.replace(/\s+$/g, '')
    if (collapseSpaces) {
      next = next.replace(/[ \t]{2,}/g, ' ')
    }
    return next
  })

  return (removeBlankLines ? lines.filter((line) => line.trim()) : lines).join('\n')
}

export function TextCleanerToolView() {
  const [input, setInput] = useState('  QuickBox    工具箱  \n\n  清理复制文本\t\t很方便  ')
  const [trimLines, setTrimLines] = useState(true)
  const [collapseSpaces, setCollapseSpaces] = useState(true)
  const [removeBlankLines, setRemoveBlankLines] = useState(true)
  const output = useMemo(
    () => cleanText(input, trimLines, collapseSpaces, removeBlankLines),
    [collapseSpaces, input, removeBlankLines, trimLines],
  )

  return (
    <ToolShell title="换行与空格清洗" level="L1" description="清理从网页、文档或日志里复制来的文本，保留可控的换行结构。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">原始文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">清洗选项</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={trimLines} onChange={(event) => setTrimLines(event.target.checked)} />
              <span>裁剪每行首尾空格</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={collapseSpaces} onChange={(event) => setCollapseSpaces(event.target.checked)} />
              <span>合并连续空格</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={removeBlankLines} onChange={(event) => setRemoveBlankLines(event.target.checked)} />
              <span>移除空行</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">清洗结果</span>
          <CodeBlock code={output || '// 清洗后为空'} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function uniqueLines(input: string, caseSensitive: boolean, sortLines: boolean) {
  const seen = new Set<string>()
  const duplicated: string[] = []
  const unique = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = caseSensitive ? line : line.toLowerCase()
      if (seen.has(key)) {
        duplicated.push(line)
        return false
      }
      seen.add(key)
      return true
    })

  const output = sortLines ? [...unique].sort((a, b) => a.localeCompare(b, 'zh-CN')) : unique
  return {
    output: output.join('\n'),
    report: JSON.stringify(
      {
        原始行数: input.split('\n').filter((line) => line.trim()).length,
        去重后行数: output.length,
        重复行数: duplicated.length,
      },
      null,
      2,
    ),
  }
}

export function TextDeduplicateToolView() {
  const [input, setInput] = useState('json\nxml\nJSON\ncsv\nxml\nrust')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [sortLines, setSortLines] = useState(true)
  const result = useMemo(() => uniqueLines(input, caseSensitive, sortLines), [caseSensitive, input, sortLines])

  return (
    <ToolShell title="文本去重与排序" level="L2" description="按行处理列表，适合整理 ID、域名、邮箱、关键词和临时数据。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入列表</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">处理选项</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
              <span>区分大小写</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={sortLines} onChange={(event) => setSortLines(event.target.checked)} />
              <span>按字母排序</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">输出</span>
          <CodeBlock code={result.output || '// 无有效行'} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function replaceWithRegex(input: string, pattern: string, flags: string, replacement: string) {
  try {
    const normalizedFlags = Array.from(new Set((flags || 'g').replace(/[^dgimsuvy]/g, '').split(''))).join('')
    const regex = new RegExp(pattern, normalizedFlags || 'g')
    const matches = input.match(regex) ?? []
    return {
      output: input.replace(regex, replacement),
      report: `匹配 ${matches.length} 处，flags=${normalizedFlags || 'g'}`,
    }
  } catch (error) {
    return {
      output: input,
      report: error instanceof Error ? `正则无效：${error.message}` : '正则无效',
    }
  }
}

export function RegexReplaceToolView() {
  const [input, setInput] = useState('user_id=1001\nuser_id=1002\norder_id=9001')
  const [pattern, setPattern] = useState('(user)_id')
  const [flags, setFlags] = useState('g')
  const [replacement, setReplacement] = useState('$1Id')
  const result = useMemo(() => replaceWithRegex(input, pattern, flags, replacement), [flags, input, pattern, replacement])

  return (
    <ToolShell title="正则替换器" level="L2" description="输入正则、flags 和替换模板，立即查看批量替换结果。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">原始文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">匹配正则</span>
          <input className="qb-tool-input qb-mono" value={pattern} onChange={(event) => setPattern(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">Flags</span>
          <input className="qb-tool-input qb-mono" value={flags} onChange={(event) => setFlags(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">替换为</span>
          <input className="qb-tool-input qb-mono" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">替换结果</span>
          <CodeBlock code={result.output} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">报告</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function parseCsv(input: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)
  return rows.filter((cells) => cells.some((value) => value.trim()))
}

function csvToJson(input: string, delimiter: string, firstRowHeader: boolean) {
  const rows = parseCsv(input, delimiter)
  if (!rows.length) return '[]'
  if (!firstRowHeader) return JSON.stringify(rows, null, 2)
  const [headers, ...items] = rows
  const records = items.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header.trim() || `column_${index + 1}`, row[index] ?? ''])),
  )
  return JSON.stringify(records, null, 2)
}

export function CsvToJsonToolView() {
  const [input, setInput] = useState('id,name,enabled\n1,QuickBox,true\n2,Toolkit,false')
  const [delimiter, setDelimiter] = useState(',')
  const [firstRowHeader, setFirstRowHeader] = useState(true)
  const output = useMemo(() => csvToJson(input, delimiter, firstRowHeader), [delimiter, firstRowHeader, input])

  return (
    <ToolShell title="CSV 转 JSON" level="L2" description="解析带引号的 CSV 文本，并输出对象数组或二维数组。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">CSV 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <label className="qb-tool-field">
            <span className="qb-tool-label">分隔符</span>
            <select className="qb-tool-input" value={delimiter} onChange={(event) => setDelimiter(event.target.value)}>
              <option value=",">逗号 ,</option>
              <option value=";">分号 ;</option>
              <option value={'\t'}>Tab</option>
            </select>
          </label>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={firstRowHeader} onChange={(event) => setFirstRowHeader(event.target.checked)} />
            <span>第一行作为字段名</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON 输出</span>
          <CodeBlock code={output} language="json" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function flattenRecord(record: JsonObject, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(flattenRecord(value as JsonObject, path))
      }
      return [[path, typeof value === 'string' ? value : JSON.stringify(value)]]
    }),
  )
}

function csvEscape(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function jsonToCsv(input: string, flatten: boolean) {
  const parsed = safeJsonParse(input)
  if (!parsed.ok) return parsed.message
  const rows = Array.isArray(parsed.value) ? parsed.value : [parsed.value]
  const objects = rows.filter((row): row is JsonObject => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
  if (!objects.length) return 'JSON 需要是对象或对象数组'

  const normalized = flatten ? objects.map((row) => flattenRecord(row)) : objects.map((row) => flattenRecord(row, ''))
  const headers = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))))
  return [
    headers.map(csvEscape).join(','),
    ...normalized.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ].join('\n')
}

export function JsonToCsvToolView() {
  const [input, setInput] = useState(sampleObjectJson)
  const [flatten, setFlatten] = useState(true)
  const output = useMemo(() => jsonToCsv(input, flatten), [flatten, input])

  return (
    <ToolShell title="JSON 转 CSV" level="L2" description="把 JSON 对象数组转成 CSV，嵌套对象可展开为点路径字段。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">JSON 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">选项</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={flatten} onChange={(event) => setFlatten(event.target.checked)} />
            <span>展开嵌套对象</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">CSV 输出</span>
          <CodeBlock code={output} language="csv" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'Generated'
}

function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'field'
}

function rustType(value: JsonValue, structName: string, structs: string[]): string {
  if (value === null) return 'Option<String>'
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') return Number.isInteger(value) ? 'i64' : 'f64'
  if (typeof value === 'string') return 'String'
  if (Array.isArray(value)) {
    return `Vec<${value.length ? rustType(value[0], structName, structs) : 'serde_json::Value'}>`
  }

  const childName = toPascalCase(structName)
  structs.push(buildRustStruct(value, childName, structs))
  return childName
}

function buildRustStruct(value: JsonObject, structName: string, structs: string[]) {
  const fields = Object.entries(value)
    .map(([key, child]) => {
      const fieldName = toSnakeCase(key)
      const rename = fieldName === key ? '' : `    #[serde(rename = "${key}")]\n`
      return `${rename}    pub ${fieldName}: ${rustType(child, `${structName}_${key}`, structs)},`
    })
    .join('\n')
  return `#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]\npub struct ${structName} {\n${fields}\n}`
}

function jsonToRust(input: string, rootName: string) {
  const parsed = safeJsonParse(input)
  if (!parsed.ok) return parsed.message
  const root = Array.isArray(parsed.value) ? parsed.value[0] : parsed.value
  if (!root || typeof root !== 'object' || Array.isArray(root)) return 'JSON 根节点需要是对象或对象数组'
  const structs: string[] = []
  const rootStruct = buildRustStruct(root, toPascalCase(rootName), structs)
  return [rootStruct, ...structs].join('\n\n')
}

export function JsonToRustToolView() {
  const [input, setInput] = useState('{"id":1001,"userName":"QuickBox","profile":{"enabled":true,"score":98.5}}')
  const [rootName, setRootName] = useState('QuickBoxUser')
  const output = useMemo(() => jsonToRust(input, rootName), [input, rootName])

  return (
    <ToolShell title="JSON 转 Rust Struct" level="L2" description="从示例 JSON 推断 Rust struct 字段，并自动添加 serde rename。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">根结构体名</span>
          <input className="qb-tool-input qb-mono" value={rootName} onChange={(event) => setRootName(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Rust 输出</span>
          <CodeBlock code={output} language="rust" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

type PathToken =
  | { type: 'key'; value: string }
  | { type: 'index'; value: number }
  | { type: 'wildcard' }

function parseJsonPath(path: string): PathToken[] {
  const tokens: PathToken[] = []
  let index = path.trim().startsWith('$') ? 1 : 0

  while (index < path.length) {
    const char = path[index]
    if (char === '.') {
      index += 1
      if (path[index] === '*') {
        tokens.push({ type: 'wildcard' })
        index += 1
        continue
      }
      const match = path.slice(index).match(/^[A-Za-z_$][\w$-]*/)
      if (!match) throw new Error(`第 ${index + 1} 位缺少字段名`)
      tokens.push({ type: 'key', value: match[0] })
      index += match[0].length
      continue
    }

    if (char === '[') {
      const end = path.indexOf(']', index)
      if (end < 0) throw new Error('方括号没有闭合')
      const body = path.slice(index + 1, end).trim()
      if (body === '*') tokens.push({ type: 'wildcard' })
      else if (/^\d+$/.test(body)) tokens.push({ type: 'index', value: Number(body) })
      else {
        const key = body.replace(/^["']|["']$/g, '')
        if (!key) throw new Error('字段名为空')
        tokens.push({ type: 'key', value: key })
      }
      index = end + 1
      continue
    }

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    throw new Error(`不支持的路径字符：${char}`)
  }

  return tokens
}

function evaluateJsonPath(input: string, path: string) {
  const parsed = safeJsonParse(input)
  if (!parsed.ok) return parsed.message

  try {
    const tokens = parseJsonPath(path)
    const values = tokens.reduce<JsonValue[]>((current, token) => {
      return current.flatMap((value) => {
        if (token.type === 'wildcard') {
          if (Array.isArray(value)) return value
          if (value && typeof value === 'object') return Object.values(value)
          return []
        }
        if (token.type === 'index') {
          return Array.isArray(value) && value[token.value] !== undefined ? [value[token.value]] : []
        }
        if (value && typeof value === 'object' && !Array.isArray(value) && token.value in value) {
          return [(value as JsonObject)[token.value]]
        }
        return []
      })
    }, [parsed.value])

    return JSON.stringify({ count: values.length, values }, null, 2)
  } catch (error) {
    return error instanceof Error ? error.message : 'JSONPath 无效'
  }
}

export function JsonPathToolView() {
  const [input, setInput] = useState('{"users":[{"name":"Ada","role":"admin"},{"name":"Lin","role":"dev"}],"total":2}')
  const [path, setPath] = useState('$.users[*].name')
  const output = useMemo(() => evaluateJsonPath(input, path), [input, path])

  return (
    <ToolShell
      title="JSONPath 测试器"
      level="L3"
      description="用路径表达式提取 JSON 中的字段，支持点路径、数组下标和通配符。"
      notes={'- 支持示例：`$.users[0].name`、`$.users[*].role`、`$["data"].items[*]`。\n- 当前版本聚焦本地快速测试，不覆盖递归下降和过滤表达式。'}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSONPath</span>
          <input className="qb-tool-input qb-mono" value={path} onChange={(event) => setPath(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">匹配结果</span>
          <CodeBlock code={output} language="json" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

function bytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function deriveAesKey(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder()
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bytesToArrayBuffer(salt), iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptAesGcm(plainText: string, password: string) {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAesKey(password, salt)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bytesToArrayBuffer(iv) }, key, encoder.encode(plainText))
  return JSON.stringify(
    {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 100_000,
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    },
    null,
    2,
  )
}

async function decryptAesGcm(packageText: string, password: string) {
  const decoder = new TextDecoder()
  const parsed = JSON.parse(packageText) as { iv: string; salt: string; ciphertext: string }
  const key = await deriveAesKey(password, base64ToBytes(parsed.salt))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytesToArrayBuffer(base64ToBytes(parsed.iv)) },
    key,
    bytesToArrayBuffer(base64ToBytes(parsed.ciphertext)),
  )
  return decoder.decode(decrypted)
}

export function AesGcmToolView() {
  const [mode, setMode] = useState<AesMode>('encrypt')
  const [input, setInput] = useState('QuickBox 本地加密示例')
  const [password, setPassword] = useState('quickbox-password')
  const [output, setOutput] = useState('')

  useEffect(() => {
    let cancelled = false
    const task = mode === 'encrypt' ? encryptAesGcm(input, password) : decryptAesGcm(input, password)

    task
      .then((value) => {
        if (!cancelled) setOutput(value)
      })
      .catch((error) => {
        if (!cancelled) setOutput(error instanceof Error ? error.message : 'AES-GCM 处理失败')
      })

    return () => {
      cancelled = true
    }
  }, [input, mode, password])

  return (
    <ToolShell
      title="AES-GCM 加解密"
      level="L3"
      description="用浏览器 Web Crypto 在本地完成文本加密和解密，并输出可保存的 JSON 包。"
      notes="- 密钥由密码通过 PBKDF2-SHA256 派生，随机 salt 和 IV 会写入输出包。\n- 解密时请把加密输出完整粘贴到输入框，并使用同一个密码。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">模式</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as AesMode)}>
            <option value="encrypt">加密</option>
            <option value="decrypt">解密</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">密码</span>
          <input className="qb-tool-input qb-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'encrypt' ? '明文输入' : '加密包输入'}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'encrypt' ? '加密输出' : '解密输出'}</span>
          <CodeBlock code={output || '// 等待输入'} language={mode === 'encrypt' ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function tokenizeShellLike(input: string) {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaping = false

  for (const char of input.trim()) {
    if (escaping) {
      current += char
      escaping = false
      continue
    }
    if (char === '\\') {
      escaping = true
      continue
    }
    if (quote) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (current) tokens.push(current)
  return tokens
}

function curlToFetch(input: string) {
  const tokens = tokenizeShellLike(input.replace(/\\\r?\n/g, ' '))
  if (!tokens.length || tokens[0] !== 'curl') return '请输入以 curl 开头的命令'
  let url = ''
  let method = 'GET'
  const headers: Record<string, string> = {}
  let body = ''

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (token === '-X' || token === '--request') {
      method = next?.toUpperCase() || method
      index += 1
      continue
    }
    if (token === '-H' || token === '--header') {
      const separator = next?.indexOf(':') ?? -1
      if (next && separator > 0) {
        headers[next.slice(0, separator).trim()] = next.slice(separator + 1).trim()
      }
      index += 1
      continue
    }
    if (['-d', '--data', '--data-raw', '--data-binary'].includes(token)) {
      body = next ?? ''
      if (method === 'GET') method = 'POST'
      index += 1
      continue
    }
    if (!token.startsWith('-')) {
      url = token
    }
  }

  if (!url) return '未找到请求 URL'
  const initLines = [`method: '${method}'`]
  if (Object.keys(headers).length) initLines.push(`headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')}`)
  if (body) initLines.push(`body: ${JSON.stringify(body)}`)
  return `const response = await fetch(${JSON.stringify(url)}, {\n  ${initLines.join(',\n  ')}\n})\nconst data = await response.json()`
}

function fetchToCurl(input: string) {
  const url = input.match(/fetch\(\s*(['"`])(.+?)\1/)?.[2]
  if (!url) return '未找到 fetch URL'
  const method = input.match(/method\s*:\s*(['"`])(.+?)\1/)?.[2]?.toUpperCase() ?? 'GET'
  const body = input.match(/body\s*:\s*JSON\.stringify\(([\s\S]+?)\)\s*[,}]/)?.[1] ?? input.match(/body\s*:\s*(['"`])([\s\S]+?)\1/)?.[2]
  const headerMatches = Array.from(input.matchAll(/['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g))
    .filter(([, key]) => key.toLowerCase() !== 'method' && key.toLowerCase() !== 'body')
    .map(([, key, value]) => `  -H ${JSON.stringify(`${key}: ${value}`)}`)
  const parts = [`curl ${JSON.stringify(url)}`, `  -X ${method}`, ...headerMatches]
  if (body) parts.push(`  --data-raw ${JSON.stringify(body.trim())}`)
  return parts.join(' \\\n')
}

export function CurlFetchToolView() {
  const [mode, setMode] = useState<CurlFetchMode>('curl-to-fetch')
  const [input, setInput] = useState("curl 'https://api.quickbox.local/tools' -X POST -H 'Content-Type: application/json' --data-raw '{\"limit\":10}'")
  const output = useMemo(() => (mode === 'curl-to-fetch' ? curlToFetch(input) : fetchToCurl(input)), [input, mode])

  return (
    <ToolShell
      title="cURL 与 fetch 互转"
      level="L3"
      description="把常见 cURL 命令转成 fetch 片段，也可以从 fetch 片段反向生成 cURL。"
      notes="- 适合常见调试命令：URL、method、headers 和 body。\n- 复杂 shell 展开、文件上传、多段表单等场景会在后续版本继续增强。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">转换方向</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as CurlFetchMode)}>
            <option value="curl-to-fetch">{'cURL -> fetch'}</option>
            <option value="fetch-to-curl">{'fetch -> cURL'}</option>
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">转换结果</span>
          <CodeBlock code={output} language={mode === 'curl-to-fetch' ? 'ts' : 'bash'} showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }

  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

function parseEnvText(input: string) {
  const values: Record<string, string> = {}
  const issues: EnvParseIssue[] = []
  let blankLines = 0
  let commentLines = 0

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1
    const trimmed = rawLine.trim()

    if (!trimmed) {
      blankLines += 1
      return
    }

    if (trimmed.startsWith('#')) {
      commentLines += 1
      return
    }

    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trimStart() : trimmed
    const separatorIndex = withoutExport.indexOf('=')

    if (separatorIndex <= 0) {
      issues.push({ line: lineNumber, text: rawLine, message: '缺少 key=value 结构' })
      return
    }

    const key = withoutExport.slice(0, separatorIndex).trim()
    const rawValue = withoutExport.slice(separatorIndex + 1)

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      issues.push({ line: lineNumber, text: rawLine, message: '变量名只能包含字母、数字和下划线，且不能以数字开头' })
      return
    }

    values[key] = unquoteEnvValue(rawValue)
  })

  const table = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  return {
    json: JSON.stringify(values, null, 2),
    table,
    report: JSON.stringify(
      {
        validEntries: Object.keys(values).length,
        commentLines,
        blankLines,
        issueCount: issues.length,
        issues,
      },
      null,
      2,
    ),
  }
}

export function EnvParserToolView() {
  const [input, setInput] = useState('APP_NAME=QuickBox\nAPP_ENV=development\nexport API_BASE_URL="https://api.quickbox.local"\n# local only\nFEATURE_FLAGS=tools,plugins,settings')
  const result = useMemo(() => parseEnvText(input), [input])

  return (
    <ToolShell
      title=".env 配置解析器"
      level="L2"
      description="把 .env 文本解析为 JSON 和键值清单，保留注释、空行和错误行统计。"
      notes="- 支持 `KEY=value`、`export KEY=value`、单双引号值和行尾注释。\n- 当前版本不会读取本地文件，也不会写入系统环境变量。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">.env 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">JSON 输出</span>
          <CodeBlock code={result.json} language="json" showLineNumbers copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">键值清单</span>
          <CodeBlock code={result.table || '// 没有有效配置项'} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const gitignoreTemplates: Record<GitignoreTemplateKey, { label: string; lines: string[] }> = {
  node: {
    label: 'Node / Vite',
    lines: ['node_modules/', 'dist/', 'dist-ssr/', '*.local', '.env', '.env.*', '!.env.example', 'npm-debug.log*', 'pnpm-debug.log*', 'yarn-debug.log*'],
  },
  rust: {
    label: 'Rust',
    lines: ['target/', 'Cargo.lock.bak', '*.pdb'],
  },
  tauri: {
    label: 'Tauri',
    lines: ['src-tauri/target/', 'src-tauri/gen/', 'src-tauri/.taurignore'],
  },
  python: {
    label: 'Python',
    lines: ['__pycache__/', '*.py[cod]', '.pytest_cache/', '.mypy_cache/', '.venv/', 'venv/'],
  },
  os: {
    label: '系统文件',
    lines: ['.DS_Store', 'Thumbs.db', 'desktop.ini'],
  },
  editor: {
    label: '编辑器',
    lines: ['.idea/', '.vscode/*', '!.vscode/extensions.json', '!.vscode/settings.json'],
  },
}

function buildGitignore(selectedTemplates: GitignoreTemplateKey[], customLines: string) {
  const sections = selectedTemplates.map((key) => {
    const template = gitignoreTemplates[key]
    return [`# ${template.label}`, ...template.lines].join('\n')
  })

  const custom = customLines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (custom.length) {
    sections.push(['# 自定义', ...custom].join('\n'))
  }

  const output = sections.join('\n\n')
  const uniqueLines = Array.from(
    new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    ),
  )

  return {
    output,
    report: JSON.stringify(
      {
        selectedTemplates: selectedTemplates.length,
        customLines: custom.length,
        ignoreRules: uniqueLines.length,
      },
      null,
      2,
    ),
  }
}

export function GitignoreGeneratorToolView() {
  const [selectedTemplates, setSelectedTemplates] = useState<GitignoreTemplateKey[]>(['node', 'rust', 'tauri', 'os'])
  const [customLines, setCustomLines] = useState('.codex-logs/\n*.log')
  const result = useMemo(() => buildGitignore(selectedTemplates, customLines), [customLines, selectedTemplates])

  const toggleTemplate = (key: GitignoreTemplateKey, checked: boolean) => {
    setSelectedTemplates((current) => (checked ? [...current, key] : current.filter((item) => item !== key)))
  }

  return (
    <ToolShell
      title="Gitignore 片段生成器"
      level="L1"
      description="按项目类型组合 .gitignore 片段，并附加自定义忽略规则。"
      notes="- 模板输出只生成文本，不修改仓库文件。\n- 自定义规则会追加到输出底部。"
    >
      <div className="qb-tool-grid">
        <div className="qb-tool-field">
          <span className="qb-tool-label">模板</span>
          <div className="qb-tool-options">
            {Object.entries(gitignoreTemplates).map(([key, template]) => (
              <label className="qb-tool-checkbox" key={key}>
                <input
                  type="checkbox"
                  checked={selectedTemplates.includes(key as GitignoreTemplateKey)}
                  onChange={(event) => toggleTemplate(key as GitignoreTemplateKey, event.target.checked)}
                />
                <span>{template.label}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="qb-tool-field">
          <span className="qb-tool-label">自定义规则</span>
          <textarea className="qb-tool-textarea qb-mono" value={customLines} onChange={(event) => setCustomLines(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">.gitignore 输出</span>
          <CodeBlock code={result.output || '# 未选择模板'} language="gitignore" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const semverPattern = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/

function parseSemver(input: string) {
  const match = input.trim().match(semverPattern)
  if (!match) {
    return null
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? '',
    build: match[5] ?? '',
  }
}

function formatSemver(version: { major: number; minor: number; patch: number; prerelease?: string; build?: string }) {
  const prerelease = version.prerelease ? `-${version.prerelease}` : ''
  const build = version.build ? `+${version.build}` : ''
  return `${version.major}.${version.minor}.${version.patch}${prerelease}${build}`
}

function analyzeSemver(input: string) {
  const parsed = parseSemver(input)
  if (!parsed) {
    return {
      summary: '版本格式无效，示例：1.2.3、v1.2.3-beta.1、1.2.3+build.7',
      output: JSON.stringify({ valid: false }, null, 2),
    }
  }

  const release = { major: parsed.major, minor: parsed.minor, patch: parsed.patch }
  const output = {
    valid: true,
    current: formatSemver(parsed),
    parsed,
    next: {
      major: formatSemver({ major: parsed.major + 1, minor: 0, patch: 0 }),
      minor: formatSemver({ major: parsed.major, minor: parsed.minor + 1, patch: 0 }),
      patch: formatSemver({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 }),
      release: formatSemver(release),
      prereleaseRc: formatSemver({ ...release, prerelease: 'rc.1' }),
    },
  }

  return {
    summary: [
      `当前版本：${output.current}`,
      `下一个 major：${output.next.major}`,
      `下一个 minor：${output.next.minor}`,
      `下一个 patch：${output.next.patch}`,
      `去除预发布/构建信息：${output.next.release}`,
      `下一个 RC：${output.next.prereleaseRc}`,
    ].join('\n'),
    output: JSON.stringify(output, null, 2),
  }
}

export function SemverHelperToolView() {
  const [version, setVersion] = useState('v1.4.2-beta.1+build.7')
  const result = useMemo(() => analyzeSemver(version), [version])

  return (
    <ToolShell
      title="SemVer 版本助手"
      level="L1"
      description="解析语义化版本，并生成常见发布递增结果。"
      notes="- 支持 `v` 前缀、prerelease 和 build metadata。\n- 递增结果按 SemVer 常见发布规则重置低位版本号。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">版本号</span>
          <input className="qb-tool-input qb-mono" value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">发布建议</span>
          <CodeBlock code={result.summary} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">结构化结果</span>
          <CodeBlock code={result.output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
