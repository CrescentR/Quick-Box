import { useEffect, useMemo, useState } from 'react'
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

type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512'

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
          <Tag tone={level === 'L4' ? 'warning' : level === 'L2' ? 'success' : 'default'}>{level}</Tag>
        </div>
      </header>
      {children}
      {notes ? <Detail title="说明" markdown={notes} /> : null}
    </section>
  )
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function compactLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line.trim() || lines[index - 1]?.trim())
    .join('\n')
}

function formatYaml(input: string) {
  const errors: string[] = []
  const lines = input.replace(/\t/g, '  ').split('\n')
  const formatted = lines
    .map((line, index) => {
      const raw = line.trim()
      if (!raw || raw.startsWith('#')) return raw
      const indent = line.match(/^\s*/)?.[0].length ?? 0
      if (indent % 2 !== 0) errors.push(`第 ${index + 1} 行缩进不是 2 的倍数`)
      if (!raw.startsWith('- ') && !raw.includes(':')) errors.push(`第 ${index + 1} 行缺少冒号`)
      return `${' '.repeat(Math.floor(indent / 2) * 2)}${raw.replace(/\s*:\s*/, ': ')}`
    })
    .join('\n')

  return {
    formatted: compactLines(formatted),
    report: errors.length ? errors.join('\n') : '未发现明显 YAML 结构问题',
  }
}

