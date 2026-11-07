import { safeJsonParse } from './shared'

export function toJsonStringLiteral(input: string) {
  return JSON.stringify(input)
}

export function fromJsonStringLiteral(input: string) {
  const parsed = safeJsonParse(input.trim())
  if (!parsed.ok) return parsed.message
  return typeof parsed.value === 'string' ? parsed.value : '输入不是 JSON 字符串字面量'
}
