import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { replaceWithRegex } from './regex-replace'

export default function RegexReplaceToolView() {
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
