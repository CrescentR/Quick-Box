import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { replaceWithRegex } from './regex-replace'

export default function RegexReplaceToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('user_id=1001\nuser_id=1002\norder_id=9001')
  const [pattern, setPattern] = useState('(user)_id')
  const [flags, setFlags] = useState('g')
  const [replacement, setReplacement] = useState('$1Id')
  const result = useMemo(() => replaceWithRegex(input, pattern, flags, replacement, locale), [flags, input, locale, pattern, replacement])

  return (
    <ToolShell
      title={tr('正则替换器', 'Regex Replacer')}
      level="L2"
      description={tr(
        '输入正则、flags 和替换模板，立即查看批量替换结果。',
        'Provide a pattern, flags, and replacement template to transform text in bulk.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('原始文本', 'Source text')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('匹配正则', 'Pattern')}</span>
          <input className="qb-tool-input qb-mono" value={pattern} onChange={(event) => setPattern(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">Flags</span>
          <input className="qb-tool-input qb-mono" value={flags} onChange={(event) => setFlags(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('替换为', 'Replacement')}</span>
          <input className="qb-tool-input qb-mono" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('替换结果', 'Replaced output')}</span>
          <CodeBlock code={result.output} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('报告', 'Report')}</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
