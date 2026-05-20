import { useMemo, useState } from 'react'
import { unixSeconds } from '../../utils/time'

export default function TimestampToolView() {
  const [timestamp, setTimestamp] = useState(String(unixSeconds()))

  const dateText = useMemo(() => {
    const value = Number(timestamp)
    if (!Number.isFinite(value)) return 'Invalid timestamp'
    const milliseconds = timestamp.length <= 10 ? value * 1000 : value
    return new Date(milliseconds).toISOString()
  }, [timestamp])

  return (
    <section className="tool-view">
      <h2>时间戳工具</h2>
      <div className="tool-grid">
        <label className="tool-field">
          时间戳
          <input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} />
        </label>
        <label className="tool-field">
          ISO 时间
          <input readOnly value={dateText} />
        </label>
      </div>
      <div className="tool-actions">
        <button type="button" onClick={() => setTimestamp(String(unixSeconds()))}>
          当前秒级时间戳
        </button>
        <button type="button" onClick={() => setTimestamp(String(Date.now()))}>
          当前毫秒时间戳
        </button>
      </div>
    </section>
  )
}
