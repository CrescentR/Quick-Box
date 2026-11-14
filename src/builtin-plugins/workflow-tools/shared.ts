import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export function safeJsonParse(
  input: string,
  locale: ResolvedLocale = getCurrentLocale(),
): { ok: true; value: JsonValue } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(input) as JsonValue }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : lt('JSON 无效', 'Invalid JSON', locale) }
  }
}

export function uniqueLines(
  input: string,
  caseSensitive: boolean,
  sortLines: boolean,
  locale: ResolvedLocale = getCurrentLocale(),
) {
  const seen = new Set<string>()
  const duplicated: string[] = []
  const unique = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = caseSensitive ? line : line.toLowerCase()
      if (seen.has(key)) {
        duplicated.push(line)
        return false
      }
      seen.add(key)
      return true
    })

  const output = sortLines ? [...unique].sort((a, b) => a.localeCompare(b, locale)) : unique
  const rawCount = input.split('\n').filter((line) => line.trim()).length
  const reportObj =
    locale === 'en-US'
      ? { originalLines: rawCount, uniqueLines: output.length, duplicateLines: duplicated.length }
      : { 原始行数: rawCount, 去重后行数: output.length, 重复行数: duplicated.length }
  return {
    output: output.join('\n'),
    report: JSON.stringify(reportObj, null, 2),
  }
}
