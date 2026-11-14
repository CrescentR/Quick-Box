import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { useToolInput } from '../../core/tool/tool-context'
import { jsonToRust } from './json-to-rust'

export default function JsonToRustToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useToolInput('{"id":1001,"userName":"QuickBox","profile":{"enabled":true,"score":98.5}}')
  const [rootName, setRootName] = useState('QuickBoxUser')
  const output = useMemo(() => jsonToRust(input, rootName, locale), [input, locale, rootName])

  return (
    <ToolShell
      title={tr('JSON 转 Rust Struct', 'JSON to Rust Struct')}
      level="L2"
      description={tr(
        '从示例 JSON 推断 Rust struct 字段，并自动添加 serde rename。',
        'Infer Rust structs from sample JSON and generate serde rename attributes automatically.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('根结构体名', 'Root struct name')}</span>
          <input className="qb-tool-input qb-mono" value={rootName} onChange={(event) => setRootName(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('JSON 输入', 'JSON input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('Rust 输出', 'Rust output')}</span>
          <CodeBlock code={output} language="rust" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
