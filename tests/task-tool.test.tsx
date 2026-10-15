import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import TaskToolView from '../src/builtin-plugins/task-tool/TaskToolView'
import { taskApi } from '../src/api/task-api'
import type { Task, TaskInput, TaskList, Tag, QueryInput } from '../src/core/tasks/task-types'
import { localDate } from '../src/core/tasks/natural-date'
import { ToolViewPane } from '../src/pages/launcher/components/ToolViewPane'
import { pluginRegistry } from '../src/core/plugin/plugin-registry'

vi.mock('../src/api/task-api', () => ({ taskApi: {
  query: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), toggle: vi.fn(), delete: vi.fn(), restore: vi.fn(), purge: vi.fn(), reorder: vi.fn(), lists: vi.fn(), createList: vi.fn(), deleteList: vi.fn(), tags: vi.fn(), createTag: vi.fn(), deleteTag: vi.fn(), overview: vi.fn(), importTasks: vi.fn(), export: vi.fn(), setting: vi.fn(), setSetting: vi.fn(),
} }))
const api = vi.mocked(taskApi)
const makeTask = (input: Partial<Task> = {}): Task => ({ id: 'task-a', title: '上线检查', description: '', status: 'pending', priority: 4, sort_order: 0, list_id: null, list_name: null, due_date: localDate(), due_time: null, reminder_minutes: null, recurrence: null, is_pinned: false, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, tags: [], subtasks: [], ...input })
let records: Task[]
let lists: TaskList[]
let tags: Tag[]
const fromInput = (input: TaskInput, id = crypto.randomUUID()): Task => makeTask({ ...input, id, priority: (input.priority ?? 4) as Task['priority'], list_name: lists.find(list => list.id === input.list_id)?.name ?? null, tags: tags.filter(tag => input.tag_ids?.includes(tag.id)), subtasks: input.subtasks?.map(sub => ({ ...sub, task_id: id })) ?? [] })

beforeEach(() => {
  vi.clearAllMocks(); pluginRegistry.clear(); records = []; lists = []; tags = []
  api.query.mockImplementation(async ({ view, search, limit = 100, offset = 0 }: QueryInput) => records.filter(task => {
    if (view === 'trash') return !!task.deleted_at
    if (task.deleted_at) return false
    if (view === 'search') return !search || `${task.title} ${task.description}`.includes(search)
    if (view === 'completed') return task.status === 'completed'
    if (task.status === 'completed') return false
    if (view === 'today') return !!task.due_date && task.due_date <= localDate()
    if (view === 'inbox') return !task.list_id
    if (view.startsWith('list:')) return task.list_id === view.slice(5)
    if (view.startsWith('tag:')) return task.tags.some(tag => tag.id === view.slice(4))
    return true
  }).slice(offset, offset + limit))
  api.get.mockImplementation(async id => records.find(task => task.id === id) ?? null)
  api.lists.mockImplementation(async () => lists)
  api.tags.mockImplementation(async () => tags)
  api.overview.mockResolvedValue({ pending_today: 0, completed_today: 0, overdue: 0 })
  api.setting.mockResolvedValue(null); api.setSetting.mockResolvedValue(undefined)
  api.create.mockImplementation(async input => { const task = fromInput(input); records.push(task); return task })
  api.update.mockImplementation(async (id, input) => { const index = records.findIndex(task => task.id === id); const task = { ...records[index], ...fromInput(input, id) }; records[index] = task; return task })
  api.toggle.mockImplementation(async id => { const task = records.find(item => item.id === id)!; task.status = task.status === 'completed' ? 'pending' : 'completed' })
  api.delete.mockImplementation(async id => { records.find(task => task.id === id)!.deleted_at = new Date().toISOString() })
  api.restore.mockImplementation(async id => { records.find(task => task.id === id)!.deleted_at = null })
  api.purge.mockImplementation(async id => { records = records.filter(task => task.id !== id) })
  api.createList.mockImplementation(async name => { const list = { id: crypto.randomUUID(), name, icon: 'list', sort_order: lists.length }; lists.push(list); return list })
  api.createTag.mockImplementation(async name => { const tag = { id: crypto.randomUUID(), name }; tags.push(tag); return tag })
  api.deleteList.mockImplementation(async id => { lists = lists.filter(list => list.id !== id) })
  api.deleteTag.mockImplementation(async id => { tags = tags.filter(tag => tag.id !== id) })
  api.importTasks.mockResolvedValue({ imported: 1, skipped: 1, errors: ['第 2 项标题为空'] })
  api.export.mockResolvedValue('[]'); api.reorder.mockResolvedValue(undefined)
})
const ready = async () => waitFor(() => expect((screen.getByRole('button', { name: '新建任务' }) as HTMLButtonElement).disabled).toBe(false))

