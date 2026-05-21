import { useMemo, useState } from 'react'
import { Braces, ClipboardCopy } from 'lucide-react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Icon, Tag } from '../../ui'

export default function JsonToolView() {
  const [input, setInput] = useState('{\n  "name": "QuickBox",\n  "mode": "design-system"\n}')

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
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">Official Tool</div>
          <div className="qb-tool-view__title">JSON Tool</div>
          <div className="qb-tool-view__description">
            Format, validate, and minify JSON with a focused split-view layout that matches the QuickBox launcher shell.
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">Builtin</Tag>
          <Tag tone="default">Formatter</Tag>
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
          <span className="qb-tool-label">Formatted Output</span>
          <CodeBlock code={formatted} language="json" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Minified Output</span>
          <CodeBlock code={minified || '// Invalid JSON'} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(formatted)}
        >
          Copy Formatted
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(minified)}>
          Copy Minified
        </button>
      </div>

      <Detail
        title="Quick Notes"
        markdown="- Accepts any valid JSON object or array.\n- Invalid input keeps the error visible in the formatted panel.\n- Output blocks stay monospace for developer workflows."
        metadata={[
          { label: 'Mode', value: 'Formatter / Validator / Minifier' },
          { label: 'Icon', value: 'Braces' },
          { label: 'Action', value: 'Copy to clipboard supported' },
        ]}
      />
    </section>
  )
}
