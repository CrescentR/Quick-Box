import { getCurrentLocale, lt, type ResolvedLocale } from '../../i18n'

export function describeCronField(value: string, unit: string, locale: ResolvedLocale = getCurrentLocale()) {
  if (locale === 'en-US') {
    if (value === '*') return `every ${unit}`
    if (value.startsWith('*/')) return `every ${value.slice(2)} ${unit}(s)`
    if (value.includes(',')) return `${value.split(',').join(', ')}`
    if (value.includes('-')) return `from ${value.replace('-', ' to ')}`
    return `${value}`
  }
  if (value === '*') return `每个${unit}`
  if (value.startsWith('*/')) return `每 ${value.slice(2)} 个${unit}`
  if (value.includes(',')) return `${unit}为 ${value.split(',').join('、')}`
  if (value.includes('-')) return `${unit}范围 ${value.replace('-', ' 到 ')}`
  return `${unit}为 ${value}`
}

export function analyzeCron(input: string, locale: ResolvedLocale = getCurrentLocale()) {
  const fields = input.trim().split(/\s+/)
  if (fields.length !== 5) {
    return lt(
      'Cron 表达式需要 5 段：分钟 小时 日期 月份 星期',
      'Cron expression must have 5 fields: minute hour day month weekday',
      locale,
    )
  }
  const [minute, hour, day, month, weekday] = fields
  if (locale === 'en-US') {
    return [
      `Minute: ${describeCronField(minute, 'minute', locale)}`,
      `Hour: ${describeCronField(hour, 'hour', locale)}`,
      `Day: ${describeCronField(day, 'day', locale)}`,
      `Month: ${describeCronField(month, 'month', locale)}`,
      `Weekday: ${describeCronField(weekday, 'weekday', locale)}`,
    ].join('\n')
  }
  return [
    `分钟：${describeCronField(minute, '分钟', locale)}`,
    `小时：${describeCronField(hour, '小时', locale)}`,
    `日期：${describeCronField(day, '日', locale)}`,
    `月份：${describeCronField(month, '月', locale)}`,
    `星期：${describeCronField(weekday, '星期', locale)}`,
  ].join('\n')
}
