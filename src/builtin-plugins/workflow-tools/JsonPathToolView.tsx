import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { evaluateJsonPath } from './json-path'

export default function JsonPathToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('{"users":[{"name":"Ada","role":"admin"},{"name":"Lin","role":"dev"}],"total":2}')
  const [path, setPath] = useState('$.users[*].name')
  const output = useMemo(() => evaluateJsonPath(input, path, locale), [input, locale, path])

  return (
    <ToolShell
      title={tr('JSONPath 测试器', 'JSONPath Tester')}
      level="L3"
      description={tr(
        '用路径表达式提取 JSON 中的字段，支持点路径、数组下标和通配符。',
        'Extract JSON values using JSONPath expressions with dot notation, array indices, and wildcards.',
      )}
      notes={tr(
        '- 支持示例：`$.users[0].name`、`$.users[*].role`、`$["data"].items[*]`。\n- 当前版本聚焦本地快速测试，不覆盖递归下降和过滤表达式。',
        '- Supported examples: `$.users[0].name`, `$.users[*].role`, `$["data"].items[*]`.\n- Focuses on fast local evaluation without recursive descent or filter predicates.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('JSON 输入', 'JSON input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSONPath</span>
          <input className="qb-tool-input qb-mono" value={path} onChange={(event) => setPath(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('匹配结果', 'Matches')}</span>
          <CodeBlock code={output} language="json" showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