it('自然语言快建保留识别的日期时间，失败后保留原始输入可重试', async () => {
  render(<TaskToolView />); await ready()
  const input = screen.getByLabelText('快速添加任务')
  fireEvent.change(input, { target: { value: '明天下午三点开会' } })
  expect(screen.getByText('开会')).toBeTruthy()
  api.create.mockRejectedValueOnce(new Error('磁盘已满'))
  fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }))
  await screen.findByRole('alert'); expect((input as HTMLInputElement).value).toBe('明天下午三点开会')
  fireEvent.click(screen.getByRole('button', { name: '添加', exact: true }))
  await screen.findByText('任务已创建。')
  expect(api.create).toHaveBeenLastCalledWith(expect.objectContaining({ title: '开会', due_time: '15:00' }))
  expect(records[0].due_date! > localDate()).toBe(true)
  expect((input as HTMLInputElement).value).toBe('')
})

it('详情显式保存优先级、重复提醒和子任务，保存失败不丢草稿，放弃后可切换', async () => {
  render(<TaskToolView />); await ready()
  fireEvent.click(screen.getByRole('button', { name: '新建任务' }))
  fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '每周复盘' } })
  fireEvent.change(screen.getByLabelText('截止日期'), { target: { value: '2030-05-12' } })
  fireEvent.change(screen.getByLabelText('截止时间'), { target: { value: '15:30' } })
  fireEvent.change(screen.getByLabelText('到期提醒'), { target: { value: '15' } })
  fireEvent.change(screen.getByLabelText('重复规则'), { target: { value: 'weekly' } })
  fireEvent.change(screen.getByLabelText('优先级'), { target: { value: '1' } })
  fireEvent.click(screen.getByLabelText('置顶此任务'))
  fireEvent.click(screen.getByRole('button', { name: '添加子任务' }))
  fireEvent.change(screen.getByLabelText('子任务 1', { exact: true }), { target: { value: '汇总进度' } })
  fireEvent.click(screen.getByLabelText('完成子任务 1'))
  expect((screen.getByRole('button', { name: '收集箱', exact: true }) as HTMLButtonElement).disabled).toBe(true)
  expect(api.create).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '保存任务' }))
  await screen.findByText('任务已保存。')
  expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ title: '每周复盘', priority: 1, is_pinned: true, due_date: '2030-05-12', due_time: '15:30', reminder_minutes: 15, recurrence: 'weekly', subtasks: [expect.objectContaining({ title: '汇总进度', completed: true })] }))
  fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '还没保存的复盘' } })
  api.update.mockRejectedValueOnce(new Error('无法写入数据库'))
  fireEvent.click(screen.getByRole('button', { name: '保存任务' }))
  await screen.findByText('无法写入数据库')
  expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe('还没保存的复盘')
  fireEvent.click(screen.getByRole('button', { name: '放弃修改' }))
  expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe('每周复盘')
  expect((screen.getByRole('button', { name: '收集箱', exact: true }) as HTMLButtonElement).disabled).toBe(false)
})

it('完成、撤销、软删与恢复对应视图，永久删除必须再次确认', async () => {
  records = [makeTask()]; render(<TaskToolView />); await ready()
  fireEvent.click(await screen.findByRole('button', { name: '完成 上线检查', exact: true }))
  await screen.findByText('任务已完成。'); expect(records[0].status).toBe('completed')
  fireEvent.click(screen.getByRole('button', { name: '已完成', exact: true }))
  fireEvent.click(await screen.findByRole('button', { name: '撤销完成 上线检查' }))
  await screen.findByText('已撤销完成。'); expect(records[0].status).toBe('pending')
  fireEvent.click(screen.getByRole('button', { name: '今天', exact: true }))
  fireEvent.click(await screen.findByRole('button', { name: '删除 上线检查', exact: true }))
  expect(api.delete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '确认删除', exact: true }))
  await screen.findByText('任务已移入回收站。')
  fireEvent.click(screen.getByRole('button', { name: '回收站', exact: true }))
  fireEvent.click(await screen.findByRole('button', { name: '恢复 上线检查' }))
  await screen.findByText('任务已恢复。'); expect(records[0].deleted_at).toBe(null)
  records[0].deleted_at = new Date().toISOString()
  fireEvent.click(screen.getByRole('button', { name: '刷新', exact: true }))
  fireEvent.click(await screen.findByRole('button', { name: '永久删除 上线检查' }))
  expect(api.purge).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '确认永久删除' }))
  await screen.findByText('已删除。'); expect(records).toHaveLength(0)
})

