import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export interface SqlMockColumn {
  name: string
  type: string
}

const SAMPLE_NAMES = ['张伟', '李娜', '王芳', '陈明', '刘洋', '赵敏', '周杰', '吴倩']
const SAMPLE_EN_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona', 'George', 'Hannah']

export function parseMockColumns(schemaText: string): SqlMockColumn[] {
  return schemaText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('--') && !line.startsWith('#'))
    .map((line) => {
      const cleaned = line.replace(/[,;]+$/, '').trim()
      if (cleaned.includes(':')) {
        const [name, type] = cleaned.split(':', 2)
        return { name: name.trim(), type: (type || 'string').trim().toLowerCase() }
      }
      const parts = cleaned.split(/\s+/)
      return {
        name: parts[0].replace(/[`"[\]]/g, ''),
        type: (parts[1] || 'string').toLowerCase(),
      }
    })
    .filter((col) => /^[A-Za-z_][\w]*$/.test(col.name))
}

function formatSqlValue(type: string, rowIndex: number, locale: ResolvedLocale): string {
  const n = rowIndex + 1
  if (type === 'id' || type.includes('serial')) return String(n)
  if (type === 'uuid') {
    const hex = n.toString(16).padStart(12, '0')
    return `'00000000-0000-4000-8000-${hex}'`
  }
  if (type === 'name' || type === 'username') {
    const pool = locale === 'en-US' ? SAMPLE_EN_NAMES : SAMPLE_NAMES
    return `'${pool[rowIndex % pool.length]}'`
  }
  if (type === 'phone' || type === 'mobile') {
    return `'1380013${String(8000 + (n % 1000)).padStart(4, '0')}'`
  }
  if (type === 'email') {
    return `'user${n}@example.com'`
  }
  if (type === 'bool' || type === 'boolean') {
    return n % 2 === 1 ? 'TRUE' : 'FALSE'
  }
  if (type === 'int' || type === 'integer' || type === 'bigint' || type === 'status') {
    return String((n % 5) + 1)
  }
  if (type === 'decimal' || type === 'amount' || type === 'price' || type === 'float' || type === 'double') {
    return (n * 19.8).toFixed(2)
  }
  if (type === 'date') {
    const day = String(((n - 1) % 28) + 1).padStart(2, '0')
    return `'2026-10-${day}'`
  }
  if (type === 'datetime' || type === 'timestamp') {
    const day = String(((n - 1) % 28) + 1).padStart(2, '0')
    const hour = String((n - 1) % 24).padStart(2, '0')
    return `'2026-10-${day} ${hour}:00:00'`
  }
  if (type === 'ip') {
    return `'192.168.1.${(n % 254) + 1}'`
  }
  return `'sample_${n}'`
}

export function generateSqlMock(
  tableName: string,
  schemaText: string,
  rowCount: number,
  locale: ResolvedLocale = getCurrentLocale(),
): string {
  const safeTable = tableName.trim()
  if (!/^[A-Za-z_][\w.]*$/.test(safeTable)) {
    return lt('-- 请输入合法的表名（字母、数字、下划线）', '-- Enter a valid table name (letters, digits, underscores)', locale)
  }
  const columns = parseMockColumns(schemaText)
  if (!columns.length) {
    return lt('-- 请至少定义一个有效字段（格式：字段名:类型）', '-- Define at least one valid field (e.g. field:type)', locale)
  }
  const count = Math.min(Math.max(Math.trunc(rowCount) || 1, 1), 100)
  const colNames = columns.map((col) => col.name).join(', ')
  const rows = Array.from({ length: count }, (_, idx) => {
    const values = columns.map((col) => formatSqlValue(col.type, idx, locale)).join(', ')
    return `  (${values})`
  })
  return `INSERT INTO ${safeTable} (${colNames})\nVALUES\n${rows.join(',\n')};`
}
