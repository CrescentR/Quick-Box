export type ConfigValue = null | boolean | number | string | ConfigValue[] | { [key: string]: ConfigValue }

type YamlLine = {
  indent: number
  text: string
  line: number
}

function isPlainObject(value: unknown): value is { [key: string]: ConfigValue } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stripInlineComment(value: string) {
  let inSingle = false
  let inDouble = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const prev = value[index - 1]
    if (char === "'" && !inDouble) inSingle = !inSingle
    if (char === '"' && !inDouble && prev !== '\\') inDouble = !inDouble
    if (char === '#' && !inSingle && !inDouble && (index === 0 || /\s/.test(value[index - 1] ?? ''))) {
      return value.slice(0, index).trimEnd()
    }
  }

  return value
}

function parseScalar(raw: string): ConfigValue {
  const value = raw.trim()
  if (!value || value === '~' || value.toLowerCase() === 'null') return null
  if (value === 'true' || value === 'True' || value === 'TRUE') return true
  if (value === 'false' || value === 'False' || value === 'FALSE') return false
  if (value === '[]') return []
  if (value === '{}') return {}
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d+\.\d+$/.test(value)) return Number(value)
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

function stringifyScalar(value: string | number | boolean | null) {
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (value === '' || /[:#{}[\],&*?|<>=!%@`]|^\s|\s$/.test(value) || /^(true|false|null|~)$/i.test(value)) {
    return JSON.stringify(value)
  }
  return value
}

function collectYamlLines(input: string) {
  const lines: YamlLine[] = []

  input.split(/\r?\n/).forEach((raw, index) => {
    const withoutComment = stripInlineComment(raw)
    if (!withoutComment.trim() || withoutComment.trim().startsWith('#')) return
    const indent = raw.match(/^\s*/)?.[0].length ?? 0
    if (indent % 2 !== 0) {
      throw new Error(`第 ${index + 1} 行缩进不是 2 的倍数`)
    }
    lines.push({ indent, text: withoutComment.trim(), line: index + 1 })
  })

  return lines
}

function splitKeyValue(text: string) {
  const match = text.match(/^([^:]+):(.*)$/)
  if (!match) return null
  return { key: match[1].trim(), value: match[2].trim() }
}

function parseYamlNodes(lines: YamlLine[], parentIndent: number, start = 0): { value: ConfigValue; next: number } {
  if (start >= lines.length || lines[start].indent <= parentIndent) {
    return { value: {}, next: start }
  }

  return lines[start].text.startsWith('-')
    ? parseYamlList(lines, parentIndent, start)
    : parseYamlMap(lines, parentIndent, start)
}

function parseYamlList(lines: YamlLine[], parentIndent: number, start: number) {
  const listIndent = lines[start].indent
  const items: ConfigValue[] = []
  let index = start

  while (index < lines.length && lines[index].indent === listIndent && lines[index].text.startsWith('-')) {
    const rest = lines[index].text.replace(/^-\s?/, '')
    const itemLine = lines[index].line
    index += 1
    const childStart = index
    while (index < lines.length && lines[index].indent > listIndent) index += 1
    const children = lines.slice(childStart, index)

    if (!rest) {
      items.push(parseYamlNodes(children, listIndent).value)
      continue
    }

    if (splitKeyValue(rest)) {
      const synthetic: YamlLine[] = [{ indent: listIndent + 2, text: rest, line: itemLine }, ...children]
      items.push(parseYamlMap(synthetic, listIndent, 0).value)
      continue
    }

    if (children.length) {
      throw new Error(`第 ${itemLine} 行列表标量后不能再嵌套`)
    }
    items.push(parseScalar(rest))
  }

  return { value: items, next: index }
}

function parseYamlMap(lines: YamlLine[], parentIndent: number, start: number) {
  const mapIndent = start < lines.length ? lines[start].indent : parentIndent + 2
  const result: { [key: string]: ConfigValue } = {}
  let index = start

  while (index < lines.length && lines[index].indent === mapIndent && !lines[index].text.startsWith('-')) {
    const pair = splitKeyValue(lines[index].text)
    if (!pair) throw new Error(`第 ${lines[index].line} 行缺少冒号`)
    if (!pair.value) {
      const nested = parseYamlNodes(lines, mapIndent, index + 1)
      result[pair.key] = nested.value
      index = nested.next
      continue
    }
    result[pair.key] = parseScalar(pair.value)
    index += 1
  }

  return { value: result, next: index }
}

export function parseYaml(input: string): ConfigValue {
  const lines = collectYamlLines(input)
  if (!lines.length) return {}
  return parseYamlNodes(lines, -1).value
}

export function stringifyYaml(value: ConfigValue, indent = 0): string {
  const pad = ' '.repeat(indent)

  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`
    return value
      .map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          const nested = stringifyYaml(item, indent + 2)
          const [first, ...rest] = nested.split('\n')
          return [`${pad}- ${first.trimStart()}`, ...rest].join('\n')
        }
        return `${pad}- ${stringifyScalar(item)}`
      })
      .join('\n')
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (!entries.length) return `${pad}{}`
    return entries
      .map(([key, item]) => {
        if (item === null || typeof item !== 'object') {
          return `${pad}${key}: ${stringifyScalar(item)}`
        }
        if (Array.isArray(item) && !item.length) return `${pad}${key}: []`
        if (isPlainObject(item) && !Object.keys(item).length) return `${pad}${key}: {}`
        return `${pad}${key}:\n${stringifyYaml(item, indent + 2)}`
      })
      .join('\n')
  }

  return `${pad}${stringifyScalar(value)}`
}

function tokenizePropertyKey(key: string) {
  const tokens: Array<string | number> = []

  key.split('.').forEach((segment) => {
    const match = segment.match(/^([^[\]]+)((?:\[\d+])*)$/)
    if (!match || !match[1]) {
      throw new Error(`无法解析属性键：${key}`)
    }
    tokens.push(match[1])
    const indexes = match[2].match(/\[(\d+)]/g) ?? []
    indexes.forEach((item) => tokens.push(Number(item.slice(1, -1))))
  })

  return tokens
}

function setPath(root: { [key: string]: ConfigValue }, tokens: Array<string | number>, value: ConfigValue) {
  let current: ConfigValue = root

  tokens.forEach((token, index) => {
    const isLast = index === tokens.length - 1
    const nextToken = tokens[index + 1]
    if (isLast) {
      if (Array.isArray(current) && typeof token === 'number') {
        current[token] = value
        return
      }
      if (isPlainObject(current) && typeof token === 'string') {
        current[token] = value
      }
      return
    }

    const nextIsIndex = typeof nextToken === 'number'
    if (Array.isArray(current) && typeof token === 'number') {
      if (current[token] == null) current[token] = nextIsIndex ? [] : {}
      current = current[token]
      return
    }
    if (isPlainObject(current) && typeof token === 'string') {
      if (current[token] == null) current[token] = nextIsIndex ? [] : {}
      current = current[token]
    }
  })
}

function findPropertySeparator(line: string) {
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if ((char === '=' || char === ':') && line[index - 1] !== '\\') return index
  }
  return -1
}

function parsePropertyValue(raw: string): ConfigValue {
  const value = raw.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null' || value === '') return value === 'null' ? null : ''
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d+\.\d+$/.test(value)) return Number(value)
  return value.replace(/\\n/g, '\n').replace(/\\=/g, '=').replace(/\\\\/g, '\\')
}

export function parseProperties(input: string): { [key: string]: ConfigValue } {
  const root: { [key: string]: ConfigValue } = {}
  let pending = ''

  input.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    let line = pending ? pending + rawLine.trimStart() : rawLine
    pending = ''
    if (line.endsWith('\\')) {
      pending = line.slice(0, -1)
      return
    }

    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) return
    const separator = findPropertySeparator(trimmed)
    if (separator < 0) throw new Error(`第 ${lineIndex + 1} 行缺少 = 或 :`)
    const key = trimmed.slice(0, separator).trim().replace(/\\=/g, '=')
    const value = parsePropertyValue(trimmed.slice(separator + 1))
    setPath(root, tokenizePropertyKey(key), value)
  })

  if (pending) throw new Error('properties 文本以未结束的续行符结尾')
  return root
}

function flattenValue(value: ConfigValue, prefix: string, target: Array<[string, string]>) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenValue(item, `${prefix}[${index}]`, target))
    return
  }
  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      flattenValue(item, prefix ? `${prefix}.${key}` : key, target)
    })
    return
  }
  if (!prefix) return
  const serialized =
    value === null ? 'null' : typeof value === 'string' ? value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n') : String(value)
  target.push([prefix, serialized])
}

export function stringifyProperties(value: ConfigValue) {
  const rows: Array<[string, string]> = []
  flattenValue(value, '', rows)
  return rows.map(([key, item]) => `${key}=${item}`).join('\n')
}

export function yamlToProperties(input: string) {
  return stringifyProperties(parseYaml(input))
}

export function propertiesToYaml(input: string) {
  return stringifyYaml(parseProperties(input))
}
