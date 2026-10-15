export interface ParsedTask { title: string; due_date: string | null; due_time: string | null }

const pad = (value: number) => String(value).padStart(2, '0')

export function localDate(now = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const calendarDate = (date: Date) => `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(12, 0, 0, 0)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const isValidTime = (value: string): boolean => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)

function dateAtNoon(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  // UTC fields model a calendar day, so DST and time-zone date skips cannot change it.
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(12, 0, 0, 0)
  return date
}

function shiftDate(now: Date, days: number): string {
  const date = dateAtNoon(localDate(now))
  date.setUTCDate(date.getUTCDate() + days)
  return calendarDate(date)
}

export function nextRecurringDate(value: string, recurrence: string): string | null {
  if (!isValidDate(value)) return null
  const date = dateAtNoon(value)
  if (recurrence === 'daily' || recurrence === 'weekly' || recurrence === 'weekdays') {
    date.setUTCDate(date.getUTCDate() + (recurrence === 'weekly' ? 7 : 1))
    if (recurrence === 'weekdays') {
      while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1)
    }
  } else if (recurrence === 'monthly' || recurrence === 'yearly') {
    const day = date.getUTCDate()
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + (recurrence === 'monthly' ? 1 : 12))
    const lastDay = new Date(date)
    lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0)
    date.setUTCDate(Math.min(day, lastDay.getUTCDate()))
  } else return null
  const next = calendarDate(date)
  return isValidDate(next) ? next : null
}

function chineseNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value)
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  if (value === '十') return 10
  const tens = /^([一二三四五六七八九])?十([一二三四五六七八九])?$/.exec(value)
  if (tens) return (tens[1] ? digits[tens[1]] : 1) * 10 + (tens[2] ? digits[tens[2]] : 0)
  return digits[value] ?? Number.NaN
}

/** Recognize a date/time only when it is valid; leave unrecognized input in the title. */
export function parseNaturalTask(raw: string, now = new Date()): ParsedTask {
  let title = raw.trim()
  let due_date: string | null = null
  let due_time: string | null = null
  const explicit = title.match(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)|(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日?/)
  let invalidExplicitDate = false
  if (explicit) {
    const year = explicit[1] || explicit[4] || String(now.getFullYear())
    const month = Number(explicit[2] || explicit[5])
    const day = Number(explicit[3] || explicit[6])
    const value = `${year}-${pad(month)}-${pad(day)}`
    if (isValidDate(value)) { due_date = value; title = title.replace(explicit[0], '') }
    else invalidExplicitDate = true
  } else {
    const relative = title.match(/后天|明天|明日|今天|今日|今晚/)
    const week = title.match(/(下周|下星期|本周|这周|周|星期)([一二三四五六日天])/)
    if (week) {
      const target = week[2] === '天' ? 7 : '一二三四五六日'.indexOf(week[2]) + 1
      const current = now.getDay() || 7
      let delta = target - current
      if (week[1] === '下周' || week[1] === '下星期') delta += 7
      else if (week[1] !== '本周' && week[1] !== '这周' && delta <= 0) delta += 7
      due_date = shiftDate(now, delta)
      title = title.replace(week[0], '')
    } else if (relative) {
      const word = relative[0]
      due_date = shiftDate(now, word === '后天' ? 2 : /明天|明日/.test(word) ? 1 : 0)
      if (word === '今晚') due_time = '19:00'
      title = title.replace(word, '')
    }
  }

  if (invalidExplicitDate) return { title: raw.trim(), due_date: null, due_time: null }
  const colon = title.match(/(?<![\d:：])(?:(凌晨|早上|上午|中午|下午|晚上)\s*)?(\d{1,2})[:：](\d{2})(?![\d:：])/)
  const cn = colon ? null : title.match(/(?<![\d一二三四五六七八九十])(?:(凌晨|早上|上午|中午|下午|晚上)\s*)?([零〇一二三四五六七八九十两\d]{1,3})点(?:(半)|([零〇一二三四五六七八九十\d]{1,3})(?:分)?)?/)
  const timeMatch = colon || cn
  if (timeMatch) {
    let hour = colon ? Number(colon[2]) : chineseNumber(timeMatch[2])
    const minute = colon ? Number(colon[3]) : cn?.[3] ? 30 : cn?.[4] ? chineseNumber(cn[4]) : 0
    const period = timeMatch[1]
    const validPeriodHour = !period || (hour >= 0 && hour <= 12) || ((period === '下午' || period === '晚上') && hour >= 13 && hour <= 23)
    if ((period === '下午' || period === '晚上' || period === '中午') && hour < 12) hour += 12
    else if ((period === '凌晨' || period === '上午' || period === '早上') && hour === 12) hour = 0
    const value = `${pad(hour)}:${pad(minute)}`
    if (validPeriodHour && isValidTime(value)) {
      due_time = value
      if (!due_date && !invalidExplicitDate) due_date = localDate(now)
      title = title.replace(timeMatch[0], '')
    }
  }
  return { title: title.replace(/\s+/g, ' ').trim() || raw.trim(), due_date, due_time }
}

export function relativeDate(value: string | null, now = new Date()): string {
  if (!value || !isValidDate(value)) return ''
  const target = dateAtNoon(value)
  const today = dateAtNoon(localDate(now))
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === -1) return '昨天'
  return `${target.getUTCMonth() + 1}月${target.getUTCDate()}日`
}
