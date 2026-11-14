import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'
import { safeJsonParse } from './shared'
import type { JsonValue, JsonObject } from './shared'

export type PathToken =
  | { type: 'key'; value: string }
  | { type: 'index'; value: number }
  | { type: 'wildcard' }

export function parseJsonPath(path: string, locale: ResolvedLocale = getCurrentLocale()): PathToken[] {
  const tokens: PathToken[] = []
  let index = path.trim().startsWith('$') ? 1 : 0

  while (index < path.length) {
    const char = path[index]
    if (char === '.') {
      index += 1
      if (path[index] === '*') {
        tokens.push({ type: 'wildcard' })
        index += 1
        continue
      }
      const match = path.slice(index).match(/^[A-Za-z_$][\w$-]*/)
      if (!match) throw new Error(lt(`第 ${index + 1} 位缺少字段名`, `Missing field name at position ${index + 1}`, locale))
      tokens.push({ type: 'key', value: match[0] })
      index += match[0].length
      continue
    }

    if (char === '[') {
      const end = path.indexOf(']', index)
      if (end < 0) throw new Error(lt('方括号没有闭合', 'Unclosed bracket [', locale))
      const body = path.slice(index + 1, end).trim()
      if (body === '*') tokens.push({ type: 'wildcard' })
      else if (/^\d+$/.test(body)) tokens.push({ type: 'index', value: Number(body) })
      else {
        const key = body.replace(/^["']|["']$/g, '')
        if (!key) throw new Error(lt('字段名为空', 'Empty field name', locale))
        tokens.push({ type: 'key', value: key })
      }
      index = end + 1
      continue
    }

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    throw new Error(lt(`不支持的路径字符：${char}`, `Unsupported path character: ${char}`, locale))
  }

  return tokens
}

export function evaluateJsonPath(input: string, path: string, locale: ResolvedLocale = getCurrentLocale()) {
  const parsed = safeJsonParse(input, locale)
  if (!parsed.ok) return parsed.message

  try {
    const tokens = parseJsonPath(path, locale)
    const values = tokens.reduce<JsonValue[]>((current, token) => {
      return current.flatMap((value) => {
        if (token.type === 'wildcard') {
          if (Array.isArray(value)) return value
          if (value && typeof value === 'object') return Object.values(value)
          return []
        }
        if (token.type === 'index') {
          return Array.isArray(value) && value[token.value] !== undefined ? [value[token.value]] : []
        }
        if (value && typeof value === 'object' && !Array.isArray(value) && token.value in value) {
          return [(value as JsonObject)[token.value]]
        }
        return []
      })
    }, [parsed.value])

    return JSON.stringify({ count: values.length, values }, null, 2)
  } catch (error) {
    return error instanceof Error ? error.message : lt('JSONPath 无效', 'Invalid JSONPath', locale)
  }
}
