import { Fingerprint } from 'lucide-react'
import { useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Tag } from '../../ui'
import { createUuid } from '../../utils/id'

export default function UuidToolView() {
  const [uuid, setUuid] = useState(createUuid())

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">Official Tool</div>
          <div className="qb-tool-view__title">UUID Tool</div>
          <div className="qb-tool-view__description">
            Generate fresh UUID v4 values instantly, then copy them without leaving the launcher flow.
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">Builtin</Tag>
          <Tag tone="default">UUID v4</Tag>
        </div>
      </header>

      <CodeBlock code={uuid} language="uuid" copyable />

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => setUuid(createUuid())}>
          Generate Again
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(uuid)}>
          Copy UUID
        </button>
      </div>

      <Detail
        title="Quick Notes"
        markdown="- Uses the browser crypto API under the current desktop webview.\n- Generates RFC 4122 style random UUID v4 values.\n- Best used for ids, mocks, and local test payloads."
        metadata={[
          { label: 'Mode', value: 'Single UUID generator' },
          { label: 'Version', value: 'v4 random' },
          { label: 'Clipboard', value: 'Supported' },
        ]}
      />
    </section>
  )
}
