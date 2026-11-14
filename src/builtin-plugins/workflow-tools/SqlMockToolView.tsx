import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { generateSqlMock } from './sql-mock'

const defaultSchema = `id:id
user_name:name
phone:phone
email:email
amount:decimal
active:bool
created_at:datetime`

export default function SqlMockToolView() {
  const tr = useT()
  const locale = useLocale()
  const [tableName, setTableName] = useState('sys_user')
  const [rowCount, setRowCount] = useState(5)
  const [schema, setSchema] = useState(defaultSchema)
  const output = useMemo(() => generateSqlMock(tableName, schema, rowCount, locale), [locale, rowCount, schema, tableName])

  return (
    <ToolShell
      title={tr('SQL Mock 数据生成器', 'SQL Mock Data Generator')}
      level="L2"
      description={tr(
        '按表名与字段规则批量生成 INSERT INTO 测试数据。',
        'Generate batch INSERT INTO statements from table names and field type definitions.',
      )}
      notes={tr(
        '- 每行一个字段，支持 `字段名:类型` 或 `字段名 SQL类型`。\n- 内置类型：`id`、`uuid`、`name`、`phone`、`email`、`int`、`decimal`、`bool`、`date`、`datetime`、`ip`、`string`。',
        '- One field per line using `field:type` or `field SQL_TYPE`.\n- Built-in types: `id`, `uuid`, `name`, `phone`, `email`, `int`, `decimal`, `bool`, `date`, `datetime`, `ip`, `string`.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('表名', 'Table name')}</span>
          <input className="qb-tool-input qb-mono" value={tableName} onChange={(e) => setTableName(e.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('生成行数 (1–100)', 'Rows (1-100)')}</span>
          <input
            className="qb-tool-input"
            type="number"
            min={1}
            max={100}
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
          />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('字段定义（每行一个，如 user_name:name）', 'Schema fields (one per line, e.g. user_name:name)')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={schema} onChange={(e) => setSchema(e.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('SQL 输出', 'SQL output')}</span>
          <CodeBlock code={output} language="sql" showLineNumbers copyable wrap />
        </div>
      </div>
    </ToolShell>
  )
}
