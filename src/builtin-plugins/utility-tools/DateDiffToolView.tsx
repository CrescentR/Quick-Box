import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { CodeBlock } from '../../ui'

function dateDiff(start: string, end: string, locale: ResolvedLocale) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return lt('日期输入无效', 'Invalid date input', locale)
  }

  const ms = endDate.getTime() - startDate.getTime()
  const abs = Math.abs(ms)
  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const seconds = Math.floor((abs % 60_000) / 1000)

  return JSON.stringify(
    locale === 'en-US'
      ? {
          direction: ms >= 0 ? 'forward' : 'backward',
          milliseconds: ms,
          absolute: { days, hours, minutes, seconds },
        }
      : {
          方向: ms >= 0 ? '向后' : '向前',
          毫秒差: ms,
          绝对差值: { 天: days, 小时: hours, 分钟: minutes, 秒: seconds },
        },
    null,
    2,
  )
}

export default function DateDiffToolView() {
  const tr = useT()
  const locale = useLocale()
  const [start, setStart] = useState('2026-05-23T09:00')
  const [end, setEnd] = useState('2026-06-01T18:30')
  const result = useMemo(() => dateDiff(start, end, locale), [end, locale, start])

  return (
    <ToolShell
      title={tr('日期差值计算器', 'Date Difference Calculator')}
      level="L1"
      description={tr('计算两个日期时间之间的精确差值，适合排期、SLA 和记录场景。', 'Calculate the exact difference between two datetimes for scheduling, SLAs, and logs.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('开始时间', 'Start Time')}</span>
          <input className="qb-tool-input" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('结束时间', 'End Time')}</span>
          <input className="qb-tool-input" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('计算结果', 'Result')}</span>
          <CodeBlock code={result} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
