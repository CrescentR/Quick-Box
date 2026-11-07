export function replaceWithRegex(input: string, pattern: string, flags: string, replacement: string) {
  try {
    const normalizedFlags = Array.from(new Set((flags || 'g').replace(/[^dgimsuvy]/g, '').split(''))).join('')
    const regex = new RegExp(pattern, normalizedFlags || 'g')
    const matches = input.match(regex) ?? []
    return {
      output: input.replace(regex, replacement),
      report: `匹配 ${matches.length} 处，flags=${normalizedFlags || 'g'}`,
    }
  } catch (error) {
    return {
      output: input,
      report: error instanceof Error ? `正则无效：${error.message}` : '正则无效',
    }
  }
}
