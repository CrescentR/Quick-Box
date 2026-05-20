import { useMemo, useState } from 'react'

export default function JsonToolView() {
  const [input, setInput] = useState('{\n  "name": "QuickBox"\n}')

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input), null, 2)
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid JSON'
    }
  }, [input])

  const minified = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input))
    } catch {
      return ''
    }
  }, [input])

  return (
    <section className="tool-view">
      <h2>JSON 工具</h2>
      <div className="tool-grid">
        <label className="tool-field">
          输入
          <textarea value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="tool-field">
          格式化
          <textarea readOnly value={formatted} />
        </label>
      </div>
      <label className="tool-field">
        压缩
        <input readOnly value={minified} />
      </label>
    </section>
  )
}
