import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { csvToJson } from './csv-to-json'

export default function CsvToJsonToolView() {
  const tr = useT()
  const [input, setInput] = useToolInput('id,name,enabled\n1,QuickBox,true\n2,Toolkit,false')
  const [delimiter, setDelimiter] = useState(',')
  const [firstRowHeader, setFirstRowHeader] = useState(true)
  const output = useMemo(() => csvToJson(input, delimiter, firstRowHeader), [delimiter, firstRowHeader, input])

  return (
    <ToolShell
      title={tr('CSV 转 JSON', 'CSV to JSON')}
      level="L2"
      description={tr(
        '解析带引号的 CSV 文本，并输出对象数组或二维数组。',
        'Parse quoted CSV text into an array of objects or 2D arrays.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('CSV 输入', 'CSV input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <label className="qb-tool-field">
            <span className="qb-tool-label">{tr('分隔符', 'Delimiter')}</span>
            <select className="qb-tool-input" value={delimiter} onChange={(event) => setDelimiter(event.target.value)}>
              <option value=",">{tr('逗号 ,', 'Comma ,')}</option>
              <option value=";">{tr('分号 ;', 'Semicolon ;')}</option>
              <option value={'\t'}>Tab</option>
            </select>
          </label>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={firstRowHeader} onChange={(event) => setFirstRowHeader(event.target.checked)} />
            <span>{tr('第一行作为字段名', 'Use first row as header')}</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('JSON 输出', 'JSON output')}</span>
          <CodeBlock resultType="json" code={output} language="json" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
