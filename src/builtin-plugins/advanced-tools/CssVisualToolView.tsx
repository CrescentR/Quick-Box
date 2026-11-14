import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { buildBoxShadowCss, buildLinearGradientCss } from './css-visual'

export default function CssVisualToolView() {
  const tr = useT()
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(12)
  const [blur, setBlur] = useState(28)
  const [spread, setSpread] = useState(-4)
  const [shadowColor, setShadowColor] = useState('#000000')
  const [alpha, setAlpha] = useState(35)
  const [inset, setInset] = useState(false)
  const [angle, setAngle] = useState(135)
  const [startColor, setStartColor] = useState('#f0b43c')
  const [endColor, setEndColor] = useState('#3b82f6')

  const boxShadow = useMemo(
    () => buildBoxShadowCss({ offsetX, offsetY, blur, spread, color: shadowColor, alpha, inset }),
    [alpha, blur, inset, offsetX, offsetY, shadowColor, spread],
  )
  const gradient = useMemo(
    () => buildLinearGradientCss({ angle, startColor, endColor }),
    [angle, endColor, startColor],
  )
  const cssCode = `box-shadow: ${boxShadow};\nbackground: ${gradient};`

  return (
    <ToolShell
      title={tr('CSS 阴影与渐变生成器', 'CSS Shadow & Gradient Studio')}
      level="L2"
      description={tr(
        '可视化调节 box-shadow 与 linear-gradient 参数，实时预览并复制 CSS 代码。',
        'Adjust box-shadow and linear-gradient parameters visually with live preview and copyable CSS.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('水平偏移 X (px)', 'Offset X (px)')}</span>
          <input className="qb-tool-input" type="number" min={-80} max={80} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('垂直偏移 Y (px)', 'Offset Y (px)')}</span>
          <input className="qb-tool-input" type="number" min={-80} max={80} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('模糊半径 Blur (px)', 'Blur radius (px)')}</span>
          <input className="qb-tool-input" type="number" min={0} max={120} value={blur} onChange={(e) => setBlur(Number(e.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('扩散半径 Spread (px)', 'Spread radius (px)')}</span>
          <input className="qb-tool-input" type="number" min={-40} max={80} value={spread} onChange={(e) => setSpread(Number(e.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('阴影颜色 HEX', 'Shadow color (HEX)')}</span>
          <input className="qb-tool-input qb-mono" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('阴影不透明度 (%)', 'Shadow opacity (%)')}</span>
          <input className="qb-tool-input" type="number" min={0} max={100} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} />
        </label>
        <label className="qb-tool-checkbox qb-tool-field--full">
          <input type="checkbox" checked={inset} onChange={(e) => setInset(e.target.checked)} />
          <span>{tr('内阴影 (inset)', 'Inset shadow')}</span>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('渐变角度 (deg)', 'Gradient angle (deg)')}</span>
          <input className="qb-tool-input" type="number" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('起始颜色', 'Start color')}</span>
          <input className="qb-tool-input qb-mono" value={startColor} onChange={(e) => setStartColor(e.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('结束颜色', 'End color')}</span>
          <input className="qb-tool-input qb-mono" value={endColor} onChange={(e) => setEndColor(e.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('实时预览', 'Live preview')}</span>
          <div
            role="region"
            aria-label={tr('CSS 实时预览', 'CSS live preview')}
            style={{
              height: '96px',
              borderRadius: 'var(--qb-radius-panel)',
              background: gradient,
              boxShadow,
              display: 'grid',
              placeItems: 'center',
              color: '#ffffff',
              fontWeight: 600,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
            }}
          >
            QuickBox CSS Preview
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('CSS 代码', 'CSS code')}</span>
          <CodeBlock code={cssCode} language="css" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
