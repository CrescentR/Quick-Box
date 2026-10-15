import { taskApi } from '../../api/task-api'
import type { Task, TaskInput, TaskTemplate } from './task-types'
import { localDate } from './natural-date'
import { validateImportTask } from './task-transfer'

const TEMPLATE_KEY = 'recent_task_templates'
const MAX_TEMPLATES = 12

function signature(input: Omit<TaskInput, 'subtasks'> & { subtasks?: { title: string }[] }) {
  return JSON.stringify({
    title: input.title.trim(), description: input.description?.trim() ?? '', priority: input.priority ?? 4,
    list_id: input.list_id ?? null, due_date: input.due_date ?? null, due_time: input.due_time ?? null,
    reminder_minutes: input.reminder_minutes ?? null, recurrence: input.recurrence ?? null,
    tag_ids: [...(input.tag_ids ?? [])].sort(), subtasks: (input.subtasks ?? []).map(sub => sub.title.trim()).filter(Boolean),
  })
}

export function duplicateFromTask(task: Task): TaskInput {
  const due_date = task.due_date && task.due_date >= localDate() ? task.due_date : null
  return {
    title: task.title, description: task.description, priority: task.priority, list_id: task.list_id,
    due_date, due_time: due_date ? task.due_time : null,
    reminder_minutes: due_date ? task.reminder_minutes : null, recurrence: due_date ? task.recurrence : null,
    is_pinned: false, tag_ids: task.tags.map(tag => tag.id),
    subtasks: task.subtasks.filter(sub => sub.title.trim()).map((sub, sort_order) => ({
      id: crypto.randomUUID(), title: sub.title.trim(), completed: false, sort_order,
    })),
  }
}

export function templateToInput(template: TaskTemplate): TaskInput {
  const due_date = template.due_date && template.due_date >= localDate() ? template.due_date : null
  return {
    title: template.title, description: template.description, priority: template.priority, list_id: template.list_id,
    due_date, due_time: due_date ? template.due_time : null,
    reminder_minutes: due_date ? template.reminder_minutes : null, recurrence: due_date ? template.recurrence : null,
    is_pinned: false, tag_ids: [...template.tag_ids],
    subtasks: template.subtasks.map((sub, sort_order) => ({ id: crypto.randomUUID(), title: sub.title, completed: false, sort_order })),
  }
}

export function inputToTemplate(input: TaskInput): TaskTemplate {
  return {
    id: crypto.randomUUID(), title: input.title.trim(), description: input.description?.trim() ?? '',
    priority: input.priority ?? 4, list_id: input.list_id ?? null, due_date: input.due_date ?? null,
    due_time: input.due_time ?? null, reminder_minutes: input.reminder_minutes ?? null,
    recurrence: input.recurrence ?? null, tag_ids: [...(input.tag_ids ?? [])],
    subtasks: (input.subtasks ?? []).filter(sub => sub.title.trim()).map(sub => ({ title: sub.title.trim() })),
    used_at: new Date().toISOString(),
  }
}

export async function loadRecentTemplates(): Promise<TaskTemplate[]> {
  const raw = await taskApi.setting(TEMPLATE_KEY)
  if (!raw) return []
  let items: unknown
  try { items = JSON.parse(raw) } catch { throw new Error('最近任务模板数据已损坏，原数据已保留') }
  if (!Array.isArray(items) || items.some(item => !item || typeof item !== 'object' ||
    typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.description !== 'string' ||
    !Number.isInteger(item.priority) || item.priority < 1 || item.priority > 4 ||
    !Array.isArray(item.tag_ids) || item.tag_ids.some((id: unknown) => typeof id !== 'string') ||
    !Array.isArray(item.subtasks) || item.subtasks.some((sub: { title?: unknown } | null) => !sub || typeof sub.title !== 'string'))) {
    throw new Error('最近任务模板格式无效，原数据已保留')
  }
  for (const item of items) {
    try {
      const normalized = validateImportTask(item)
      if (!normalized.title || (item.list_id !== null && (typeof item.list_id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.list_id))) ||
        !('due_date' in item) || !('due_time' in item) || !('reminder_minutes' in item) || !('recurrence' in item) ||
        typeof item.used_at !== 'string' || !Number.isFinite(new Date(item.used_at).getTime()) ||
        (item.due_time && !item.due_date) || (item.reminder_minutes !== null && (!item.due_date || !item.due_time)) ||
        (item.recurrence && !item.due_date)) throw new Error('invalid template')
    } catch { throw new Error('最近任务模板格式无效，原数据已保留') }
  }
  return items.slice(0, MAX_TEMPLATES) as TaskTemplate[]
}

// Serialize writes so closely spaced creates do not discard a more recent template.
let templateWrites: Promise<void> = Promise.resolve()
export function rememberTaskTemplate(input: TaskInput): Promise<void> {
  if (!input.title.trim()) return Promise.resolve()
  templateWrites = templateWrites.catch(() => undefined).then(async () => {
    const template = inputToTemplate(input)
    const existing = await loadRecentTemplates()
    const filtered = existing.filter(item => signature(item) !== signature(input))
    await taskApi.setSetting(TEMPLATE_KEY, JSON.stringify([template, ...filtered].slice(0, MAX_TEMPLATES)))
  })
  return templateWrites
}
