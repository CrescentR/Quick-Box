import { useState } from 'react'
import { createUuid } from '../../utils/id'

export default function UuidToolView() {
  const [uuid, setUuid] = useState(createUuid())

  return (
    <section className="tool-view">
      <h2>UUID 工具</h2>
      <label className="tool-field">
        UUID v4
        <input readOnly value={uuid} />
      </label>
      <div className="tool-actions">
        <button type="button" onClick={() => setUuid(createUuid())}>
          重新生成
        </button>
      </div>
    </section>
  )
}
