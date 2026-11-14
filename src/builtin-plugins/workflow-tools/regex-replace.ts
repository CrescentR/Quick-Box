import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export function replaceWithRegex(
  input: string,
  pattern: string,
  flags: string,
  replacement: string,
  locale: ResolvedLocale = getCurrentLocale(),
) {
  try {
    const normalizedFlags = Array.from(new Set((flags || 'g').replace(/[^dgimsuvy]/g, '').split(''))).join('')
    const regex = new RegExp(pattern, normalizedFlags || 'g')
    const matches = input.match(regex) ?? []
    return {
      output: input.replace(regex, replacement),
      report: lt(
        `匹配 ${matches.length} 处，flags=${normalizedFlags || 'g'}`,
        `Matched ${matches.length} occurrence(s), flags=${normalizedFlags || 'g'}`,
        locale,
      ),
    }
  } catch (error) {
    return {
      output: input,
      report: error instanceof Error ? lt(`正则无效：${error.message}`, `Invalid regex: ${error.message}`, locale) : lt('正则无效', 'Invalid regex', locale),
    }
  }
}
