import { isValidDate, isValidTime, localDate, nextRecurringDate } from '../core/tasks/natural-date'
import { exportTaskContent, validateImportTask, type ImportFormat } from '../core/tasks/task-transfer'
import type { ImportResult, QueryInput, Tag, Task, TaskInput, TaskList, TaskReminder } from '../core/tasks/task-types'

const DATA_KEY = 'quickbox.preview.tasks'
const SETTINGS_PREFIX = `${DATA_KEY}.setting.`
const RETENTION_MS = 30 * 86_400_000
interface StoredTask extends Task { notified_at: string | null; generated_schedules: string[] }
interface TaskData { version: 1; tasks: StoredTask[]; lists: TaskList[]; tags: Tag[] }
const stamp = () => new Date().toISOString()
const newId = () => crypto.randomUUID()
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error)
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const isNonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const isStamp = (value: unknown) => typeof value === 'string' && Number.isFinite(new Date(value).getTime())
const byteLength = (value: string) => new Blob([value]).size
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)

function damaged(): never { throw new Error('任务预览数据已损坏，原始数据已保留；请先备份浏览器中的 quickbox.preview.tasks 数据。') }

function readData(): TaskData {
  const raw = window.localStorage.getItem(DATA_KEY)
  if (raw === null) return { version: 1, tasks: [], lists: [], tags: [] }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return damaged() }
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.lists) || !Array.isArray(parsed.tags)) return damaged()
  const listIds = new Set<string>(), listNames = new Set<string>(), tagIds = new Set<string>(), tagNames = new Set<string>()
  for (const list of parsed.lists) {
    if (!isRecord(list) || !validId(list.id) || !isNonempty(list.name) || typeof list.icon !== 'string' || !isInteger(list.sort_order) || listIds.has(list.id) || listNames.has(list.name)) return damaged()
    listIds.add(list.id); listNames.add(list.name)
  }
  for (const tag of parsed.tags) {
    if (!isRecord(tag) || !validId(tag.id) || !isNonempty(tag.name) || tagIds.has(tag.id) || tagNames.has(tag.name)) return damaged()
    tagIds.add(tag.id); tagNames.add(tag.name)
  }
  const taskIds = new Set<string>(), subtaskIds = new Set<string>()
  for (const task of parsed.tasks) {
    if (!isRecord(task) || !validId(task.id) || taskIds.has(task.id) || !isNonempty(task.title) ||
      typeof task.description !== 'string' || (task.status !== 'pending' && task.status !== 'completed') ||
      !isInteger(task.priority) || !isInteger(task.sort_order) || !isStamp(task.created_at) || !isStamp(task.updated_at) ||
      (task.completed_at !== null && !isStamp(task.completed_at)) || (task.deleted_at !== null && !isStamp(task.deleted_at)) ||
      (task.notified_at !== null && !isStamp(task.notified_at)) || !Array.isArray(task.generated_schedules) ||
      task.generated_schedules.some(key => typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}\|(daily|weekdays|weekly|monthly|yearly)$/.test(key) || !isValidDate(key.slice(0, 10))) ||
      (task.list_id !== null && (!isNonempty(task.list_id) || !listIds.has(task.list_id))) ||
      (task.list_name !== null && typeof task.list_name !== 'string') || !Array.isArray(task.tags) || !Array.isArray(task.subtasks) ||
      typeof task.is_pinned !== 'boolean' || !('due_date' in task) || !('due_time' in task) ||
      !('reminder_minutes' in task) || !('recurrence' in task)) return damaged()
    try { validateImportTask(task) } catch { return damaged() }
    const expectedListName = task.list_id === null ? null : parsed.lists.find(list => list.id === task.list_id)?.name
    if (task.list_name !== expectedListName) return damaged()
    const ownTags = new Set<string>()
    for (const tag of task.tags) {
      if (!isRecord(tag) || !isNonempty(tag.id) || !tagIds.has(tag.id) || ownTags.has(tag.id) || parsed.tags.find(item => item.id === tag.id)?.name !== tag.name) return damaged()
      ownTags.add(tag.id)
    }
    for (const subtask of task.subtasks) {
      if (!isRecord(subtask) || !validId(subtask.id) || subtaskIds.has(subtask.id) || subtask.task_id !== task.id ||
        !isNonempty(subtask.title) || typeof subtask.completed !== 'boolean' || !isInteger(subtask.sort_order)) return damaged()
      subtaskIds.add(subtask.id)
    }
    taskIds.add(task.id)
  }
  const data = parsed as unknown as TaskData
  // Expiry is also applied to reads, without rewriting the user's stored data in a read operation.
  data.tasks = data.tasks.filter(task => !task.deleted_at || new Date(task.deleted_at).getTime() >= Date.now() - RETENTION_MS)
  return data
}

