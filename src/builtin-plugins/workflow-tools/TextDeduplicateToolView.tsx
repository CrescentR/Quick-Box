import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { uniqueLines } from './shared'

export default function TextDeduplicateToolView() {
  const [input, setInput] = useToolInput('json\nxml\nJSON\ncsv\nxml\nrust')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [sortLines, setSortLines] = useState(true)
  const result = useMemo(() => uniqueLines(input, caseSensitive, sortLines), [caseSensitive, input, sortLines])

  return (
    <ToolShell title="文本去重与排序" level="L2" description="按行处理列表，适合整理 ID、域名、邮箱、关键词和临时数据。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入列表</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">处理选项</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
              <span>区分大小写</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={sortLines} onChange={(event) => setSortLines(event.target.checked)} />
              <span>按字母排序</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">输出</span>
          <CodeBlock resultType="text" code={result.output || '// 无有效行'} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
