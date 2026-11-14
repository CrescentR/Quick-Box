import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { CodeBlock } from '../../ui'

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

function formatInTimeZone(date: Date, timeZone: string, locale: ResolvedLocale) {
  return new Intl.DateTimeFormat(locale, {
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

function convertTimeZones(input: string, locale: ResolvedLocale) {
  const date = parseTimeInput(input)
  if (!date) {
    return JSON.stringify(
      {
        valid: false,
        message: lt('请输入 ISO 时间或 Unix 时间戳', 'Enter an ISO timestamp or Unix epoch', locale),
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
      zones: Object.fromEntries(timeZones.map((timeZone) => [timeZone, formatInTimeZone(date, timeZone, locale)])),
    },
    null,
    2,
  )
}

export default function TimezoneConverterToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('2026-06-11T09:00:00Z')
  const output = useMemo(() => convertTimeZones(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('时区转换器', 'Time Zone Converter')}
      level="L1"
      description={tr('把同一个时间点转换到常用时区，适合跨地区排期、日志和接口调试。', 'Convert a timestamp across common time zones for scheduling, logs, and API debugging.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('ISO 时间或 Unix 时间戳', 'ISO Time or Unix Timestamp')}</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('转换结果', 'Converted Zones')}</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
