import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { writeClipboardText } from '../../api/clipboard-api'
import { Detail, Tag } from '../../ui'
import { unixSeconds } from '../../utils/time'

export default function TimestampToolView() {
  const [timestamp, setTimestamp] = useState(String(unixSeconds()))

  const dateText = useMemo(() => {
    const value = Number(timestamp)
    if (!Number.isFinite(value)) {
      return 'Invalid timestamp'
    }

    const milliseconds = timestamp.length <= 10 ? value * 1000 : value
    return new Date(milliseconds).toISOString()
  }, [timestamp])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">Official Tool</div>
          <div className="qb-tool-view__title">Timestamp Tool</div>
          <div className="qb-tool-view__description">
            Convert Unix timestamps and ISO time strings in a compact reference view built for quick developer checks.
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">Builtin</Tag>
          <Tag tone="default">Unix / ISO</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Timestamp</span>
          <input
            className="qb-tool-input qb-mono"
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">ISO Time</span>
          <input className="qb-tool-input qb-mono" readOnly value={dateText} />
        </label>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => setTimestamp(String(unixSeconds()))}
        >
          Current Seconds
        </button>
        <button className="qb-tool-button" type="button" onClick={() => setTimestamp(String(Date.now()))}>
          Current Milliseconds
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(dateText)}>
          Copy ISO Time
        </button>
      </div>

      <Detail
        title="Quick Notes"
        markdown="- 10 digits are treated as Unix seconds.\n- Longer values are treated as milliseconds.\n- Output uses ISO-8601 for consistent debugging and API work."
        metadata={[
          { label: 'Mode', value: 'Timestamp <-> ISO reference' },
          { label: 'Precision', value: 'Seconds and milliseconds' },
          { label: 'Output', value: 'UTC ISO-8601 string' },
        ]}
      />
    </section>
  )
}
