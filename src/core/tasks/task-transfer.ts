import { lt } from '../../i18n'
import { isValidDate, isValidTime } from './natural-date'
import type { ImportTaskItem, Task } from './task-types'

export type ImportFormat = 'json' | 'csv' | 'markdown'
export const MAX_TASK_IMPORT_BYTES = 8 * 1024 * 1024
const recurrenceRules = new Set(['daily', 'weekdays', 'weekly', 'monthly', 'yearly'])

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(lt('任务必须是对象，不能是空值或数组', 'Task must be an object, not null or an array'))
  }
  return value as Record<string, unknown>
}

function text(value: unknown, name: string, fallback = ''): string {
  if (value == null) return fallback
  if (typeof value !== 'string') throw new Error(lt(`${name}必须是文本`, `${name} must be text`))
  return value
}

function nullableText(value: unknown, name: string): string | null {
  const result = text(value, name).trim()
  return result || null
}

function integer(value: unknown, name: string, fallback: number, minimum: number, maximum: number): number {
  if (value == null) return fallback
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(lt(`${name}必须是 ${minimum}–${maximum} 之间的整数`, `${name} must be an integer between ${minimum} and ${maximum}`))
  }
  return value
}

function boolean(value: unknown, name: string): boolean {
  if (value == null) return false
  if (typeof value !== 'boolean') throw new Error(lt(`${name}必须是 true 或 false`, `${name} must be true or false`))
  return value
}

/** Accept both original Task exports and the name-based transfer contract. No lossy coercion. */
export function validateImportTask(value: unknown): ImportTaskItem {
  const row = object(value)
  const title = text(row.title, lt('标题', 'Title')).trim()
  const due_date = nullableText(row.due_date, lt('截止日期', 'Due date'))
  const due_time = nullableText(row.due_time, lt('截止时间', 'Due time'))
  const recurrence = nullableText(row.recurrence, lt('重复规则', 'Recurrence'))
  if (due_date && !isValidDate(due_date)) throw new Error(lt('截止日期必须是有效的 YYYY-MM-DD 日期', 'Due date must be a valid YYYY-MM-DD date'))
  if (due_time && !isValidTime(due_time)) throw new Error(lt('截止时间必须是有效的 HH:mm 时间', 'Due time must be a valid HH:mm time'))
  if (recurrence && !recurrenceRules.has(recurrence)) throw new Error(lt('重复规则无效', 'Invalid recurrence rule'))
  const reminder_minutes = row.reminder_minutes == null
    ? null : integer(row.reminder_minutes, lt('提醒分钟', 'Reminder minutes'), 0, 0, 525600)
  if (row.status != null && row.status !== 'pending' && row.status !== 'completed') throw new Error(lt('任务状态无效', 'Invalid task status'))

  const sourceTags = row.tag_names ?? row.tags ?? []
  if (!Array.isArray(sourceTags)) throw new Error(lt('标签必须是数组', 'Tags must be an array'))
  const tag_names = [...new Set(sourceTags.map(tag => {
    const name = typeof tag === 'string' ? tag : object(tag).name
    return text(name, lt('标签名称', 'Tag name')).trim()
  }).filter(Boolean))]
  const sourceSubtasks = row.subtasks ?? []
  if (!Array.isArray(sourceSubtasks)) throw new Error(lt('子任务必须是数组', 'Subtasks must be an array'))
  const subtasks = sourceSubtasks.map(sub => {
    const item = object(sub)
    return {
      title: text(item.title, lt('子任务标题', 'Subtask title')).trim(),
      completed: boolean(item.completed, lt('子任务完成状态', 'Subtask completion')),
    }
  }).filter(sub => sub.title)
  return {
    title, description: text(row.description, lt('描述', 'Description')),
    status: row.status === 'completed' ? 'completed' : 'pending',
    priority: integer(row.priority, lt('优先级', 'Priority'), 4, 1, 4),
    list_name: nullableText(row.list_name, lt('列表名称', 'List name')), due_date, due_time,
    reminder_minutes, recurrence, is_pinned: boolean(row.is_pinned, lt('置顶状态', 'Pinned flag')), tag_names, subtasks,
  }
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', inQuotes = false, closedQuote = false
  const finishRow = () => {
    row.push(cell)
    if (row.some(value => value.trim())) rows.push(row)
    row = []; cell = ''; closedQuote = false
  }
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') { cell += '"'; i++ }
        else { inQuotes = false; closedQuote = true }
      } else cell += char
    } else if (char === ',') {
      row.push(cell); cell = ''; closedQuote = false
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') i++
      finishRow()
    } else if (closedQuote) {
      if (!/\s/.test(char)) throw new Error(lt('CSV 引号结束后存在无效字符', 'Unexpected characters after closing CSV quote'))
    } else if (char === '"') {
      if (cell) throw new Error(lt('CSV 引号必须出现在字段开头', 'CSV quote must appear at the start of a field'))
      inQuotes = true
    } else cell += char
  }
  if (inQuotes) throw new Error(lt('CSV 存在未闭合的引号', 'CSV has an unclosed quote'))
  if (cell || row.length || closedQuote) finishRow()
  return rows
}

