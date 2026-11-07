import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { evaluateJsonPath } from './json-path'

export default function JsonPathToolView() {
  const [input, setInput] = useState('{"users":[{"name":"Ada","role":"admin"},{"name":"Lin","role":"dev"}],"total":2}')
  const [path, setPath] = useState('$.users[*].name')
  const output = useMemo(() => evaluateJsonPath(input, path), [input, path])

  return (
    <ToolShell
      title="JSONPath 测试器"
      level="L3"
      description="用路径表达式提取 JSON 中的字段，支持点路径、数组下标和通配符。"
      notes={'- 支持示例：`$.users[0].name`、`$.users[*].role`、`$["data"].items[*]`。\n- 当前版本聚焦本地快速测试，不覆盖递归下降和过滤表达式。'}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSONPath</span>
          <input className="qb-tool-input qb-mono" value={path} onChange={(event) => setPath(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">匹配结果</span>
          <CodeBlock code={output} language="json" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
