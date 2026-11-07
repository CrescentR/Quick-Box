import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { toJsonStringLiteral, fromJsonStringLiteral } from './json-string'

export default function JsonStringToolView() {
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