function csvItems(content: string): unknown[] {
  const rows = parseCsvRows(content.replace(/^\uFEFF/, ''))
  if (!rows.length) throw new Error(lt('CSV 文件内容为空', 'CSV file is empty'))
  const header = rows[0].map(value => value.trim().toLowerCase())
  if (new Set(header).size !== header.length) throw new Error(lt('CSV 表头不能包含重复列名', 'CSV header must not contain duplicate columns'))
  const index = (...names: string[]) => header.findIndex(value => names.includes(value))
  const titleIndex = index('标题', 'title')
  if (titleIndex < 0) throw new Error(lt('CSV 缺少“标题”列', 'CSV is missing a "title" column'))
  const field = (row: string[], ...names: string[]) => {
    const position = index(...names)
    return position < 0 ? '' : row[position] ?? ''
  }
  return rows.slice(1).map((row, i) => {
    if (row.length !== header.length) throw new Error(lt(`CSV 第 ${i + 2} 行字段数与表头不一致`, `CSV row ${i + 2} field count does not match header`))
    const priority = field(row, '优先级', 'priority').trim()
    const reminder = field(row, '提醒分钟', 'reminder_minutes').trim()
    const pinned = field(row, '置顶', 'is_pinned').trim().toLowerCase()
    if (pinned && pinned !== 'true' && pinned !== 'false' && pinned !== '1' && pinned !== '0') {
      throw new Error(lt(`CSV 第 ${i + 2} 行置顶状态无效`, `CSV row ${i + 2} has an invalid pinned flag`))
    }
    return {
      title: row[titleIndex], description: field(row, '描述', 'description'),
      status: field(row, '状态', 'status').trim() || 'pending', priority: priority ? Number(priority) : 4,
      list_name: field(row, '列表', 'list', 'list_name'),
      due_date: field(row, '日期', 'due_date', 'due date'), due_time: field(row, '时间', 'due_time', 'due time'),
      tag_names: field(row, '标签', 'tags').split(';').map(value => value.trim()).filter(Boolean),
      reminder_minutes: reminder ? Number(reminder) : null,
      recurrence: field(row, '重复', 'recurrence'), is_pinned: pinned === 'true' || pinned === '1',
    }
  })
}

