import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { jsonToSchema } from './json-schema-utils'
import { ToolShell } from '../../core/tool/ToolShell'

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
  const tr = useT()
  const [input, setInput] = useToolInput(sampleJson)
  const [includeRequired, setIncludeRequired] = useState(true)
  const [includeMeta, setIncludeMeta] = useState(true)
  const { copyText, clipboardToast } = useClipboardToast()

  const output = useMemo(() => {
    try {
      return jsonToSchema(input, includeRequired, includeMeta)
    } catch (error) {
      return error instanceof Error ? error.message : tr('无法从 JSON 生成 Schema', 'Unable to generate Schema from JSON')
    }
  }, [includeMeta, includeRequired, input, tr])

  return (
    <ToolShell
      title={tr('JSON Schema 生成器', 'JSON Schema Generator')}
      description={tr(
        '从示例 JSON 推断类型、对象字段、数组 items 和 required，生成可复制的 JSON Schema。',
        'Infer field types, nested properties, array items, and required keys from sample JSON.',
      )}
      badge="Draft 2020-12"
    >

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('示例 JSON', 'Sample JSON')}</span>
          <textarea
            id="json-schema-input"
            name="json-schema-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('生成选项', 'Options')}</span>
          <div className="qb-tool-options">
            <label className="qb-tool-checkbox">
              <input
                type="checkbox"
                checked={includeRequired}
                onChange={(event) => setIncludeRequired(event.target.checked)}
              />
              <span>{tr('把现有字段标为 required', 'Mark existing properties as required')}</span>
            </label>
            <label className="qb-tool-checkbox">
              <input type="checkbox" checked={includeMeta} onChange={(event) => setIncludeMeta(event.target.checked)} />
              <span>{tr('包含 $schema', 'Include $schema')}</span>
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
          {tr('复制 Schema', 'Copy Schema')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          '- 根据当前示例值推断 `string` / `integer` / `number` / `boolean` / `object` / `array`。\n- 数组会合并元素 schema；类型不一致时使用 `anyOf`。\n- 只从样例推断，不会自动生成 format、pattern 或文档描述。',
          '- Infers `string`, `integer`, `number`, `boolean`, `object`, and `array`.\n- Merges heterogeneous array elements using `anyOf`.\n- Infers structural schema only without guessing `format` or `pattern`.',
        )}
        metadata={[
          { label: tr('规范', 'Draft'), value: 'JSON Schema Draft 2020-12' },
          { label: tr('输入', 'Input'), value: tr('JSON 对象或数组', 'JSON Object or Array') },
          { label: tr('输出', 'Output'), value: tr('可复制 Schema', 'Copyable Schema') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
