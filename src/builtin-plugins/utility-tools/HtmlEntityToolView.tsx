import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'

const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function encodeHtmlEntities(value: string) {
  return value.replace(/[&<>"']/g, (char) => entityMap[char])
}

function decodeHtmlEntities(value: string) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export default function HtmlEntityToolView() {
  const tr = useT()
  const [input, setInput] = useState('<button title="QuickBox">复制并运行</button>')
  const encoded = useMemo(() => encodeHtmlEntities(input), [input])
  const decoded = useMemo(() => decodeHtmlEntities(input), [input])

  return (
    <ToolShell
      title={tr('HTML Entity 编码转换', 'HTML Entity Encoder / Decoder')}
      level="L1"
      description={tr('把 HTML 特殊字符转换为实体编码，也可以把实体编码还原为普通文本。', 'Encode special HTML characters into entities or decode HTML entities back to plain text.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('编码结果', 'Encoded')}</span>
          <CodeBlock code={encoded} language="html" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('解码结果', 'Decoded')}</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