function saveData(data: TaskData): void {
  // setItem is atomic: storage quota failures leave the previous complete payload intact.
  window.localStorage.setItem(DATA_KEY, JSON.stringify(data))
}

function exposed(task: StoredTask): Task {
  const { notified_at: _notified, generated_schedules: _generated, ...result } = task
  return structuredClone(result)
}

function findTask(data: TaskData, id: unknown, allowDeleted = false): StoredTask {
  if (!validId(id)) throw new Error('任务 ID 无效')
  const task = data.tasks.find(item => item.id === id)
  if (!task || (!allowDeleted && task.deleted_at)) throw new Error('任务不存在或已删除')
  return task
}

function requireName(value: unknown, label: string): string {
  if (!isNonempty(value)) throw new Error(`${label}不能为空`)
  const name = value.trim()
  if (byteLength(value) > 240 || value.includes('\0')) throw new Error(`${label}不能超过 240 字节且不能包含空字符`)
  return name
}

function getOrCreateList(data: TaskData, rawName: string | null | undefined): TaskList | null {
  const name = rawName?.trim()
  if (!name || name === '收集箱') return null
  const existing = data.lists.find(list => list.name === name)
  if (existing) return existing
  const list = { id: newId(), name: requireName(name, '列表名称'), icon: 'list', sort_order: data.lists.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1 }
  data.lists.push(list)
  return list
}

function getOrCreateTag(data: TaskData, rawName: unknown): Tag {
  const name = requireName(rawName, '标签名称')
  const existing = data.tags.find(tag => tag.name === name)
  if (existing) return existing
  const tag = { id: newId(), name }
  data.tags.push(tag)
  return tag
}

function buildTask(data: TaskData, input: TaskInput, previous?: StoredTask): StoredTask {
  if (!isRecord(input)) throw new Error('任务数据无效')
  const normalized = validateImportTask(input)
  if (!normalized.title) throw new Error('任务标题不能为空')
  if (byteLength(input.title) > 2000 || input.title.includes('\0')) throw new Error('任务标题不能超过 2000 字节且不能包含空字符')
  if (byteLength(normalized.description ?? '') > 200_000) throw new Error('任务说明不能超过 200 KB')
  if (!previous && data.tasks.length >= 100_000) throw new Error('最多保存 100000 条任务')
  if (input.list_id != null && typeof input.list_id !== 'string') throw new Error('任务列表无效')
  const list = input.list_id ? data.lists.find(item => item.id === input.list_id) : null
  if (input.list_id && !list) throw new Error('所选列表不存在')
  const tagIds = input.tag_ids ?? []
  if (!Array.isArray(tagIds) || tagIds.length > 100 || new Set(tagIds).size !== tagIds.length || tagIds.some(id => !validId(id) || !data.tags.some(tag => tag.id === id))) throw new Error('标签无效、重复或超过 100 个')
  if (input.subtasks != null && !Array.isArray(input.subtasks)) throw new Error('子任务格式无效')
  if ((input.subtasks?.length ?? 0) > 200) throw new Error('每个任务最多 200 个子任务')
  const id = previous?.id ?? newId(), seen = new Set<string>()
  const subtasks = (input.subtasks ?? []).map((sub, sort_order) => {
    const subId = sub.id || newId()
    if (!sub.title.trim() || byteLength(sub.title) > 2000 || sub.title.includes('\0')) throw new Error('子任务标题不能为空且不能超过 2000 字节')
    if (!validId(subId) || seen.has(subId) || data.tasks.some(task => task.id !== id && task.subtasks.some(item => item.id === subId))) throw new Error('子任务 ID 无效或重复')
    seen.add(subId)
    return { id: subId, task_id: id, title: sub.title.trim(), completed: sub.completed ?? false, sort_order }
  })
  const due_date = normalized.due_date ?? null, due_time = normalized.due_time ?? null
  const reminder_minutes = normalized.reminder_minutes ?? null
  if (due_time && !due_date) throw new Error('截止时间需要有效日期')
  if (reminder_minutes !== null && (!due_date || !due_time)) throw new Error('设置提醒时需要截止日期和时间')
  if (normalized.recurrence && !due_date) throw new Error('设置重复时需要截止日期')
  const changedSchedule = previous && (previous.due_date !== due_date || previous.due_time !== due_time || previous.reminder_minutes !== reminder_minutes)
  return {
    id, title: normalized.title, description: normalized.description ?? '', status: previous?.status ?? 'pending',
    priority: normalized.priority as Task['priority'], sort_order: previous?.sort_order ?? data.tasks.reduce((max, task) => Math.max(max, task.sort_order), -1) + 1,
    list_id: list?.id ?? null, list_name: list?.name ?? null, due_date, due_time, reminder_minutes,
    recurrence: normalized.recurrence ?? null, is_pinned: normalized.is_pinned ?? false,
    completed_at: previous?.completed_at ?? null, created_at: previous?.created_at ?? stamp(), updated_at: stamp(),
    deleted_at: previous?.deleted_at ?? null,
    tags: data.tags.filter(tag => tagIds.includes(tag.id)).map(tag => ({ ...tag })), subtasks,
    notified_at: changedSchedule ? null : previous?.notified_at ?? null, generated_schedules: previous?.generated_schedules ?? [],
  }
}

