import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export function visualizeAst(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const tokens = input.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|=>|===|!==|==|!=|<=|>=|[{}()[\].,;:+\-*/=<>]/g) ?? []
  const lines = [lt('程序', 'Program', locale)]
  let depth = 1
  tokens.forEach((token, index) => {
    if (['}', ')', ']'].includes(token)) depth = Math.max(1, depth - 1)
    const type = /^[A-Za-z_$]/.test(token)
      ? lt('标识符', 'Identifier', locale)
      : /^\d/.test(token)
        ? lt('数字', 'Number', locale)
        : lt('符号', 'Symbol', locale)
    lines.push(`${'  '.repeat(depth)}${index + 1}. ${type}: ${token}`)
    if (['{', '(', '['].includes(token)) depth += 1
  })
  return lines.join('\n')
}
