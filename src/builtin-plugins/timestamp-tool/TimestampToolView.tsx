import { useToolOption } from '../../core/tool/use-tool-option'
import { useToolInput } from '../../core/tool/tool-context'
import { useMemo } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { Detail } from '../../ui'
import { unixSeconds } from '../../utils/time'
import { ToolShell } from '../../core/tool/ToolShell'

export default function TimestampToolView() {
  const [timestamp, setTimestamp] = useToolInput(String(unixSeconds()))
  const { copyText, clipboardToast } = useClipboardToast()

  const [unit, setUnit] = useToolOption<string>('timestamp.unit', 'auto')
  const dateText = useMemo(() => {
    const value = Number(timestamp)
    if (!timestamp.trim() || !Number.isFinite(value)) {
      return '时间戳无效'
    }

    const milliseconds = (unit === 'seconds' || (unit !== 'milliseconds' && timestamp.length <= 10)) ? value * 1000 : value
    const date = new Date(milliseconds)
    return Number.isNaN(date.getTime()) ? '时间戳超出有效范围' : date.toISOString()
  }, [timestamp, unit])

  return (
    <ToolShell title="时间戳转换" description="在 Unix 时间戳和 ISO 时间之间快速转换，适合调试接口、日志和事件时间。" badge="Unix / ISO">

      <label className="qb-tool-field">时间戳单位<select className="qb-tool-input" value={unit} onChange={(event) => setUnit(event.target.value)}><option value="auto">自动</option><option value="seconds">秒</option><option value="milliseconds">毫秒</option></select></label>
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">时间戳</span>
          <input
            id="timestamp-tool-input"
            name="timestamp-tool-input"
            className="qb-tool-input qb-mono"
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">ISO 时间</span>
          <input
            id="timestamp-tool-iso-output"
            name="timestamp-tool-iso-output"
            className="qb-tool-input qb-mono"
            readOnly
            value={dateText}
          />
        </label>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => setTimestamp(String(unixSeconds()))}
        >
          当前秒级时间戳
        </button>
        <button className="qb-tool-button" type="button" onClick={() => setTimestamp(String(Date.now()))}>
          当前毫秒时间戳
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(dateText, 'ISO timestamp')}>
          复制 ISO 时间
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 10 位数字会按 Unix 秒级时间戳处理。\n- 更长的数字会按毫秒时间戳处理。\n- 输出使用 ISO-8601，方便调试和 API 对齐。"
        metadata={[
          { label: '模式', value: '时间戳 <-> ISO 对照' },
          { label: '精度', value: '秒级和毫秒级' },
          { label: '输出', value: 'UTC ISO-8601 字符串' },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
