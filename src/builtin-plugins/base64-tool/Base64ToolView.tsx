import { useMemo, useState } from 'react'
import { Binary, ClipboardCopy } from 'lucide-react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Icon, Tag } from '../../ui'

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
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">Official Tool</div>
          <div className="qb-tool-view__title">Base64 Tool</div>
          <div className="qb-tool-view__description">
            Encode and decode text with a compact developer-first view that keeps both representations visible at once.
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">Builtin</Tag>
          <Tag tone="default">Encode / Decode</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Input</span>
          <textarea
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">Encoded</span>
          <CodeBlock code={encoded || '// Unable to encode'} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Decoded</span>
          <CodeBlock code={decoded || '// Unable to decode current input'} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(encoded)}
        >
          Copy Encoded
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(decoded)}>
          Copy Decoded
        </button>
      </div>

      <Detail
        title="Quick Notes"
        markdown="- Works best with UTF-8 text content.\n- Decoding panel stays empty when the current input is not valid Base64.\n- Useful for quick payload inspection inside the launcher."
        metadata={[
          { label: 'Mode', value: 'Base64 encode / decode' },
          { label: 'Input', value: 'UTF-8 text' },
          { label: 'Clipboard', value: 'Supported' },
        ]}
      />
    </section>
  )
}