it('任务复制先生成独立草稿，未保存前不会创建第二条任务', async () => {
  records = [makeTask({ subtasks: [{ id: 'sub-a', task_id: 'task-a', title: '验证结果', completed: true, sort_order: 0 }] })]
  render(<TaskToolView />); await ready()
  fireEvent.click(await screen.findByRole('button', { name: /上线检查P4/ }))
  fireEvent.click(screen.getByRole('button', { name: '复制任务' }))
  expect(api.create).not.toHaveBeenCalled()
  expect((screen.getByLabelText('完成子任务 1') as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '保存任务' }))
  await screen.findByText('任务已保存。'); expect(records).toHaveLength(2)
  expect(records[1].subtasks[0].id).not.toBe('sub-a')
})

it('导入兼容 Task JSON，超限文件不读取并显示逐项导入结果', async () => {
  render(<TaskToolView />); await ready()
  fireEvent.click(screen.getByRole('button', { name: '导入和导出' }))
  const upload = screen.getByLabelText('导入任务文件')
  const large = new File([], 'tasks.json'); Object.defineProperty(large, 'size', { value: 8 * 1024 * 1024 + 1 })
  fireEvent.change(upload, { target: { files: [large] } })
  await screen.findByText(/导入文件不能超过 8 MB/); expect(api.importTasks).not.toHaveBeenCalled()
  const file = new File([], 'task-export.json')
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify([makeTask({ title: '从原 Task 迁移', list_name: '工作', tags: [{ id: 'tag-a', name: '发布' }] })]) })
  fireEvent.change(upload, { target: { files: [file] } })
  await screen.findByText(/导入完成：新增 1 项，跳过 1 项。.*标题为空/)
  expect(api.importTasks).toHaveBeenCalledWith([expect.objectContaining({ title: '从原 Task 迁移', list_name: '工作', tag_names: ['发布'] })])
})

it('管理列表与标签，删除分类需确认且不删除任务', async () => {
  render(<TaskToolView />); await ready()
  fireEvent.click(screen.getByRole('button', { name: '管理列表和标签' }))
  fireEvent.change(screen.getByLabelText('新列表名称'), { target: { value: '工作' } })
  fireEvent.click(screen.getByRole('button', { name: '创建列表' }))
  await screen.findByText('列表已创建。')
  fireEvent.change(screen.getByLabelText('新标签名称'), { target: { value: '发布' } })
  fireEvent.click(screen.getByRole('button', { name: '创建标签' }))
  await screen.findByText('标签已创建。')
  fireEvent.click(screen.getByRole('button', { name: '删除列表 工作' }))
  expect(api.deleteList).not.toHaveBeenCalled(); expect(screen.getByText(/中的任务会移回收集箱/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '确认删除' }))
  await screen.findByText('已删除。'); expect(api.deleteList).toHaveBeenCalledWith(expect.any(String)); expect(api.delete).not.toHaveBeenCalled()
})

it('提醒按 id 直达详情，不受头一页和今天过滤影响', async () => {
  const task = makeTask({ id: 'hidden-task', title: '下个月要做的事', due_date: '2030-05-12' })
  records = [task]
  render(<TaskToolView params={{ taskId: task.id, requestId: 'notice-1' }} />)
  await screen.findByLabelText('任务标题')
  expect(api.get).toHaveBeenCalledWith('hidden-task')
  expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe(task.title)
})

