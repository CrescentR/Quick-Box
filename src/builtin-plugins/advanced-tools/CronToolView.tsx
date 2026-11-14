import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { analyzeCron } from './cron'

export default function CronToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('*/15 9-18 * * 1-5')
  const report = useMemo(() => analyzeCron(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('Cron 表达式解析器', 'Cron Expression Parser')}
      level="L2"
      description={tr(
        '把 5 段 Cron 表达式拆成可读说明，便于排查定时任务配置。',
        'Break a 5-field cron expression into readable parts to inspect schedule configs.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('Cron 表达式', 'Cron expression')}</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('解析结果', 'Breakdown')}</span>
          <CodeBlock code={report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