function matchesView(task: Task, view: string): boolean {
  if (view === 'trash') return !!task.deleted_at
  if (task.deleted_at) return false
  if (view === 'search' || view === 'export') return true
  if (view === 'completed') return task.status === 'completed'
  if (task.status === 'completed') return false
  const today = localDate()
  if (view === 'today') return !!task.due_date && task.due_date <= today
  if (view === 'inbox') return task.list_id === null
  if (view === 'upcoming') {
    const end = new Date(); end.setDate(end.getDate() + 30)
    return !!task.due_date && task.due_date > today && task.due_date <= localDate(end)
  }
  if (view.startsWith('list:')) return task.list_id === view.slice(5)
  if (view.startsWith('tag:')) return task.tags.some(tag => tag.id === view.slice(4))
  return view === 'all'
}

function ordered(tasks: StoredTask[]): StoredTask[] {
  const today = localDate()
  const overdue = (task: Task) => task.due_date && task.due_date < today ? 0 : 1
  return tasks.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.priority - b.priority || a.sort_order - b.sort_order ||
    overdue(a) - overdue(b) || Number(!a.due_date) - Number(!b.due_date) || (a.due_date ?? '').localeCompare(b.due_date ?? '') ||
    Number(!a.due_time) - Number(!b.due_time) || (a.due_time ?? '').localeCompare(b.due_time ?? '') || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
}

function remindersEnabled(): boolean {
  const states = window.localStorage.getItem('quickbox.preview.pluginStates')
  if (!states) return true
  let plugins: unknown
  try { plugins = JSON.parse(states) } catch { throw new Error('插件状态数据已损坏，暂停任务预览提醒') }
  if (!Array.isArray(plugins)) throw new Error('插件状态数据无效，暂停任务预览提醒')
  return !plugins.some(plugin => isRecord(plugin) && plugin.id === 'official.task-tool' && plugin.enabled === false)
}

function civilTime(date: string, time: string): number {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const value = new Date(0)
  value.setUTCFullYear(year, month - 1, day)
  value.setUTCHours(hour, minute, 0, 0)
  return value.getTime()
}

function currentCivilTime(): number {
  const now = new Date()
  return civilTime(localDate(now), `${now.getHours()}:${now.getMinutes()}`) + now.getSeconds() * 1000 + now.getMilliseconds()
}

function isDue(task: StoredTask, now: number): boolean {
  // SQLite subtracts reminder minutes from local calendar fields; mirror that across DST changes.
  return !task.deleted_at && task.status === 'pending' && !!task.due_date && !!task.due_time &&
    task.reminder_minutes !== null && !task.notified_at && isValidDate(task.due_date) && isValidTime(task.due_time) &&
    civilTime(task.due_date, task.due_time) - task.reminder_minutes * 60_000 <= now
}

