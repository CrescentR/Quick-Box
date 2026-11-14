import { ToolShell } from '../../core/tool/ToolShell'
import { useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock, Markdown } from '../../ui'

export default function MarkdownPreviewToolView() {
  const tr = useT()
  const [input, setInput] = useState(() =>
    tr(
      '# Hello QuickBox\n\n- 支持标题、列表和段落\n- 支持 `inline code`、**加粗** 和 *斜体*',
      '# Hello QuickBox\n\n- Supports headings, lists, and paragraphs\n- Supports `inline code`, **bold**, and *italic*',
    ),
  )

  return (
    <ToolShell
      title={tr('Markdown 实时预览', 'Markdown Live Preview')}
      level="L1"
      description={tr('左侧输入 Markdown，右侧实时预览常用文档结构。', 'Type Markdown on the left and preview formatted document output on the right.')}
      notes={tr(
        '- 使用 QuickBox 内置 Markdown 渲染组件。\n- 当前支持标题、段落、无序列表、有序列表、行内代码、加粗和斜体。',
        '- Uses QuickBox built-in Markdown renderer.\n- Supports headings, paragraphs, ordered/unordered lists, inline code, bold, and italic.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Markdown</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('预览', 'Preview')}</span>
          <div className="qb-tool-preview">
            <Markdown content={input} />
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('源码', 'Source')}</span>
          <CodeBlock code={input || tr('// 等待 Markdown 输入', '// Waiting for Markdown input')} language="md" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
