import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { CodeBlock } from '../../ui'

function formatDurationFromSeconds(totalSeconds: number, locale: ResolvedLocale) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return lt('请输入非负秒数', 'Please enter a non-negative number of seconds', locale)
  }
  const seconds = Math.floor(totalSeconds)
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const restSeconds = seconds % 60
  const parts =
    locale === 'en-US'
      ? [
          days ? `${days}d` : '',
          hours ? `${hours}h` : '',
          minutes ? `${minutes}m` : '',
          restSeconds || seconds === 0 ? `${restSeconds}s` : '',
        ].filter(Boolean)
      : [
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
    seconds: 1,
    分钟: 60,
    分: 60,
    m: 60,
    min: 60,
    minute: 60,
    minutes: 60,
    小时: 3_600,
    时: 3_600,
    h: 3_600,
    hour: 3_600,
    hours: 3_600,
    天: 86_400,
    日: 86_400,
    d: 86_400,
    day: 86_400,
    days: 86_400,
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

function analyzeRedisTtl(input: string, locale: ResolvedLocale) {
  const seconds = parseTtlText(input)
  if (seconds === null) {
    return JSON.stringify(
      {
        valid: false,
        message: lt(
          '请输入秒数，或输入 7天、1小时30分钟 这类时长',
          'Enter seconds or a duration such as 7d or 1h 30m',
          locale,
        ),
      },
      null,
      2,
    )
  }

  return JSON.stringify(
    {
      valid: true,
      seconds,
      readable: formatDurationFromSeconds(seconds, locale),
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
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState(() => tr('7天', '7d'))
  const output = useMemo(() => analyzeRedisTtl(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('Redis Key TTL 计算器', 'Redis Key TTL Calculator')}
      level="L1"
      description={tr('在秒数和可读时长之间转换，并输出 Redis EX/PX 参数。', 'Convert between seconds and human-readable durations and output Redis EX/PX options.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('秒数或时长', 'Seconds or Duration')}</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('结果', 'Result')}</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
