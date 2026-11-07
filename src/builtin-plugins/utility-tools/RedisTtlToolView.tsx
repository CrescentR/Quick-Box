import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'

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

export default function RedisTtlToolView() {
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
