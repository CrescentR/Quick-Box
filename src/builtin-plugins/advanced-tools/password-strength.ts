import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export function scorePassword(password: string, locale: ResolvedLocale = getCurrentLocale()) {
  const checks = [
    { label: lt('长度不少于 12 位', 'At least 12 characters', locale), passed: password.length >= 12 },
    { label: lt('包含小写字母', 'Contains lowercase letters', locale), passed: /[a-z]/.test(password) },
    { label: lt('包含大写字母', 'Contains uppercase letters', locale), passed: /[A-Z]/.test(password) },
    { label: lt('包含数字', 'Contains digits', locale), passed: /\d/.test(password) },
    { label: lt('包含符号', 'Contains symbols', locale), passed: /[^a-zA-Z0-9]/.test(password) },
    { label: lt('没有明显连续重复', 'No repeated characters (3+)', locale), passed: !/(.)\1{2,}/.test(password) },
  ]
  const score = checks.filter((check) => check.passed).length
  const level = score >= 5 ? lt('强', 'Strong', locale) : score >= 3 ? lt('中', 'Medium', locale) : lt('弱', 'Weak', locale)
  if (locale === 'en-US') {
    return JSON.stringify({ strength: level, score: `${score}/${checks.length}`, checks }, null, 2)
  }
  return JSON.stringify({ 强度: level, 分数: `${score}/${checks.length}`, 检查项: checks }, null, 2)
}
