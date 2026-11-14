import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { sampleObjectJson, jsonToCsv } from './json-to-csv'

export default function JsonToCsvToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useToolInput(sampleObjectJson)
  const [flatten, setFlatten] = useState(true)
  const output = useMemo(() => jsonToCsv(input, flatten, locale), [flatten, input, locale])

  return (
    <ToolShell
      title={tr('JSON 转 CSV', 'JSON to CSV')}
      level="L2"
      description={tr(
        '把 JSON 对象数组转成 CSV，嵌套对象可展开为点路径字段。',
        'Convert an array of JSON objects into CSV with optional flattening for nested keys.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('JSON 输入', 'JSON input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('选项', 'Options')}</span>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={flatten} onChange={(event) => setFlatten(event.target.checked)} />
            <span>{tr('展开嵌套对象', 'Flatten nested objects')}</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('CSV 输出', 'CSV output')}</span>
          <CodeBlock code={output} language="csv" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
