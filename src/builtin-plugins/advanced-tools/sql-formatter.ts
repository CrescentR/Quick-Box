import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export const sqlKeywords = [
  'select',
  'from',
  'where',
  'inner join',
  'left join',
  'right join',
  'group by',
  'order by',
  'having',
  'limit',
  'values',
  'set',
]

export function formatSql(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  let output = input.replace(/\s+/g, ' ').trim()
  sqlKeywords.forEach((keyword) => {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi')
    output = output.replace(pattern, `\n${keyword.toUpperCase()}`)
  })
  output = output.replace(/,\s*/g, ',\n  ').replace(/^\n/, '')
  return output || lt('-- 等待 SQL 输入', '-- Waiting for SQL input', locale)
}

export function minifySql(input: string) {
  return input.replace(/--.*$/gm, '').replace(/\s+/g, ' ').trim()
}
