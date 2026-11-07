import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { formatSql, minifySql } from './sql-formatter'

export default function SqlFormatterToolView() {
  const [input, setInput] = useState('select id,name,created_at from users where status = "active" order by created_at desc limit 20')
  const formatted = useMemo(() => formatSql(input), [input])
  const minified = useMemo(() => minifySql(input), [input])

  return (
    <ToolShell title="SQL 格式化" level="L2" description="对常见 SQL 关键字换行、缩进字段列表，并提供压缩结果。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">SQL 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={formatted} language="sql" showLineNumbers copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">压缩结果</span>
          <CodeBlock code={minified || '-- 等待 SQL 输入'} language="sql" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
