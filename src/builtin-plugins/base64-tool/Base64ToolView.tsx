import { useMemo, useState } from 'react'

function encodeBase64(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
}

function decodeBase64(value: string) {
  return decodeURIComponent(escape(atob(value)))
}

export default function Base64ToolView() {
  const [input, setInput] = useState('QuickBox')

  const encoded = useMemo(() => {
    try {
      return encodeBase64(input)
    } catch {
      return ''
    }
  }, [input])

  const decoded = useMemo(() => {
    try {
      return decodeBase64(input)
    } catch {
      return ''
    }
  }, [input])

  return (
    <section className="tool-view">
      <h2>Base64 工具</h2>
      <div className="tool-grid">
        <label className="tool-field">
          输入
          <textarea value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="tool-field">
          编码结果
          <textarea readOnly value={encoded} />
        </label>
      </div>
      <label className="tool-field">
        解码结果
        <textarea readOnly value={decoded} />
      </label>
    </section>
  )
}
