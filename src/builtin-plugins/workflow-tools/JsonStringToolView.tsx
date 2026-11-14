import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { toJsonStringLiteral, fromJsonStringLiteral } from './json-string'

export default function JsonStringToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('QuickBox "Toolkit"\nCopy straight into JSON fields')
  const escaped = useMemo(() => toJsonStringLiteral(input), [input])
  const unescaped = useMemo(() => fromJsonStringLiteral(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('JSON 字符串转义', 'JSON String Escape / Unescape')}
      level="L1"
      description={tr(
        '把普通文本转成 JSON 字符串字面量，也可以反向还原已转义内容。',
        'Escape plain text into a valid JSON string literal or unescape a JSON string back to text.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('转义为 JSON 字符串', 'Escaped JSON string')}</span>
          <CodeBlock code={escaped} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('从 JSON 字符串还原', 'Unescaped text')}</span>
          <CodeBlock code={unescaped} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