export async function taskPreview(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
  if (command === 'task_get_setting' || command === 'task_set_setting') {
    if (typeof args.key !== 'string' || !/^[a-zA-Z0-9_.-]{1,80}$/.test(args.key)) throw new Error('任务设置键无效')
    const key = args.key
    if (command === 'task_get_setting') return window.localStorage.getItem(`${SETTINGS_PREFIX}${key}`)
    if (typeof args.value !== 'string') throw new Error('设置值必须是文本')
    if (byteLength(args.value) > 1_000_000) throw new Error('任务设置值不能超过 1 MB')
    window.localStorage.setItem(`${SETTINGS_PREFIX}${key}`, args.value)
    return
  }
  const data = readData()
  switch (command) {
    case 'task_get': {
      if (!validId(args.id)) throw new Error('任务 ID 无效')
      const task = data.tasks.find(item => item.id === args.id)
      return task ? exposed(task) : null
    }
    case 'task_query': {
      const input = args.input as QueryInput
      if (!isRecord(input) || typeof input.view !== 'string') throw new Error('任务查询无效')
      if (!['today', 'inbox', 'upcoming', 'all', 'completed', 'trash', 'search'].includes(input.view) &&
        !(input.view.startsWith('list:') && validId(input.view.slice(5))) && !(input.view.startsWith('tag:') && validId(input.view.slice(4)))) throw new Error('任务视图无效')
      if ((input.search !== undefined && typeof input.search !== 'string') || byteLength(input.search ?? '') > 2000 ||
        (input.offset !== undefined && (!isInteger(input.offset) || input.offset < 0 || input.offset > 100_000)) ||
        (input.limit !== undefined && !isInteger(input.limit))) throw new Error('搜索或分页参数无效')
      const search = typeof input.search === 'string' ? input.search.trim().toLowerCase() : ''
      const offset = isInteger(input.offset) ? Math.max(0, input.offset) : 0
      const limit = isInteger(input.limit) ? Math.max(1, Math.min(200, input.limit)) : 50
      return ordered(data.tasks.filter(task => matchesView(task, input.view) && (!search ||
        `${task.title} ${task.description} ${task.list_name ?? ''} ${task.tags.map(tag => tag.name).join(' ')}`.toLowerCase().includes(search))))
        .slice(offset, offset + limit).map(exposed)
    }
    case 'task_create': {
      const task = buildTask(data, args.input as TaskInput)
      data.tasks.push(task); saveData(data); return exposed(task)
    }
    case 'task_update': {
      const task = findTask(data, args.id)
      const updated = buildTask(data, args.input as TaskInput, task)
      data.tasks[data.tasks.indexOf(task)] = updated; saveData(data); return exposed(updated)
    }
    case 'task_toggle': {
      const task = findTask(data, args.id), completing = task.status !== 'completed'
      task.status = completing ? 'completed' : 'pending'; task.completed_at = completing ? stamp() : null; task.updated_at = stamp()
      const scheduleKey = `${task.due_date}|${task.recurrence}`
      if (completing && task.due_date && task.recurrence && !task.generated_schedules.includes(scheduleKey)) {
        const nextDate = nextRecurringDate(task.due_date, task.recurrence)
        if (!nextDate) throw new Error('无法生成下一次重复日期，请调整截止日期')
        if (data.tasks.length >= 100_000) throw new Error('最多保存 100000 条任务')
        const id = newId(), time = stamp()
        const next: StoredTask = {
          ...structuredClone(task), id, status: 'pending', due_date: nextDate, completed_at: null,
          created_at: time, updated_at: time, notified_at: null, generated_schedules: [],
          sort_order: data.tasks.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1,
          subtasks: task.subtasks.map(sub => ({ ...sub, id: newId(), task_id: id, completed: false })),
        }
        task.generated_schedules.push(scheduleKey); data.tasks.push(next)
      }
      saveData(data); return
    }
    case 'task_delete': { const task = findTask(data, args.id, true); task.deleted_at = stamp(); task.updated_at = stamp(); saveData(data); return }
    case 'task_restore': { const task = findTask(data, args.id, true); task.deleted_at = null; task.updated_at = stamp(); saveData(data); return }
    case 'task_purge': {
      const task = findTask(data, args.id, true)
      if (!task.deleted_at) throw new Error('请先将任务移入回收站')
      data.tasks = data.tasks.filter(item => item.id !== task.id); saveData(data); return
    }
    case 'task_reorder': {
      const ids = args.orderedIds
      if (!Array.isArray(ids) || !ids.length || ids.length > 10_000 || ids.some(id => !validId(id)) || new Set(ids).size !== ids.length || !ids.includes(args.draggedId) ||
        !isInteger(args.priority) || args.priority < 1 || args.priority > 4) throw new Error('任务排序数据无效')
      const tasks = ids.map(id => findTask(data, id))
      if (tasks.some(task => task.status !== 'pending')) throw new Error('只能排序未完成任务')
      tasks.forEach((task, index) => { task.sort_order = index; task.updated_at = stamp(); if (task.id === args.draggedId) task.priority = args.priority as Task['priority'] })
      saveData(data); return
    }
    case 'task_lists': return [...data.lists].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    case 'task_create_list': {
      const name = requireName(args.name, '列表名称')
      if (data.lists.some(list => list.name === name)) throw new Error('列表名称已存在')
      const list = getOrCreateList(data, name)
      if (!list) throw new Error('收集箱为内置列表，请使用其他名称')
      saveData(data); return list
    }
    case 'task_delete_list': {
      if (!data.lists.some(list => list.id === args.id)) throw new Error('列表不存在')
      data.tasks.forEach(task => { if (task.list_id === args.id) { task.list_id = null; task.list_name = null; task.updated_at = stamp() } })
      data.lists = data.lists.filter(list => list.id !== args.id); saveData(data); return
    }
    case 'task_tags': return [...data.tags].sort((a, b) => a.name.localeCompare(b.name))
    case 'task_create_tag': { const tag = getOrCreateTag(data, args.name); saveData(data); return tag }
    case 'task_delete_tag': {
      if (!data.tags.some(tag => tag.id === args.id)) throw new Error('标签不存在')
      data.tags = data.tags.filter(tag => tag.id !== args.id)
      data.tasks.forEach(task => { task.tags = task.tags.filter(tag => tag.id !== args.id) })
      saveData(data); return
    }
    case 'task_overview': {
      const tasks = data.tasks.filter(task => !task.deleted_at), today = localDate()
      return {
        pending_today: tasks.filter(task => task.status === 'pending' && task.due_date && task.due_date <= today).length,
        completed_today: tasks.filter(task => task.status === 'completed' && task.completed_at && localDate(new Date(task.completed_at)) === today).length,
        overdue: tasks.filter(task => task.status === 'pending' && task.due_date && task.due_date < today).length,
      }
    }
    case 'task_import': {
      if (!Array.isArray(args.items)) throw new Error('导入数据必须是任务数组')
      if (args.items.length > 10_000) throw new Error('单次最多导入 10000 条任务')
      const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
      for (const [index, item] of args.items.entries()) {
        // Use a per-item copy so a rejected row cannot leave new lists or tags behind.
        const candidate = structuredClone(data)
        try {
          const normalized = validateImportTask(item)
          if (!normalized.title) throw new Error('任务标题不能为空')
          const list = getOrCreateList(candidate, normalized.list_name)
          const tags = (normalized.tag_names ?? []).map(name => getOrCreateTag(candidate, name))
          const task = buildTask(candidate, {
            ...normalized, list_id: list?.id ?? null, tag_ids: tags.map(tag => tag.id),
            subtasks: (normalized.subtasks ?? []).map((sub, sort_order) => ({ id: newId(), title: sub.title, completed: sub.completed ?? false, sort_order })),
          })
          task.status = normalized.status ?? 'pending'; task.completed_at = task.status === 'completed' ? stamp() : null
          candidate.tasks.push(task)
          data.tasks = candidate.tasks; data.lists = candidate.lists; data.tags = candidate.tags; result.imported++
        } catch (error) { result.skipped++; if (result.errors.length < 8) result.errors.push(`第 ${index + 1} 项：${errorText(error)}`) }
      }
      saveData(data); return result
    }
    case 'task_export': return exportTaskContent(ordered(data.tasks).map(exposed), args.format as ImportFormat)
    case 'task_due_reminders': {
      if (!remindersEnabled()) return []
      const now = currentCivilTime()
      return data.tasks.filter(task => isDue(task, now))
        .sort((a, b) => `${a.due_date} ${a.due_time}`.localeCompare(`${b.due_date} ${b.due_time}`))
        .slice(0, 100).map(task => ({ id: task.id, title: task.title, due_date: task.due_date!, due_time: task.due_time! } satisfies TaskReminder))
    }
    case 'task_acknowledge_reminders': {
      if (!Array.isArray(args.ids) || args.ids.length > 1000 || args.ids.some(id => !validId(id))) throw new Error('提醒 ID 无效，单次最多确认 1000 条')
      if (!remindersEnabled()) return
      const ids = new Set(args.ids)
      const now = currentCivilTime()
      data.tasks.forEach(task => { if (ids.has(task.id) && isDue(task, now)) task.notified_at = stamp() })
      saveData(data); return
    }
    default: throw new Error(`未知任务命令：${command}`)
  }
}
