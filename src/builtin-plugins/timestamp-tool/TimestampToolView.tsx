import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { Detail, Tag } from '../../ui'
import { unixSeconds } from '../../utils/time'

export default function TimestampToolView() {
  const [timestamp, setTimestamp] = useState(String(unixSeconds()))
  const { copyText, clipboardToast } = useClipboardToast()

  const dateText = useMemo(() => {
    const value = Number(timestamp)
    if (!Number.isFinite(value)) {
      return '时间戳无效'
    }

    const milliseconds = timestamp.length <= 10 ? value * 1000 : value
    return new Date(milliseconds).toISOString()
  }, [timestamp])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">时间戳转换</div>
          <div className="qb-tool-view__description">
            在 Unix 时间戳和 ISO 时间之间快速转换，适合调试接口、日志和事件时间。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">Unix / ISO</Tag>
        </div>
      </header>

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
    </section>
  )
}
