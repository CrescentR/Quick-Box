import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'
import { safeJsonParse } from './shared'
import type { JsonObject } from './shared'

export const sampleObjectJson = `[
  { "id": 1, "name": "QuickBox", "enabled": true },
  { "id": 2, "name": "Toolkit", "enabled": false }
]`

export function flattenRecord(record: JsonObject, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(flattenRecord(value as JsonObject, path))
      }
      return [[path, typeof value === 'string' ? value : JSON.stringify(value)]]
    }),
  )
}

export function csvEscape(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function jsonToCsv(input: string, flatten: boolean, locale: ResolvedLocale = getCurrentLocale()) {
  const parsed = safeJsonParse(input, locale)
  if (!parsed.ok) return parsed.message
  const rows = Array.isArray(parsed.value) ? parsed.value : [parsed.value]
  const objects = rows.filter((row): row is JsonObject => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
  if (!objects.length) return lt('JSON 需要是对象或对象数组', 'JSON must be an object or array of objects', locale)

  const normalized = flatten ? objects.map((row) => flattenRecord(row)) : objects.map((row) => flattenRecord(row, ''))
  const headers = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))))
  return [
    headers.map(csvEscape).join(','),
    ...normalized.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ].join('\n')
}
