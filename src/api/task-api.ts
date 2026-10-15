import { invokeCommand } from './tauri-api'
import type {
  ImportResult, ImportTaskItem, Overview, QueryInput, Tag, Task, TaskInput,
  TaskList, TaskReminder,
} from '../core/tasks/task-types'
import type { ImportFormat } from '../core/tasks/task-transfer'

async function mutate<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const response = await invokeCommand<T>(command, args)
  window.dispatchEvent(new Event('quickbox:tasks-changed'))
  return response
}

export const taskApi = {
  query: (input: QueryInput) => invokeCommand<Task[]>('task_query', { input }),
  get: (id: string) => invokeCommand<Task | null>('task_get', { id }),
  create: (input: TaskInput) => mutate<Task>('task_create', { input }),
  update: (id: string, input: TaskInput) => mutate<Task>('task_update', { id, input }),
  toggle: (id: string) => mutate<void>('task_toggle', { id }),
  delete: (id: string) => mutate<void>('task_delete', { id }),
  restore: (id: string) => mutate<void>('task_restore', { id }),
  purge: (id: string) => mutate<void>('task_purge', { id }),
  reorder: (orderedIds: string[], draggedId: string, priority: number) =>
    mutate<void>('task_reorder', { orderedIds, draggedId, priority }),
  lists: () => invokeCommand<TaskList[]>('task_lists'),
  createList: (name: string) => mutate<TaskList>('task_create_list', { name }),
  deleteList: (id: string) => mutate<void>('task_delete_list', { id }),
  tags: () => invokeCommand<Tag[]>('task_tags'),
  createTag: (name: string) => mutate<Tag>('task_create_tag', { name }),
  deleteTag: (id: string) => mutate<void>('task_delete_tag', { id }),
  overview: () => invokeCommand<Overview>('task_overview'),
  importTasks: (items: ImportTaskItem[]) => mutate<ImportResult>('task_import', { items }),
  export: (format: ImportFormat) => invokeCommand<string>('task_export', { format }),
  setting: (key: string) => invokeCommand<string | null>('task_get_setting', { key }),
  setSetting: (key: string, value: string) => invokeCommand<void>('task_set_setting', { key, value }),
  dueReminders: () => invokeCommand<TaskReminder[]>('task_due_reminders'),
  acknowledgeReminders: (ids: string[]) => mutate<void>('task_acknowledge_reminders', { ids }),
}
