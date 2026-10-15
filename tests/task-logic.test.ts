import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { taskPreview } from '../src/api/task-preview'
import { isValidDate, isValidTime, localDate, nextRecurringDate, parseNaturalTask, relativeDate } from '../src/core/tasks/natural-date'
import { detectImportFormat, exportTaskContent, parseImportContent } from '../src/core/tasks/task-transfer'
import { duplicateFromTask, inputToTemplate, templateToInput } from '../src/core/tasks/task-templates'
import type { ImportResult, Task, TaskList, Tag } from '../src/core/tasks/task-types'

const now = new Date(2026, 9, 15, 12, 0) // Thursday, independent of the machine's time zone.
const KEY = 'quickbox.preview.tasks'
const query = (view: string, search?: string) => taskPreview('task_query', { input: { view, search, limit: 200 } }) as Promise<Task[]>
const create = (input: Record<string, unknown>) => taskPreview('task_create', { input }) as Promise<Task>
const get = (id: string) => taskPreview('task_get', { id }) as Promise<Task | null>

describe('Task natural-language dates', () => {
  it('recognizes Chinese periods, half hours, twenty-three and both Sunday spellings', () => {
    expect(parseNaturalTask('明天下午三点半开会', now)).toEqual({ title: '开会', due_date: '2026-10-16', due_time: '15:30' })
    expect(parseNaturalTask('今晚二十三点发布', now)).toEqual({ title: '发布', due_date: '2026-10-15', due_time: '23:00' })
    expect(parseNaturalTask('晚上二十三点发布', now).due_time).toBe('23:00')
    expect(parseNaturalTask('周天整理', now).due_date).toBe('2026-10-18')
    expect(parseNaturalTask('下星期天整理', now).due_date).toBe('2026-10-25')
    expect(parseNaturalTask('下午3:05处理', now)).toEqual({ title: '处理', due_date: '2026-10-15', due_time: '15:05' })
  })

  it('does not silently roll invalid dates or times into another day', () => {
    expect(parseNaturalTask('2026-02-30 25:90执行', now)).toEqual({ title: '2026-02-30 25:90执行', due_date: null, due_time: null })
    expect(parseNaturalTask('2月30日处理', now).due_date).toBeNull()
    expect(parseNaturalTask('2月30日下午三点处理', now)).toEqual({ title: '2月30日下午三点处理', due_date: null, due_time: null })
    expect(parseNaturalTask('2024-2-29 09:30执行', now)).toEqual({ title: '执行', due_date: '2024-02-29', due_time: '09:30' })
    expect(isValidDate('2025-02-29')).toBe(false)
    expect(isValidDate('2024-02-29')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(localDate(now)).toBe('2026-10-15')
    expect(relativeDate('2026-10-14', now)).toBe('昨天')
  })

  it('clamps recurring month ends and leap days and skips weekends', () => {
    expect(nextRecurringDate('2025-01-31', 'monthly')).toBe('2025-02-28')
    expect(nextRecurringDate('2024-01-31', 'monthly')).toBe('2024-02-29')
    expect(nextRecurringDate('2024-02-29', 'yearly')).toBe('2025-02-28')
    expect(nextRecurringDate('2026-10-16', 'weekdays')).toBe('2026-10-19')
    expect(nextRecurringDate('2026-02-30', 'daily')).toBeNull()
    expect(nextRecurringDate('2011-12-29', 'daily')).toBe('2011-12-30')
    expect(isValidDate('2011-12-30')).toBe(true)
    expect(nextRecurringDate('9999-12-31', 'daily')).toBeNull()
  })
})

describe('Task transfer formats', () => {
  it('accepts original Task exports, preserving named relations and false booleans', () => {
    const items = parseImportContent(JSON.stringify([{
      title: '任务', description: '说明', priority: 2, list_name: '工作', status: 'completed',
      due_date: '2026-10-15', due_time: '14:00', recurrence: 'weekly', reminder_minutes: 0,
      is_pinned: false, tags: [{ id: 'legacy-tag', name: '发布' }],
      subtasks: [{ id: 'legacy-sub', task_id: 'legacy', title: '检查', completed: false, sort_order: 0 }],
    }]), 'json')
    expect(items[0]).toMatchObject({ title: '任务', priority: 2, status: 'completed', reminder_minutes: 0, tag_names: ['发布'], subtasks: [{ title: '检查', completed: false }], is_pinned: false })
  })

  it('rejects invalid rows with their position, never truthifies strings or discards bad rows', () => {
    expect(() => parseImportContent('[null]', 'json')).toThrow('第 1 个任务')
    expect(() => parseImportContent('[{"title":"a","is_pinned":"false"}]', 'json')).toThrow('置顶状态')
    expect(() => parseImportContent('[{"title":"a","due_date":"2026-02-30"}]', 'json')).toThrow('截止日期')
    expect(() => parseImportContent('[{"title":"a","priority":"3"}]', 'json')).toThrow('优先级')
    expect(() => parseImportContent(' '.repeat(8 * 1024 * 1024 + 1), 'json')).toThrow('8 MB')
    expect(parseImportContent('[{"title":""}]', 'json')).toHaveLength(1) // Backend reports the skipped empty title.
  })

  it('handles escaped CSV quotes, embedded commas, multiline text and CRLF', () => {
    const csv = '\uFEFF标题,描述,状态,优先级,列表,日期,时间,标签,创建时间\r\n"检查,发布","第一行\n第二行 ""引号""",pending,2,工作,2026-10-15,14:00,发布;重要,2026-10-15\r\n'
    expect(parseImportContent(csv, 'csv')[0]).toMatchObject({ title: '检查,发布', description: '第一行\n第二行 "引号"', tag_names: ['发布', '重要'], priority: 2 })
    expect(() => parseImportContent('标题,描述\n"未闭合,说明', 'csv')).toThrow('未闭合')
    expect(() => parseImportContent('标题,描述\na,b,c', 'csv')).toThrow('字段数')
  })

  it('imports source Markdown and detects supported extensions', () => {
    expect(parseImportContent('# Task\n\n- [x] 发布 (2026-10-15) — 版本说明\n- [ ] 检查', 'markdown')).toMatchObject([
      { title: '发布', due_date: '2026-10-15', description: '版本说明', status: 'completed' }, { title: '检查', status: 'pending' },
    ])
    expect(detectImportFormat('Task.JSON')).toBe('json')
    expect(detectImportFormat('Task.markdown')).toBe('markdown')
    expect(detectImportFormat('Task.db')).toBeNull()
  })
})

describe('Task browser preview persistence', () => {
  beforeEach(() => { window.localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(now) })
  afterEach(() => vi.useRealTimers())

  it('filters views correctly and searches completed tasks without exposing trash', async () => {
    const list = await taskPreview('task_create_list', { name: '工作' }) as TaskList
    await create({ title: '逾期', due_date: '2026-10-14' })
    await create({ title: '今天', due_date: '2026-10-15', list_id: list.id })
    await create({ title: '未来', due_date: '2026-11-14' })
    await create({ title: '太远', due_date: '2026-11-15' })
    const complete = await create({ title: '已完成搜索词' })
    await taskPreview('task_toggle', { id: complete.id })
    const trash = await create({ title: '回收站搜索词' })
    await taskPreview('task_delete', { id: trash.id })
    expect((await query('today')).map(task => task.title).sort()).toEqual(['今天', '逾期'])
    expect((await query('upcoming')).map(task => task.title)).toEqual(['未来'])
    expect(await query('all')).toHaveLength(4)
    expect((await query('search', '搜索词')).map(task => task.title)).toEqual(['已完成搜索词'])
    expect(await query(`list:${list.id}`)).toHaveLength(1)
    expect(await get(trash.id)).toMatchObject({ title: '回收站搜索词' })
    expect(await get('missing')).toBeNull()
    await expect(get('')).rejects.toThrow('ID')
  })

  it('maintains named relations, subtask states and user sorting through edits and deletes', async () => {
    const list = await taskPreview('task_create_list', { name: '工作' }) as TaskList
    const tag = await taskPreview('task_create_tag', { name: '发布' }) as Tag
    const task = await create({ title: '发布', list_id: list.id, tag_ids: [tag.id], subtasks: [{ id: 'sub-1', title: '测试', completed: true, sort_order: 0 }] })
    const other = await create({ title: '整理', priority: 4 })
    await taskPreview('task_reorder', { orderedIds: [other.id, task.id], draggedId: other.id, priority: 1 })
    expect((await query('all'))[0].id).toBe(other.id)
    expect(await query(`tag:${tag.id}`)).toHaveLength(1)
    await taskPreview('task_delete_list', { id: list.id })
    await taskPreview('task_delete_tag', { id: tag.id })
    expect(await get(task.id)).toMatchObject({ list_id: null, list_name: null, tags: [], subtasks: [{ completed: true }] })
    await taskPreview('task_delete', { id: task.id })
    await taskPreview('task_restore', { id: task.id })
    expect(await get(task.id)).toMatchObject({ deleted_at: null })
    await expect(taskPreview('task_purge', { id: task.id })).rejects.toThrow('回收站')
    await taskPreview('task_delete', { id: task.id }); await taskPreview('task_purge', { id: task.id })
    expect(await get(task.id)).toBeNull()
  })

  it('generates one next recurrence, resets subtasks and avoids duplicates after undo', async () => {
    const task = await create({ title: '月末', due_date: '2024-01-31', recurrence: 'monthly', subtasks: [{ id: 'sub', title: '检查', completed: true, sort_order: 0 }] })
    await taskPreview('task_toggle', { id: task.id })
    let pending = await query('all')
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ due_date: '2024-02-29', subtasks: [{ completed: false }] })
    expect(pending[0].subtasks[0].id).not.toBe('sub')
    await taskPreview('task_toggle', { id: task.id }); await taskPreview('task_toggle', { id: task.id })
    pending = await query('all')
    expect(pending).toHaveLength(1)
  })

  it('reports import failures, preserves old data and round-trips original Task JSON', async () => {
    await create({ title: '原有' })
    const result = await taskPreview('task_import', { items: [{ title: '导入', list_name: '工作', tag_names: ['发布'], subtasks: [{ title: '测试', completed: true }] }, { title: '' }, { title: '坏日期', due_date: '2026-02-30' }] }) as ImportResult
    expect(result).toMatchObject({ imported: 1, skipped: 2 })
    const exported = await taskPreview('task_export', { format: 'json' }) as string
    expect(parseImportContent(exported, 'json')).toHaveLength(2)
    expect(exported).not.toContain('notified_at')
    const csv = exportTaskContent(await query('all'), 'csv')
    expect(parseImportContent(csv, 'csv')).toHaveLength(2)
  })

  it('acknowledges reminders once and resets them when the schedule changes', async () => {
    const task = await create({ title: '提醒', due_date: '2026-10-15', due_time: '12:05', reminder_minutes: 5 })
    expect(await taskPreview('task_due_reminders')).toHaveLength(1)
    await taskPreview('task_acknowledge_reminders', { ids: [task.id] })
    expect(await taskPreview('task_due_reminders')).toHaveLength(0)
    await taskPreview('task_update', { id: task.id, input: { title: '提醒', due_date: '2026-10-15', due_time: '12:06', reminder_minutes: 15 } })
    expect(await taskPreview('task_due_reminders')).toHaveLength(1)
    window.localStorage.setItem('quickbox.preview.pluginStates', JSON.stringify([{ id: 'official.task-tool', source: 'builtin', enabled: false }]))
    expect(await taskPreview('task_due_reminders')).toHaveLength(0)
    window.localStorage.removeItem('quickbox.preview.pluginStates')
    await taskPreview('task_delete', { id: task.id })
    expect(await taskPreview('task_due_reminders')).toHaveLength(0)
  })

  it('expires trash at 30 days and never overwrites corrupt data', async () => {
    const task = await create({ title: '旧任务' })
    await taskPreview('task_delete', { id: task.id })
    vi.setSystemTime(new Date(now.getTime() + 31 * 86_400_000))
    expect(await query('trash')).toHaveLength(0)
    for (const damaged of ['{broken', '{"version":1,"tasks":[],"lists":null,"tags":[]}', '{"version":1,"tasks":[{}],"lists":[],"tags":[]}']) {
      window.localStorage.setItem(KEY, damaged)
      await expect(create({ title: '不能覆盖' })).rejects.toThrow('原始数据已保留')
      expect(window.localStorage.getItem(KEY)).toBe(damaged)
    }
  })

  it('does not consume a future or disabled reminder when an older popup acknowledges its id', async () => {
    const task = await create({ title: '改期的任务', due_date: '2026-10-15', due_time: '12:00', reminder_minutes: 0 })
    expect(await taskPreview('task_due_reminders')).toHaveLength(1)
    await taskPreview('task_update', { id: task.id, input: { title: task.title, due_date: '2026-10-15', due_time: '13:00', reminder_minutes: 0 } })
    await taskPreview('task_acknowledge_reminders', { ids: [task.id] })
    expect(JSON.parse(window.localStorage.getItem(KEY)!).tasks[0].notified_at).toBeNull()
    expect(await taskPreview('task_due_reminders')).toHaveLength(0)
    vi.setSystemTime(new Date(now.getTime() + 60 * 60_000))
    expect(await taskPreview('task_due_reminders')).toHaveLength(1)
    window.localStorage.setItem('quickbox.preview.pluginStates', JSON.stringify([{ id: 'official.task-tool', source: 'builtin', enabled: false }]))
    await taskPreview('task_acknowledge_reminders', { ids: [task.id] })
    expect(JSON.parse(window.localStorage.getItem(KEY)!).tasks[0].notified_at).toBeNull()
    window.localStorage.removeItem('quickbox.preview.pluginStates')
    expect(await taskPreview('task_due_reminders')).toHaveLength(1)
  })

  it('uses only its own preview settings namespace and duplicates with new incomplete subtasks', async () => {
    window.localStorage.setItem('task.web.data', 'legacy-data')
    window.localStorage.setItem('setting.theme', 'legacy-theme')
    await taskPreview('task_set_setting', { key: 'theme', value: 'dark' })
    expect(await taskPreview('task_get_setting', { key: 'theme' })).toBe('dark')
    expect(window.localStorage.getItem('setting.theme')).toBe('legacy-theme')
    expect(window.localStorage.getItem('task.web.data')).toBe('legacy-data')
    const task = await create({ title: '任务', due_date: '2026-10-14', due_time: '09:00', reminder_minutes: 5, recurrence: 'weekly', is_pinned: true, subtasks: [{ id: 'dup-sub', title: '检查', completed: true, sort_order: 0 }] })
    const copy = duplicateFromTask(task)
    expect(copy).toMatchObject({ is_pinned: false, due_date: null, due_time: null, reminder_minutes: null, recurrence: null, subtasks: [{ completed: false }] })
    expect(copy.subtasks?.[0].id).not.toBe('dup-sub')
    expect(templateToInput(inputToTemplate({ title: task.title, due_date: task.due_date, due_time: task.due_time, reminder_minutes: task.reminder_minutes, recurrence: task.recurrence }))).toMatchObject({ due_date: null, due_time: null, reminder_minutes: null, recurrence: null })
    expect(await create(copy as unknown as Record<string, unknown>)).toMatchObject({ title: '任务', due_date: null })
  })
})