it('提醒跳转遇到未保存编辑时等待用户处理，不能覆盖草稿', async () => {
  records = [makeTask(), makeTask({ id: 'task-b', title: '另一条提醒任务' })]
  const page = render(<TaskToolView />); await ready()
  fireEvent.click(await screen.findByRole('button', { name: /上线检查P4/ }))
  fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '这条内容还没保存' } })
  page.rerender(<TaskToolView params={{ taskId: 'task-b', requestId: 'notice-2' }} />)
  await screen.findByText('请先保存或放弃当前修改，再打开提醒中的任务。')
  expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe('这条内容还没保存')
  expect(api.get).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '放弃修改' }))
  await waitFor(() => expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe('另一条提醒任务'))
})

it('跨相邻优先级上移任务会调整优先级，置顶和普通任务之间禁止移动', async () => {
  records = [makeTask({ id: 'pinned', title: '置顶任务', is_pinned: true, priority: 4 }), makeTask({ id: 'high', title: '重要任务', priority: 1 }), makeTask({ id: 'ordinary', title: '普通任务', priority: 3 })]
  render(<TaskToolView />); await ready()
  expect((await screen.findByRole('button', { name: '上移 重要任务' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '上移 普通任务' }))
  await screen.findByText('任务顺序已调整。')
  expect(api.reorder).toHaveBeenCalledWith(['pinned', 'ordinary', 'high'], 'ordinary', 1)
})

it('复用旧模板移除已删除的列表和标签引用，仍需显式保存', async () => {
  api.setting.mockResolvedValue(JSON.stringify([{ id: 'old-template', title: '部署模板', description: '', priority: 2, list_id: 'deleted-list', due_date: null, due_time: null, reminder_minutes: null, recurrence: null, tag_ids: ['deleted-tag'], subtasks: [], used_at: new Date().toISOString() }]))
  render(<TaskToolView />); await ready()
  fireEvent.click(await screen.findByRole('button', { name: '部署模板' }))
  expect((screen.getByLabelText('所属列表') as HTMLSelectElement).value).toBe('')
  expect(api.create).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '保存任务' }))
  await screen.findByText('任务已保存。')
  expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ list_id: null, tag_ids: [] }))
})

it('真实工具宿主收到新提醒 requestId 时保留任务实例与草稿，处理草稿后才跳转', async () => {
  records = [makeTask({ id: 'reminded', title: '提醒中的任务' })]
  pluginRegistry.register({ id: 'official.task-tool', name: '任务管理', version: '1.0.0', source: 'builtin', permissions: [], commands: [], views: [{ id: 'official.task-tool.view', title: '任务管理', component: TaskToolView }] })
  const props = { viewId: 'official.task-tool.view', isQuick: false, onToggleQuick: vi.fn(), onOpenActions: vi.fn() }
  const host = render(<ToolViewPane {...props} params={{ requestId: 'first-open' }} />); await ready()
  fireEvent.click(screen.getByRole('button', { name: '新建任务' }))
  fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '不能被宿主重挂丢掉的草稿' } })
  host.rerender(<ToolViewPane {...props} params={{ requestId: 'reminder-open', taskId: 'reminded' }} />)
  await screen.findByText('请先保存或放弃当前修改，再打开提醒中的任务。')
  expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe('不能被宿主重挂丢掉的草稿')
  expect(api.get).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '放弃修改' }))
  await waitFor(() => expect((screen.getByLabelText('任务标题') as HTMLInputElement).value).toBe('提醒中的任务'))
})

it('其他工具的新 requestId 保留原有重置行为，不能复用上次请求的输入', () => {
  function RequestTool() {
    const [input, setInput] = useState('')
    return <input aria-label="其他工具输入" value={input} onChange={event => setInput(event.target.value)} />
  }
  pluginRegistry.register({ id: 'official.fixture', name: '其他工具', version: '1.0.0', source: 'builtin', permissions: [], commands: [], views: [{ id: 'official.fixture.view', title: '其他工具', component: RequestTool }] })
  const props = { viewId: 'official.fixture.view', isQuick: false, onToggleQuick: vi.fn(), onOpenActions: vi.fn() }
  const host = render(<ToolViewPane {...props} params={{ requestId: 'request-a' }} />)
  fireEvent.change(screen.getByLabelText('其他工具输入'), { target: { value: '上次请求留下的内容' } })
  host.rerender(<ToolViewPane {...props} params={{ requestId: 'request-b' }} />)
  expect((screen.getByLabelText('其他工具输入') as HTMLInputElement).value).toBe('')
})
