import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { useLocale, useT } from '../../i18n'
import { uniqueLines } from './shared'

export default function TextDeduplicateToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useToolInput('json\nxml\nJSON\ncsv\nxml\nrust')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [sortLines, setSortLines] = useState(true)
  const result = useMemo(
    () => uniqueLines(input, caseSensitive, sortLines, locale),
    [caseSensitive, input, locale, sortLines],
  )

  return (
    <ToolShell
      title={tr('文本去重与排序', 'Text Deduplicate & Sort')}
      level="L2"
      description={tr('按行处理列表，适合整理 ID、域名、邮箱、关键词和临时数据。', 'Process lists line by line—great for organizing IDs, domains, emails, keywords, and scratch data.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('输入列表', 'Input List')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('处理选项', 'Options')}</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
              <span>{tr('区分大小写', 'Case Sensitive')}</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={sortLines} onChange={(event) => setSortLines(event.target.checked)} />
              <span>{tr('按字母排序', 'Sort Alphabetically')}</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('输出', 'Output')}</span>
          <CodeBlock resultType="text" code={result.output || tr('// 无有效行', '// No valid lines')} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('统计', 'Stats')}</span>
          <CodeBlock code={result.report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
