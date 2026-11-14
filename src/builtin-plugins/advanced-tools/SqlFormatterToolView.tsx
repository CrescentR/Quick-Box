import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { formatSql, minifySql } from './sql-formatter'

export default function SqlFormatterToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState('select id,name,created_at from users where status = "active" order by created_at desc limit 20')
  const formatted = useMemo(() => formatSql(input, locale), [input, locale])
  const minified = useMemo(() => minifySql(input), [input])

  return (
    <ToolShell
      title={tr('SQL 格式化', 'SQL Formatter')}
      level="L2"
      description={tr(
        '对常见 SQL 关键字换行、缩进字段列表，并提供压缩结果。',
        'Format SQL with keyword line breaks, indented column lists, and a minified variant.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('SQL 输入', 'SQL input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('格式化结果', 'Formatted SQL')}</span>
          <CodeBlock code={formatted} language="sql" showLineNumbers copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('压缩结果', 'Minified SQL')}</span>
          <CodeBlock code={minified || tr('-- 等待 SQL 输入', '-- Waiting for SQL input')} language="sql" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
