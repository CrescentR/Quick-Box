export function compactLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line.trim() || lines[index - 1]?.trim())
    .join('\n')
}

export function formatYaml(input: string) {
  const errors: string[] = []
  const lines = input.replace(/\t/g, '  ').split('\n')
  const formatted = lines
    .map((line, index) => {
      const raw = line.trim()
      if (!raw || raw.startsWith('#')) return raw
      const indent = line.match(/^\s*/)?.[0].length ?? 0
      if (indent % 2 !== 0) errors.push(`第 ${index + 1} 行缩进不是 2 的倍数`)
      if (!raw.startsWith('- ') && !raw.includes(':')) errors.push(`第 ${index + 1} 行缺少冒号`)
      return `${' '.repeat(Math.floor(indent / 2) * 2)}${raw.replace(/\s*:\s*/, ': ')}`
    })
    .join('\n')

  return {
    formatted: compactLines(formatted),
    report: errors.length ? errors.join('\n') : '未发现明显 YAML 结构问题',
  }
}
