import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'
import { safeJsonParse } from './shared'

export function toJsonStringLiteral(input: string) {
  return JSON.stringify(input)
}

export function fromJsonStringLiteral(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const parsed = safeJsonParse(input.trim(), locale)
  if (!parsed.ok) return parsed.message
  return typeof parsed.value === 'string'
    ? parsed.value
    : lt('输入不是 JSON 字符串字面量', 'Input is not a JSON string literal', locale)
}
