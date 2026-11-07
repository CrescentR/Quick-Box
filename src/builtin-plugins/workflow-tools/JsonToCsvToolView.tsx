import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { sampleObjectJson, jsonToCsv } from './json-to-csv'

export default function JsonToCsvToolView() {
  const [input, setInput] = useToolInput(sampleObjectJson)
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
