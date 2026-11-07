import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { cleanText } from './text-cleaner'

export default function TextCleanerToolView() {
  const [input, setInput] = useToolInput('  QuickBox    工具箱  \n\n  清理复制文本\t\t很方便  ')
  const [trimLines, setTrimLines] = useState(true)
  const [collapseSpaces, setCollapseSpaces] = useState(true)
  const [removeBlankLines, setRemoveBlankLines] = useState(true)
  const output = useMemo(
    () => cleanText(input, trimLines, collapseSpaces, removeBlankLines),
    [collapseSpaces, input, removeBlankLines, trimLines],
  )

  return (
    <ToolShell title="换行与空格清洗" level="L1" description="清理从网页、文档或日志里复制来的文本，保留可控的换行结构。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">原始文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">清洗选项</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={trimLines} onChange={(event) => setTrimLines(event.target.checked)} />
              <span>裁剪每行首尾空格</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={collapseSpaces} onChange={(event) => setCollapseSpaces(event.target.checked)} />
              <span>合并连续空格</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={removeBlankLines} onChange={(event) => setRemoveBlankLines(event.target.checked)} />
              <span>移除空行</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">清洗结果</span>
          <CodeBlock resultType="text" code={output || '// 清洗后为空'} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
