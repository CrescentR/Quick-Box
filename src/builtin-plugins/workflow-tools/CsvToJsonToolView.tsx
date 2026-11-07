import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { csvToJson } from './csv-to-json'

export default function CsvToJsonToolView() {
  const [input, setInput] = useToolInput('id,name,enabled\n1,QuickBox,true\n2,Toolkit,false')
  const [delimiter, setDelimiter] = useState(',')
  const [firstRowHeader, setFirstRowHeader] = useState(true)
  const output = useMemo(() => csvToJson(input, delimiter, firstRowHeader), [delimiter, firstRowHeader, input])

  return (
    <ToolShell title="CSV 转 JSON" level="L2" description="解析带引号的 CSV 文本，并输出对象数组或二维数组。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">CSV 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <label className="qb-tool-field">
            <span className="qb-tool-label">分隔符</span>
            <select className="qb-tool-input" value={delimiter} onChange={(event) => setDelimiter(event.target.value)}>
              <option value=",">逗号 ,</option>
              <option value=";">分号 ;</option>
              <option value={'\t'}>Tab</option>
            </select>
          </label>
          <label className="qb-tool-checkbox">
            <input type="checkbox" checked={firstRowHeader} onChange={(event) => setFirstRowHeader(event.target.checked)} />
            <span>第一行作为字段名</span>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON 输出</span>
          <CodeBlock resultType="json" code={output} language="json" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
