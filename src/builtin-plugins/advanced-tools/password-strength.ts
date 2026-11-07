export function scorePassword(password: string) {
  const checks = [
    { label: '长度不少于 12 位', passed: password.length >= 12 },
    { label: '包含小写字母', passed: /[a-z]/.test(password) },
    { label: '包含大写字母', passed: /[A-Z]/.test(password) },
    { label: '包含数字', passed: /\d/.test(password) },
    { label: '包含符号', passed: /[^a-zA-Z0-9]/.test(password) },
    { label: '没有明显连续重复', passed: !/(.)\1{2,}/.test(password) },
  ]
  const score = checks.filter((check) => check.passed).length
  const level = score >= 5 ? '强' : score >= 3 ? '中' : '弱'
  return JSON.stringify({ 强度: level, 分数: `${score}/${checks.length}`, 检查项: checks }, null, 2)
}
