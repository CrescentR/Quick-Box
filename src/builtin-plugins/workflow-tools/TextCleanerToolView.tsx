import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { useT } from '../../i18n'
import { cleanText } from './text-cleaner'

export default function TextCleanerToolView() {
  const tr = useT()
  const [input, setInput] = useToolInput('  QuickBox    工具箱  \n\n  清理复制文本\t\t很方便  ')
  const [trimLines, setTrimLines] = useState(true)
  const [collapseSpaces, setCollapseSpaces] = useState(true)
  const [removeBlankLines, setRemoveBlankLines] = useState(true)
  const output = useMemo(
    () => cleanText(input, trimLines, collapseSpaces, removeBlankLines),
    [collapseSpaces, input, removeBlankLines, trimLines],
  )

  return (
    <ToolShell
      title={tr('换行与空格清洗', 'Whitespace & Line Cleaner')}
      level="L1"
      description={tr('清理从网页、文档或日志里复制来的文本，保留可控的换行结构。', 'Clean copied text from web pages, docs, or logs while keeping controlled line structure.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('原始文本', 'Raw Text')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('清洗选项', 'Cleaning Options')}</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={trimLines} onChange={(event) => setTrimLines(event.target.checked)} />
              <span>{tr('裁剪每行首尾空格', 'Trim Leading & Trailing Spaces')}</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={collapseSpaces} onChange={(event) => setCollapseSpaces(event.target.checked)} />
              <span>{tr('合并连续空格', 'Collapse Consecutive Spaces')}</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={removeBlankLines} onChange={(event) => setRemoveBlankLines(event.target.checked)} />
              <span>{tr('移除空行', 'Remove Blank Lines')}</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('清洗结果', 'Cleaned Result')}</span>
          <CodeBlock resultType="text" code={output || tr('// 清洗后为空', '// Empty after cleaning')} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
