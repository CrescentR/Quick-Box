import { ToolShell } from '../../core/tool/ToolShell'
import { useState } from 'react'
import { CodeBlock, Markdown } from '../../ui'

export default function MarkdownPreviewToolView() {
  const [input, setInput] = useState('# Hello QuickBox\n\n- 支持标题、列表和段落\n- 支持 `inline code`、**加粗** 和 *斜体*')

  return (
    <ToolShell
      title="Markdown 实时预览"
      level="L1"
      description="左侧输入 Markdown，右侧实时预览常用文档结构。"
      notes="- 使用 QuickBox 内置 Markdown 渲染组件。\n- 当前支持标题、段落、无序列表、有序列表、行内代码、加粗和斜体。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Markdown</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">预览</span>
          <div className="qb-tool-preview">
            <Markdown content={input} />
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">源码</span>
          <CodeBlock code={input || '// 等待 Markdown 输入'} language="md" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
