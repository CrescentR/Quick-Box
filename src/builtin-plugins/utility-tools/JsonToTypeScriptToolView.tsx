import { ToolShell } from '../../core/tool/ToolShell'
import { useToolInput } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import type { JsonValue } from './utility-shared'

const sampleJson = `{
  "id": 1001,
  "name": "QuickBox",
  "tags": ["桌面", "工具"],
  "active": true
}`

function inferType(value: JsonValue, name: string, depth = 0): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    const inner = value.length ? inferType(value[0], name, depth + 1) : 'unknown'
    return `${inner}[]`
  }
  if (typeof value !== 'object') return typeof value

  const indent = '  '.repeat(depth + 1)
  const closeIndent = '  '.repeat(depth)
  const fields = Object.entries(value)
    .map(([key, child]) => `${indent}${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${inferType(child, key, depth + 1)}`)
    .join('\n')
  return `{\n${fields}\n${closeIndent}}`
}

function jsonToTypeScript(input: string, typeName: string) {
  try {
    const parsed = JSON.parse(input) as JsonValue
    const safeName = /^[A-Za-z_$][\w$]*$/.test(typeName) ? typeName : 'GeneratedType'
    const inferred = inferType(parsed, safeName)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? `export interface ${safeName} ${inferred}`
      : `export type ${safeName} = ${inferred}`
  } catch (error) {
    return error instanceof Error ? error.message : 'JSON 无效'
  }
}

export default function JsonToTypeScriptToolView() {
  const [input, setInput] = useToolInput(sampleJson)
  const [typeName, setTypeName] = useState('QuickBoxItem')
  const output = useMemo(() => jsonToTypeScript(input, typeName), [input, typeName])

  return (
    <ToolShell title="JSON 转 TypeScript 类型" level="L2" description="根据示例 JSON 对象或数组推断 TypeScript 类型定义。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">类型名称</span>
          <input className="qb-tool-input qb-mono" value={typeName} onChange={(event) => setTypeName(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">TypeScript</span>
          <CodeBlock code={output} language="ts" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
