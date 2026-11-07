import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { jsonToRust } from './json-to-rust'

export default function JsonToRustToolView() {
  const [input, setInput] = useState('{"id":1001,"userName":"QuickBox","profile":{"enabled":true,"score":98.5}}')
  const [rootName, setRootName] = useState('QuickBoxUser')
  const output = useMemo(() => jsonToRust(input, rootName), [input, rootName])

  return (
    <ToolShell title="JSON 转 Rust Struct" level="L2" description="从示例 JSON 推断 Rust struct 字段，并自动添加 serde rename。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">根结构体名</span>
          <input className="qb-tool-input qb-mono" value={rootName} onChange={(event) => setRootName(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Rust 输出</span>
          <CodeBlock code={output} language="rust" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
