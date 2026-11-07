import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { buildClamp } from './css-clamp'

export default function CssClampToolView() {
  const [minSize, setMinSize] = useState(16)
  const [maxSize, setMaxSize] = useState(28)
  const [minViewport, setMinViewport] = useState(375)
  const [maxViewport, setMaxViewport] = useState(1440)
  const output = useMemo(() => buildClamp(minSize, maxSize, minViewport, maxViewport), [maxSize, maxViewport, minSize, minViewport])

  return (
    <ToolShell title="CSS Clamp 计算器" level="L2" description="根据最小/最大字号和视口宽度生成响应式 clamp 表达式。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">最小值 px</span>
          <input className="qb-tool-input" type="number" value={minSize} onChange={(event) => setMinSize(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">最大值 px</span>
          <input className="qb-tool-input" type="number" value={maxSize} onChange={(event) => setMaxSize(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">最小视口 px</span>
          <input className="qb-tool-input" type="number" value={minViewport} onChange={(event) => setMinViewport(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">最大视口 px</span>
          <input className="qb-tool-input" type="number" value={maxViewport} onChange={(event) => setMaxViewport(Number(event.target.value))} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">CSS 输出</span>
          <CodeBlock code={`font-size: ${output};`} language="css" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
