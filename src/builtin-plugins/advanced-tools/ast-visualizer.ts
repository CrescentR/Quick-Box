export function visualizeAst(input: string) {
  const tokens = input.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|=>|===|!==|==|!=|<=|>=|[{}()[\].,;:+\-*/=<>]/g) ?? []
  const lines = ['程序']
  let depth = 1
  tokens.forEach((token, index) => {
    if (['}', ')', ']'].includes(token)) depth = Math.max(1, depth - 1)
    const type = /^[A-Za-z_$]/.test(token) ? '标识符' : /^\d/.test(token) ? '数字' : '符号'
    lines.push(`${'  '.repeat(depth)}${index + 1}. ${type}: ${token}`)
    if (['{', '(', '['].includes(token)) depth += 1
  })
  return lines.join('\n')
}
