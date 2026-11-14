import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export type EnvParseIssue = { line: number; text: string; message: string }

export function unquoteEnvValue(value: string) {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }

  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

export function parseEnvText(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const values: Record<string, string> = {}
  const issues: EnvParseIssue[] = []
  let blankLines = 0
  let commentLines = 0

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1
    const trimmed = rawLine.trim()

    if (!trimmed) {
      blankLines += 1
      return
    }

    if (trimmed.startsWith('#')) {
      commentLines += 1
      return
    }

    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trimStart() : trimmed
    const separatorIndex = withoutExport.indexOf('=')

    if (separatorIndex <= 0) {
      issues.push({ line: lineNumber, text: rawLine, message: lt('缺少 key=value 结构', 'Missing key=value syntax', locale) })
      return
    }

    const key = withoutExport.slice(0, separatorIndex).trim()
    const rawValue = withoutExport.slice(separatorIndex + 1)

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      issues.push({
        line: lineNumber,
        text: rawLine,
        message: lt('变量名只能包含字母、数字和下划线，且不能以数字开头', 'Key must start with a letter or underscore and use letters, digits, or underscores', locale),
      })
      return
    }

    values[key] = unquoteEnvValue(rawValue)
  })

  const table = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  return {
    json: JSON.stringify(values, null, 2),
    table,
    report: JSON.stringify(
      {
        validEntries: Object.keys(values).length,
        commentLines,
        blankLines,
        issueCount: issues.length,
        issues,
      },
      null,
      2,
    ),
  }
}
