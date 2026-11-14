import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export type CurlFetchMode = 'curl-to-fetch' | 'fetch-to-curl'

export function tokenizeShellLike(input: string) {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaping = false

  for (const char of input.trim()) {
    if (escaping) {
      current += char
      escaping = false
      continue
    }
    if (char === '\\') {
      escaping = true
      continue
    }
    if (quote) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (current) tokens.push(current)
  return tokens
}

export function curlToFetch(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const tokens = tokenizeShellLike(input.replace(/\\\r?\n/g, ' '))
  if (!tokens.length || tokens[0] !== 'curl') {
    return lt('请输入以 curl 开头的命令', 'Enter a command starting with curl', locale)
  }
  let url = ''
  let method = 'GET'
  const headers: Record<string, string> = {}
  let body = ''

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (token === '-X' || token === '--request') {
      method = next?.toUpperCase() || method
      index += 1
      continue
    }
    if (token === '-H' || token === '--header') {
      const separator = next?.indexOf(':') ?? -1
      if (next && separator > 0) {
        headers[next.slice(0, separator).trim()] = next.slice(separator + 1).trim()
      }
      index += 1
      continue
    }
    if (['-d', '--data', '--data-raw', '--data-binary'].includes(token)) {
      body = next ?? ''
      if (method === 'GET') method = 'POST'
      index += 1
      continue
    }
    if (!token.startsWith('-')) {
      url = token
    }
  }

  if (!url) return lt('未找到请求 URL', 'Request URL not found', locale)
  const initLines = [`method: '${method}'`]
  if (Object.keys(headers).length) initLines.push(`headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')}`)
  if (body) initLines.push(`body: ${JSON.stringify(body)}`)
  return `const response = await fetch(${JSON.stringify(url)}, {\n  ${initLines.join(',\n  ')}\n})\nconst data = await response.json()`
}

export function fetchToCurl(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const url = input.match(/fetch\(\s*(['"`])(.+?)\1/)?.[2]
  if (!url) return lt('未找到 fetch URL', 'fetch URL not found', locale)
  const method = input.match(/method\s*:\s*(['"`])(.+?)\1/)?.[2]?.toUpperCase() ?? 'GET'
  const body = input.match(/body\s*:\s*JSON\.stringify\(([\s\S]+?)\)\s*[,}]/)?.[1] ?? input.match(/body\s*:\s*(['"`])([\s\S]+?)\1/)?.[2]
  const headerMatches = Array.from(input.matchAll(/['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g))
    .filter(([, key]) => key.toLowerCase() !== 'method' && key.toLowerCase() !== 'body')
    .map(([, key, value]) => `  -H ${JSON.stringify(`${key}: ${value}`)}`)
  const parts = [`curl ${JSON.stringify(url)}`, `  -X ${method}`, ...headerMatches]
  if (body) parts.push(`  --data-raw ${JSON.stringify(body.trim())}`)
  return parts.join(' \\\n')
}
