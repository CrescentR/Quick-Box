export function describeCronField(value: string, unit: string) {
  if (value === '*') return `每个${unit}`
  if (value.startsWith('*/')) return `每 ${value.slice(2)} 个${unit}`
  if (value.includes(',')) return `${unit}为 ${value.split(',').join('、')}`
  if (value.includes('-')) return `${unit}范围 ${value.replace('-', ' 到 ')}`
  return `${unit}为 ${value}`
}

export function analyzeCron(input: string) {
  const fields = input.trim().split(/\s+/)
  if (fields.length !== 5) return 'Cron 表达式需要 5 段：分钟 小时 日期 月份 星期'
  const [minute, hour, day, month, weekday] = fields
  return [
    `分钟：${describeCronField(minute, '分钟')}`,
    `小时：${describeCronField(hour, '小时')}`,
    `日期：${describeCronField(day, '日')}`,
    `月份：${describeCronField(month, '月')}`,
    `星期：${describeCronField(weekday, '星期')}`,
  ].join('\n')
}
