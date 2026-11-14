import { ToolShell } from '../../core/tool/ToolShell'
import { useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { pickScreenColor } from '../../api/file-tools-api'
import type { ScreenColor } from '../../api/file-tools-api'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { useLauncherStore } from '../../stores/launcher-store'
import { CodeBlock } from '../../ui'

function formatScreenColor(color: ScreenColor | null, locale: ResolvedLocale) {
  if (!color) return lt('// 点击取色后显示结果', '// Click Pick Color to capture pixel', locale)
  return JSON.stringify(
    {
      position: { x: color.x, y: color.y },
      hex: color.hex,
      rgb: color.rgb,
      channels: { r: color.r, g: color.g, b: color.b },
    },
    null,
    2,
  )
}

export default function ScreenColorPickerToolView() {
  const tr = useT()
  const locale = useLocale()
  const [color, setColor] = useState<ScreenColor | null>(null)
  const [message, setMessage] = useState('')
  const openView = useLauncherStore((state) => state.openView)

  const pickColor = async () => {
    try {
      const nextColor = await pickScreenColor()
      setColor(nextColor)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : lt('屏幕取色失败', 'Failed to pick screen color'))
    }
  }

  return (
    <ToolShell
      title={tr('屏幕取色器', 'Screen Color Picker')}
      level="L2"
      description={tr('读取当前鼠标所在屏幕像素颜色，并可带入颜色转换工具。', 'Sample the pixel color under the cursor and send it to the Color Converter.')}
      notes={tr(
        '- Windows 版本通过 Rust 调用系统 API 读取鼠标位置像素。\n- 取色前把鼠标移动到目标颜色上，再点击取色按钮或使用触控板点击。',
        '- On Windows, Rust queries the OS API for the pixel under your mouse pointer.\n- Move your cursor onto the target color before clicking Pick Color.',
      )}
    >
      <div className="qb-tool-grid">
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('颜色预览', 'Preview')}</span>
          <div className="qb-tool-swatch" style={{ background: color?.hex ?? 'transparent' }} />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('结果', 'Result')}</span>
          <CodeBlock code={message || formatScreenColor(color, locale)} language={color ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void pickColor()}>
          {tr('读取鼠标位置颜色', 'Pick Color at Cursor')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(color?.hex ?? '')} disabled={!color}>
          {tr('复制 HEX', 'Copy HEX')}
        </button>
        <button
          className="qb-tool-button"
          type="button"
          onClick={() => color && openView('official.utility-tools.color-converter.view', { hex: color.hex })}
          disabled={!color}
        >
          {tr('打开颜色转换', 'Open Color Converter')}
        </button>
      </div>
    </ToolShell>
  )
}
