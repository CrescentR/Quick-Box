import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import type { PluginViewProps } from '../../core/plugin/plugin-types'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'

function getStringParam(params: PluginViewProps['params'], key: string, fallback: string) {
  const value = params?.[key]
  return typeof value === 'string' ? value : fallback
}

function parseHex(hex: string) {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null
  const full = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l: Math.round(lightness * 100) }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4
  return { h: Math.round(hue * 60 + (hue < 0 ? 360 : 0)), s: Math.round(saturation * 100), l: Math.round(lightness * 100) }
}

export default function ColorConverterToolView({ params }: PluginViewProps) {
  const tr = useT()
  const [hex, setHex] = useState(() => getStringParam(params, 'hex', '#3b82f6'))
  const color = useMemo(() => parseHex(hex), [hex])
  const output = useMemo(() => {
    if (!color) return tr('HEX 颜色无效', 'Invalid HEX color')
    const hsl = rgbToHsl(color.r, color.g, color.b)
    return JSON.stringify(
      {
        hex: `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`,
        rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
        hsl: `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`,
      },
      null,
      2,
    )
  }, [color, tr])

  return (
    <ToolShell
      title={tr('HEX / RGB / HSL 颜色转换', 'HEX / RGB / HSL Color Converter')}
      level="L1"
      description={tr('把 HEX 颜色转换为可直接用于 CSS 的 RGB 与 HSL 格式。', 'Convert HEX colors into CSS-ready RGB and HSL formats.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">HEX</span>
          <input className="qb-tool-input qb-mono" value={hex} onChange={(event) => setHex(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('预览', 'Preview')}</span>
          <div className="qb-tool-swatch" style={{ background: color ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'transparent' }} />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('格式', 'Formats')}</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
