import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { analyzeCron } from './cron'

export default function CronToolView() {
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
