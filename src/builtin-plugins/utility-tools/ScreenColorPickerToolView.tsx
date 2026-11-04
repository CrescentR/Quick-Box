import { ToolShell } from './ToolShell'
import { useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { pickScreenColor } from '../../api/file-tools-api'
import type { ScreenColor } from '../../api/file-tools-api'
import { useLauncherStore } from '../../stores/launcher-store'
import { CodeBlock } from '../../ui'

function formatScreenColor(color: ScreenColor | null) {
  if (!color) return '// 点击取色后显示结果'
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
  const [color, setColor] = useState<ScreenColor | null>(null)
  const [message, setMessage] = useState('')
  const openView = useLauncherStore((state) => state.openView)

  const pickColor = async () => {
    try {
      const nextColor = await pickScreenColor()
      setColor(nextColor)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '屏幕取色失败')
    }
  }

  return (
    <ToolShell
      title="屏幕取色器"
      level="L2"
      description="读取当前鼠标所在屏幕像素颜色，并可带入颜色转换工具。"
      notes="- Windows 版本通过 Rust 调用系统 API 读取鼠标位置像素。\n- 取色前把鼠标移动到目标颜色上，再点击取色按钮或使用触控板点击。"
    >
      <div className="qb-tool-grid">
        <div className="qb-tool-field">
          <span className="qb-tool-label">颜色预览</span>
          <div className="qb-tool-swatch" style={{ background: color?.hex ?? 'transparent' }} />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">结果</span>
          <CodeBlock code={message || formatScreenColor(color)} language={color ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void pickColor()}>
          读取鼠标位置颜色
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(color?.hex ?? '')} disabled={!color}>
          复制 HEX
        </button>
        <button
          className="qb-tool-button"
          type="button"
          onClick={() => color && openView('official.utility-tools.color-converter.view', { hex: color.hex })}
          disabled={!color}
        >
          打开颜色转换
        </button>
      </div>
    </ToolShell>
  )
}
