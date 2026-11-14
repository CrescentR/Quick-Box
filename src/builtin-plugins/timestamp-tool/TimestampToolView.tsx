import { useToolOption } from '../../core/tool/use-tool-option'
import { useToolInput } from '../../core/tool/tool-context'
import { useMemo } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { Detail } from '../../ui'
import { unixSeconds } from '../../utils/time'
import { ToolShell } from '../../core/tool/ToolShell'

export default function TimestampToolView() {
  const tr = useT()
  const [timestamp, setTimestamp] = useToolInput(String(unixSeconds()))
  const { copyText, clipboardToast } = useClipboardToast()

  const [unit, setUnit] = useToolOption<string>('timestamp.unit', 'auto')
  const dateText = useMemo(() => {
    const value = Number(timestamp)
    if (!timestamp.trim() || !Number.isFinite(value)) {
      return tr('时间戳无效', 'Invalid timestamp')
    }

    const milliseconds = (unit === 'seconds' || (unit !== 'milliseconds' && timestamp.length <= 10)) ? value * 1000 : value
    const date = new Date(milliseconds)
    return Number.isNaN(date.getTime()) ? tr('时间戳超出有效范围', 'Timestamp out of range') : date.toISOString()
  }, [timestamp, tr, unit])

  return (
    <ToolShell
      title={tr('时间戳转换', 'Timestamp Converter')}
      description={tr(
        '在 Unix 时间戳和 ISO 时间之间快速转换，适合调试接口、日志和事件时间。',
        'Convert between Unix timestamps and ISO-8601 time strings for debugging APIs, logs, and events.',
      )}
      badge="Unix / ISO"
    >
      <label className="qb-tool-field">
        {tr('时间戳单位', 'Timestamp unit')}
        <select className="qb-tool-input" value={unit} onChange={(event) => setUnit(event.target.value)}>
          <option value="auto">{tr('自动', 'Auto')}</option>
          <option value="seconds">{tr('秒', 'Seconds')}</option>
          <option value="milliseconds">{tr('毫秒', 'Milliseconds')}</option>
        </select>
      </label>
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('时间戳', 'Timestamp')}</span>
          <input
            id="timestamp-tool-input"
            name="timestamp-tool-input"
            className="qb-tool-input qb-mono"
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('ISO 时间', 'ISO time')}</span>
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
          {tr('当前秒级时间戳', 'Now (seconds)')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => setTimestamp(String(Date.now()))}>
          {tr('当前毫秒时间戳', 'Now (milliseconds)')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(dateText, 'ISO timestamp')}>
          {tr('复制 ISO 时间', 'Copy ISO time')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          '- 10 位数字会按 Unix 秒级时间戳处理。\n- 更长的数字会按毫秒时间戳处理。\n- 输出使用 ISO-8601，方便调试和 API 对齐。',
          '- 10-digit numbers are treated as Unix timestamps in seconds.\n- Longer numbers are treated as milliseconds.\n- Outputs UTC ISO-8601 strings for API debugging and alignment.',
        )}
        metadata={[
          { label: tr('模式', 'Mode'), value: tr('时间戳 <-> ISO 对照', 'Timestamp <-> ISO') },
          { label: tr('精度', 'Precision'), value: tr('秒级和毫秒级', 'Seconds & milliseconds') },
          { label: tr('输出', 'Output'), value: tr('UTC ISO-8601 字符串', 'UTC ISO-8601 string') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