export function YamlToolView() {
  const [input, setInput] = useState('name: QuickBox\nfeatures:\n  - 启动器\n  - 工具箱\nversion: 0.1.0')
  const result = useMemo(() => formatYaml(input), [input])

  return (
    <ToolShell title="YAML 格式化与校验" level="L2" description="整理 YAML 缩进和键值间距，并提示常见结构问题。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">YAML 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={result.formatted} language="yaml" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">校验报告</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function formatXmlNode(node: Node, depth = 0): string {
  const indent = '  '.repeat(depth)
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim()
    return text ? `${indent}${text}` : ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as Element
  const attrs = Array.from(element.attributes)
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(' ')
  const open = attrs ? `<${element.tagName} ${attrs}>` : `<${element.tagName}>`
  const children = Array.from(element.childNodes).map((child) => formatXmlNode(child, depth + 1)).filter(Boolean)
  if (!children.length) return `${indent}${open}</${element.tagName}>`
  return `${indent}${open}\n${children.join('\n')}\n${indent}</${element.tagName}>`
}

function formatXml(input: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(input, 'application/xml')
  const parserError = document.querySelector('parsererror')
  if (parserError) {
    return {
      formatted: parserError.textContent || 'XML 无效',
      report: '解析失败，请检查标签闭合、属性引号和根节点。',
    }
  }

  return {
    formatted: formatXmlNode(document.documentElement),
    report: `根节点：${document.documentElement.tagName}\n子节点数：${document.documentElement.childElementCount}`,
  }
}

export function XmlToolView() {
  const [input, setInput] = useState('<tool id="quickbox"><name>工具箱</name><enabled>true</enabled></tool>')
  const result = useMemo(() => formatXml(input), [input])

  return (
    <ToolShell title="XML 格式化与校验" level="L2" description="解析 XML 文本，输出缩进后的结构和基础校验信息。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">XML 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={result.formatted} language="xml" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解析报告</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

const sqlKeywords = [
  'select',
  'from',
  'where',
  'inner join',
  'left join',
  'right join',
  'group by',
  'order by',
  'having',
  'limit',
  'values',
  'set',
]

function formatSql(input: string) {
  let output = input.replace(/\s+/g, ' ').trim()
  sqlKeywords.forEach((keyword) => {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi')
    output = output.replace(pattern, `\n${keyword.toUpperCase()}`)
  })
  output = output.replace(/,\s*/g, ',\n  ').replace(/^\n/, '')
  return output || '-- 等待 SQL 输入'
}

function minifySql(input: string) {
  return input.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim()
}

export function SqlFormatterToolView() {
  const [input, setInput] = useState('select id,name,created_at from users where status = "active" order by created_at desc limit 20')
  const formatted = useMemo(() => formatSql(input), [input])
  const minified = useMemo(() => minifySql(input), [input])

  return (
    <ToolShell title="SQL 格式化" level="L2" description="对常见 SQL 关键字换行、缩进字段列表，并提供压缩结果。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">SQL 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={formatted} language="sql" showLineNumbers copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">压缩结果</span>
          <CodeBlock code={minified || '-- 等待 SQL 输入'} language="sql" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

async function createHmac(message: string, secret: string, algorithm: HmacAlgorithm) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: algorithm }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return toHex(signature)
}

export function HmacToolView() {
  const [message, setMessage] = useState('method=POST&path=/api/tools&ts=1716400000')
  const [secret, setSecret] = useState('quickbox-secret')
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('SHA-256')
  const [digest, setDigest] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    createHmac(message, secret, algorithm)
      .then((value) => {
        if (!cancelled) {
          setDigest(value)
          setError('')
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setDigest('')
          setError(nextError instanceof Error ? nextError.message : '无法生成 HMAC')
        }
      })
    return () => {
      cancelled = true
    }
  }, [algorithm, message, secret])

  return (
    <ToolShell title="HMAC 生成器" level="L2" description="使用 Web Crypto 在本地生成接口签名调试常用的 HMAC 摘要。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">签名内容</span>
          <textarea className="qb-tool-textarea qb-mono" value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <label className="qb-tool-field">
            <span className="qb-tool-label">密钥</span>
            <input className="qb-tool-input qb-mono" value={secret} onChange={(event) => setSecret(event.target.value)} />
          </label>
          <label className="qb-tool-field">
            <span className="qb-tool-label">算法</span>
            <select className="qb-tool-input" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HmacAlgorithm)}>
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-384">SHA-384</option>
              <option value="SHA-512">SHA-512</option>
            </select>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">签名结果</span>
          <CodeBlock code={error || digest || '// 等待输入'} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function describeCronField(value: string, unit: string) {
  if (value === '*') return `每个${unit}`
  if (value.startsWith('*/')) return `每 ${value.slice(2)} 个${unit}`
  if (value.includes(',')) return `${unit}为 ${value.split(',').join('、')}`
  if (value.includes('-')) return `${unit}范围 ${value.replace('-', ' 到 ')}`
  return `${unit}为 ${value}`
}

function analyzeCron(input: string) {
  const fields = input.trim().split(/\s+/)
  if (fields.length !== 5) return 'Cron 表达式需要 5 段：分钟 小时 日期 月份 星期'
  const [minute, hour, day, month, weekday] = fields
  return [
    `分钟：${describeCronField(minute, '分钟')}`,
    `小时：${describeCronField(hour, '小时')}`,
    `日期：${describeCronField(day, '日')}`,
    `月份：${describeCronField(month, '月')}`,
    `星期：${describeCronField(weekday, '星期')}`,
  ].join('\n')
}

export function CronToolView() {
  const [input, setInput] = useState('*/15 9-18 * * 1-5')
  const report = useMemo(() => analyzeCron(input), [input])

  return (
    <ToolShell title="Cron 表达式解析器" level="L2" description="把 5 段 Cron 表达式拆成可读说明，便于排查定时任务配置。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Cron 表达式</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解析结果</span>
          <CodeBlock code={report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function scorePassword(password: string) {
  const checks = [
    { label: '长度不少于 12 位', passed: password.length >= 12 },
    { label: '包含小写字母', passed: /[a-z]/.test(password) },
    { label: '包含大写字母', passed: /[A-Z]/.test(password) },
    { label: '包含数字', passed: /\d/.test(password) },
    { label: '包含符号', passed: /[^a-zA-Z0-9]/.test(password) },
    { label: '没有明显连续重复', passed: !/(.)\1{2,}/.test(password) },
  ]
  const score = checks.filter((check) => check.passed).length
  const level = score >= 5 ? '强' : score >= 3 ? '中' : '弱'
  return JSON.stringify({ 强度: level, 分数: `${score}/${checks.length}`, 检查项: checks }, null, 2)
}

export function PasswordStrengthToolView() {
  const [password, setPassword] = useState('QuickBox@2026')
  const report = useMemo(() => scorePassword(password), [password])

  return (
    <ToolShell title="密码强度检测" level="L2" description="从长度、字符类型和重复模式快速评估密码强度。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">密码</span>
          <input className="qb-tool-input qb-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">检测结果</span>
          <CodeBlock code={report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function maskSensitive(input: string) {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (value) => value.replace(/^(.{2}).*(@.*)$/, '$1***$2'))
    .replace(/\b1[3-9]\d{9}\b/g, (value) => `${value.slice(0, 3)}****${value.slice(-4)}`)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, (value) => `${value.replace(/\D/g, '').slice(0, 4)} **** **** ${value.replace(/\D/g, '').slice(-4)}`)
    .replace(/\b(?:token|secret|password|passwd|api_key)\s*[:=]\s*["']?[^"'\s]+/gi, (value) => value.replace(/[:=]\s*["']?.+$/, '= ***'))
}

export function SensitiveMaskToolView() {
  const [input, setInput] = useState('email=dev@quickbox.local\nphone=13812345678\napi_key=qbox_123456789')
  const output = useMemo(() => maskSensitive(input), [input])

  return (
    <ToolShell title="敏感信息脱敏" level="L2" description="识别邮箱、手机号、银行卡号和常见密钥字段，并生成脱敏文本。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">原始文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">脱敏结果</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function buildClamp(minSize: number, maxSize: number, minViewport: number, maxViewport: number) {
  if (minViewport === maxViewport) return '视口宽度不能相同'
  const slope = (maxSize - minSize) / (maxViewport - minViewport)
  const vw = slope * 100
  const intercept = minSize - slope * minViewport
  return `clamp(${minSize}px, ${intercept.toFixed(4)}px + ${vw.toFixed(4)}vw, ${maxSize}px)`
}

export function CssClampToolView() {
  const [minSize, setMinSize] = useState(16)
  const [maxSize, setMaxSize] = useState(28)
  const [minViewport, setMinViewport] = useState(375)
  const [maxViewport, setMaxViewport] = useState(1440)
  const output = useMemo(() => buildClamp(minSize, maxSize, minViewport, maxViewport), [maxSize, maxViewport, minSize, minViewport])

  return (
    <ToolShell title="CSS Clamp 计算器" level="L2" description="根据最小/最大字号和视口宽度生成响应式 clamp 表达式。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">最小值 px</span>
          <input className="qb-tool-input" type="number" value={minSize} onChange={(event) => setMinSize(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">最大值 px</span>
          <input className="qb-tool-input" type="number" value={maxSize} onChange={(event) => setMaxSize(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">最小视口 px</span>
          <input className="qb-tool-input" type="number" value={minViewport} onChange={(event) => setMinViewport(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">最大视口 px</span>
          <input className="qb-tool-input" type="number" value={maxViewport} onChange={(event) => setMaxViewport(Number(event.target.value))} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">CSS 输出</span>
          <CodeBlock code={`font-size: ${output};`} language="css" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function visualizeAst(input: string) {
  const tokens = input.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|=>|===|!==|==|!=|<=|>=|[{}()[\].,;:+\-*/=<>]/g) ?? []
  const lines = ['程序']
  let depth = 1
  tokens.forEach((token, index) => {
    if (['}', ')', ']'].includes(token)) depth = Math.max(1, depth - 1)
    const type = /^[A-Za-z_$]/.test(token) ? '标识符' : /^\d/.test(token) ? '数字' : '符号'
    lines.push(`${'  '.repeat(depth)}${index + 1}. ${type}: ${token}`)
    if (['{', '(', '['].includes(token)) depth += 1
  })
  return lines.join('\n')
}

export function AstVisualizerToolView() {
  const [input, setInput] = useState('const total = items.reduce((sum, item) => sum + item.price, 0)')
  const tree = useMemo(() => visualizeAst(input), [input])

  return (
    <ToolShell
      title="AST 可视化工具"
      level="L4"
      description="把代码片段拆成 token 树形视图，用来快速观察标识符、数字和符号层级。"
      notes="- 当前实现偏轻量，适合代码结构观察和教学演示。\n- 后续可替换为完整 JavaScript/TypeScript 解析器，输出真正 AST。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">代码片段</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">结构视图</span>
          <CodeBlock code={tree} language="txt" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}

function previewRename(files: string, pattern: string, replacement: string, start: number) {
  let regex: RegExp | null = null
  try {
    regex = pattern ? new RegExp(pattern, 'g') : null
  } catch (error) {
    return {
      rows: [],
      report: error instanceof Error ? `正则无效：${error.message}` : '正则无效',
    }
  }
  const rows = files
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .map((file, index) => {
      const dot = file.lastIndexOf('.')
      const base = dot > 0 ? file.slice(0, dot) : file
      const ext = dot > 0 ? file.slice(dot) : ''
      const sequence = String(start + index).padStart(3, '0')
      const replaced = regex ? base.replace(regex, replacement) : base
      return { 原文件: file, 新文件: `${replaced}-${sequence}${ext}` }
    })
  const names = rows.map((row) => row.新文件)
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
  return {
    rows,
    report: duplicates.length ? `存在重复目标文件：${Array.from(new Set(duplicates)).join('、')}` : `预演通过，共 ${rows.length} 个文件`,
  }
}

export function BatchRenameToolView() {
  const [files, setFiles] = useState('IMG_1001.png\nIMG_1002.png\nIMG_1003.png')
  const [pattern, setPattern] = useState('IMG')
  const [replacement, setReplacement] = useState('quickbox')
  const [start, setStart] = useState(1)
  const result = useMemo(() => previewRename(files, pattern, replacement, start), [files, pattern, replacement, start])
  const output = JSON.stringify(result.rows, null, 2)

  return (
    <ToolShell
      title="文件批量重命名预演"
      level="L4"
      description="按正则替换和序号规则预览批量重命名结果，并检测重复目标文件。"
      notes="- 该版本先做安全预演，不直接改动本地文件。\n- 后续接入 Tauri 文件系统权限后，可以把预演规则升级为真实批量重命名。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">文件列表</span>
          <textarea className="qb-tool-textarea qb-mono" value={files} onChange={(event) => setFiles(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <label className="qb-tool-field">
            <span className="qb-tool-label">匹配正则</span>
            <input className="qb-tool-input qb-mono" value={pattern} onChange={(event) => setPattern(event.target.value)} />
          </label>
          <label className="qb-tool-field">
            <span className="qb-tool-label">替换为</span>
            <input className="qb-tool-input qb-mono" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
          </label>
          <label className="qb-tool-field">
            <span className="qb-tool-label">起始序号</span>
            <input className="qb-tool-input" type="number" value={start} onChange={(event) => setStart(Number(event.target.value))} />
          </label>
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">预演结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">检查报告</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)}>
          复制预演结果
        </button>
      </div>
    </ToolShell>
  )
}
