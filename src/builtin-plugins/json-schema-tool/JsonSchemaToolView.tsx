import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'
import { jsonToSchema } from './json-schema-utils'

const sampleJson = `{
  "id": 1001,
  "name": "QuickBox",
  "active": true,
  "tags": ["launcher", "devtools"],
  "owner": {
    "email": "dev@quickbox.local",
    "roles": ["admin"]
  }
}`

export default function JsonSchemaToolView() {
  const [input, setInput] = useToolInput(sampleJson)
  const [includeRequired, setIncludeRequired] = useState(true)
  const [includeMeta, setIncludeMeta] = useState(true)
  const { copyText, clipboardToast } = useClipboardToast()

  const output = useMemo(() => {
    try {
      return jsonToSchema(input, includeRequired, includeMeta)
    } catch (error) {
      return error instanceof Error ? error.message : '无法从 JSON 生成 Schema'
    }
  }, [includeMeta, includeRequired, input])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">JSON Schema 生成器</div>
          <div className="qb-tool-view__description">
            从示例 JSON 推断类型、对象字段、数组 items 和 required，生成可复制的 JSON Schema。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">Draft 2020-12</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">示例 JSON</span>
          <textarea
            id="json-schema-input"
            name="json-schema-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">生成选项</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input
                type="checkbox"
                checked={includeRequired}
                onChange={(event) => setIncludeRequired(event.target.checked)}
              />
              <span>把现有字段标为 required</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={includeMeta} onChange={(event) => setIncludeMeta(event.target.checked)} />
              <span>包含 $schema</span>
            </label>
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON Schema</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void copyText(output, 'JSON Schema')}>
          复制 Schema
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 根据当前示例值推断 `string` / `integer` / `number` / `boolean` / `object` / `array`。\n- 数组会合并元素 schema；类型不一致时使用 `anyOf`。\n- 只从样例推断，不会自动生成 format、pattern 或文档描述。"
        metadata={[
          { label: '规范', value: 'JSON Schema Draft 2020-12' },
          { label: '输入', value: 'JSON 对象或数组' },
          { label: '输出', value: '可复制 Schema' },
        ]}
      />
      {clipboardToast}
    </section>
  )
}
