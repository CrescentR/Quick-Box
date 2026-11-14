import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { formatYaml } from './yaml'

export default function YamlToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('name: QuickBox\nfeatures:\n  - launcher\n  - toolbox\nversion: 0.1.0')
  const result = useMemo(() => formatYaml(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('YAML 格式化与校验', 'YAML Formatter & Linter')}
      level="L2"
      description={tr(
        '整理 YAML 缩进和键值间距，并提示常见结构问题。',
        'Normalize YAML indentation and key-value spacing while flagging structural issues.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('YAML 输入', 'YAML input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('格式化结果', 'Formatted YAML')}</span>
          <CodeBlock code={result.formatted} language="yaml" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('校验报告', 'Validation report')}</span>
          <CodeBlock code={result.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
