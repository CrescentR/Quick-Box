export type CookieAttributeMap = {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: string
  maxAge?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: string
  extra: Record<string, string | boolean>
}

function splitCookiePairs(input: string) {
  const parts: string[] = []
  let current = ''
  let inExpires = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    current += char
    const lower = current.toLowerCase()
    if (char === '=' && lower.trim().startsWith('expires=')) inExpires = true
    if (char === ';' && !inExpires) {
      parts.push(current.slice(0, -1))
      current = ''
      continue
    }
    if (inExpires && char === ';') {
      parts.push(current.slice(0, -1))
      current = ''
      inExpires = false
    }
  }

  if (current.trim()) parts.push(current)
  return parts.map((part) => part.trim()).filter(Boolean)
}

function parseNameValue(part: string) {
  const separator = part.indexOf('=')
  if (separator < 0) return { name: part.trim(), value: true as const }
  return {
    name: part.slice(0, separator).trim(),
    value: part.slice(separator + 1).trim(),
  }
}

export function parseSetCookie(input: string): CookieAttributeMap {
  const parts = splitCookiePairs(input.replace(/^Set-Cookie:\s*/i, ''))
  if (!parts.length) throw new Error('Set-Cookie 为空')

  const first = parseNameValue(parts[0])
  if (first.value === true || !first.name) throw new Error('缺少 cookie 名称或值')

  const result: CookieAttributeMap = {
    name: first.name,
    value: first.value,
    extra: {},
  }

  parts.slice(1).forEach((part) => {
    const parsed = parseNameValue(part)
    const key = parsed.name.toLowerCase()
    if (key === 'secure') result.secure = true
    else if (key === 'httponly') result.httpOnly = true
    else if (key === 'samesite' && parsed.value !== true) result.sameSite = parsed.value
    else if (key === 'domain' && parsed.value !== true) result.domain = parsed.value
    else if (key === 'path' && parsed.value !== true) result.path = parsed.value
    else if (key === 'expires' && parsed.value !== true) result.expires = parsed.value
    else if (key === 'max-age' && parsed.value !== true) result.maxAge = parsed.value
    else result.extra[parsed.name] = parsed.value
  })

  return result
}

export function parseCookieHeader(input: string) {
  const body = input.replace(/^Cookie:\s*/i, '')
  return splitCookiePairs(body).map((part) => {
    const parsed = parseNameValue(part)
    return {
      name: parsed.name,
      value: parsed.value === true ? '' : parsed.value,
    }
  })
}

export function parseCookieInput(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return { kind: 'empty' as const, cookies: [], setCookies: [] }
  }

  const looksLikeSetCookie = lines.some(
    (line) => /^Set-Cookie:/i.test(line) || /;\s*(HttpOnly|Secure|SameSite|Max-Age|Expires|Domain|Path)=?/i.test(line),
  )

  if (looksLikeSetCookie) {
    return {
      kind: 'set-cookie' as const,
      cookies: [],
      setCookies: lines.map(parseSetCookie),
    }
  }

  return {
    kind: 'cookie' as const,
    cookies: lines.flatMap(parseCookieHeader),
    setCookies: [],
  }
}

export function buildCookieHeader(pairs: Array<{ name: string; value: string }>) {
  return pairs
    .filter((item) => item.name.trim())
    .map((item) => `${item.name.trim()}=${item.value}`)
    .join('; ')
}
