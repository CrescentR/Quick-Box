import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { buildClamp } from './css-clamp'

export default function CssClampToolView() {
  const tr = useT()
  const locale = useLocale()
  const [minSize, setMinSize] = useState(16)
  const [maxSize, setMaxSize] = useState(28)
  const [minViewport, setMinViewport] = useState(375)
  const [maxViewport, setMaxViewport] = useState(1440)
  const output = useMemo(() => buildClamp(minSize, maxSize, minViewport, maxViewport, locale), [locale, maxSize, maxViewport, minSize, minViewport])

  return (
    <ToolShell
      title={tr('CSS Clamp 计算器', 'CSS Clamp Calculator')}
      level="L2"
      description={tr(
        '根据最小/最大字号和视口宽度生成响应式 clamp 表达式。',
        'Generate responsive CSS clamp() values from min/max font sizes and viewport widths.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('最小值 px', 'Min size (px)')}</span>
          <input className="qb-tool-input" type="number" value={minSize} onChange={(event) => setMinSize(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('最大值 px', 'Max size (px)')}</span>
          <input className="qb-tool-input" type="number" value={maxSize} onChange={(event) => setMaxSize(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('最小视口 px', 'Min viewport (px)')}</span>
          <input className="qb-tool-input" type="number" value={minViewport} onChange={(event) => setMinViewport(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('最大视口 px', 'Max viewport (px)')}</span>
          <input className="qb-tool-input" type="number" value={maxViewport} onChange={(event) => setMaxViewport(Number(event.target.value))} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('CSS 输出', 'CSS output')}</span>
          <CodeBlock code={`font-size: ${output};`} language="css" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