function markdownItems(content: string): unknown[] {
  const items: unknown[] = []
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*- \[([ xX])\]\s+(.+)$/.exec(line)
    if (!match) continue
    let title = match[2].trim(), description = '', due_date: string | null = null
    const divider = /\s+[—-]\s+/.exec(title)
    if (divider) { description = title.slice(divider.index + divider[0].length); title = title.slice(0, divider.index) }
    const date = /\((\d{4}-\d{2}-\d{2})\)\s*$/.exec(title)
    if (date) { due_date = date[1]; title = title.slice(0, date.index).trim() }
    items.push({ title, description, due_date, status: match[1].toLowerCase() === 'x' ? 'completed' : 'pending' })
  }
  if (!items.length) throw new Error(lt('Markdown 中没有可导入的“- [ ]”任务', 'No "- [ ]" task items found in Markdown'))
  return items
}

export function parseImportContent(content: string, format: ImportFormat): ImportTaskItem[] {
  if (new Blob([content]).size > MAX_TASK_IMPORT_BYTES) throw new Error(lt('任务导入文件不能超过 8 MB', 'Task import file cannot exceed 8 MB'))
  const trimmed = content.trim()
  if (!trimmed) throw new Error(lt('文件内容为空', 'File content is empty'))
  let items: unknown[]
  if (format === 'json') {
    let parsed: unknown
    try { parsed = JSON.parse(trimmed) } catch { throw new Error(lt('JSON 格式无效，请检查文件内容', 'Invalid JSON format')) }
    if (Array.isArray(parsed)) items = parsed
    else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { tasks?: unknown }).tasks)) items = (parsed as { tasks: unknown[] }).tasks
    else throw new Error(lt('JSON 文件应包含任务数组', 'JSON file must contain an array of tasks'))
  } else if (format === 'csv') items = csvItems(content)
  else if (format === 'markdown') items = markdownItems(content)
  else throw new Error(lt('不支持的任务导入格式', 'Unsupported task import format'))
  return items.map((item, index) => {
    try { return validateImportTask(item) }
    catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(lt(`第 ${index + 1} 个任务无效：${detail}`, `Invalid task #${index + 1}: ${detail}`))
    }
  })
}

export function detectImportFormat(filename: string): ImportFormat | null {
  const extension = filename.toLowerCase().split('.').pop()
  return extension === 'json' || extension === 'csv' ? extension : extension === 'md' || extension === 'markdown' ? 'markdown' : null
}

export function exportTaskContent(tasks: Task[], format: ImportFormat): string {
  const active = tasks.filter(task => !task.deleted_at)
  if (format === 'json') return JSON.stringify(active.map(task => ({
    id: task.id, title: task.title, description: task.description, status: task.status,
    priority: task.priority, sort_order: task.sort_order, list_id: task.list_id, list_name: task.list_name,
    due_date: task.due_date, due_time: task.due_time, reminder_minutes: task.reminder_minutes,
    recurrence: task.recurrence, is_pinned: task.is_pinned, completed_at: task.completed_at,
    created_at: task.created_at, updated_at: task.updated_at, deleted_at: task.deleted_at,
    tags: task.tags, subtasks: task.subtasks,
  })), null, 2)
  if (format === 'markdown') return `# Task\n\n${active.map(task => `- [${task.status === 'completed' ? 'x' : ' '}] ${task.title.replace(/\r?\n/g, ' ')}${task.due_date ? ` (${task.due_date})` : ''}${task.description ? ` — ${task.description.replace(/\r?\n/g, ' ')}` : ''}`).join('\n')}\n`
  if (format !== 'csv') throw new Error(lt('不支持的任务导出格式', 'Unsupported task export format'))
  const csv = (value: string) => `"${value.replace(/"/g, '""')}"`
  const header = lt('标题,描述,状态,优先级,列表,日期,时间,标签,创建时间', 'title,description,status,priority,list,due_date,due_time,tags,created_at')
  const inbox = lt('收集箱', 'Inbox')
  return `${header}\n${active.map(task => [
    csv(task.title), csv(task.description), task.status, task.priority, csv(task.list_name || inbox),
    task.due_date || '', task.due_time || '', csv(task.tags.map(tag => tag.name).join(';')), task.created_at,
  ].join(',')).join('\n')}\n`
}
