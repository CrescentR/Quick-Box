export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export function safeJsonParse(input: string): { ok: true; value: JsonValue } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(input) as JsonValue }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'JSON 无效' }
  }
}

export function uniqueLines(input: string, caseSensitive: boolean, sortLines: boolean) {
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

  const output = sortLines ? [...unique].sort((a, b) => a.localeCompare(b, 'zh-CN')) : unique
  return {
    output: output.join('\n'),
    report: JSON.stringify(
      {
        原始行数: input.split('\n').filter((line) => line.trim()).length,
        去重后行数: output.length,
        重复行数: duplicated.length,
      },
      null,
      2,
    ),
  }
}
