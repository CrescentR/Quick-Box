import { ToolShell } from './ToolShell'
import { useMemo, useState } from 'react'
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
  const [input, setInput] = useState('<button title="QuickBox">复制并运行</button>')
  const encoded = useMemo(() => encodeHtmlEntities(input), [input])
  const decoded = useMemo(() => decodeHtmlEntities(input), [input])

  return (
    <ToolShell title="HTML Entity 编码转换" level="L1" description="把 HTML 特殊字符转换为实体编码，也可以把实体编码还原为普通文本。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">编码结果</span>
          <CodeBlock code={encoded} language="html" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">解码结果</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
