import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TaskReminderCenter, TaskReminderWindow } from '../src/app/TaskReminders'
import { taskApi } from '../src/api/task-api'
import { invokeCommand } from '../src/api/tauri-api'
import type { TaskReminder } from '../src/core/tasks/task-types'

const state = vi.hoisted(() => ({ enabledPluginIds: ['official.task-tool'] }))
vi.mock('../src/stores/plugin-store', () => ({ usePluginStore: (selector: (value: typeof state) => unknown) => selector(state) }))
vi.mock('../src/stores/config-store', () => ({ useConfigStore: () => ({ config: { theme: 'dark' }, hydrateConfig: vi.fn() }) }))
vi.mock('../src/app/useAppTheme', () => ({ useAppTheme: vi.fn() }))
vi.mock('../src/api/task-api', () => ({ taskApi: { dueReminders: vi.fn(), acknowledgeReminders: vi.fn() } }))
vi.mock('../src/api/tauri-api', () => ({ invokeCommand: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => vi.fn()) }))
const api = vi.mocked(taskApi)
const notice = (id: string): TaskReminder => ({ id, title: `提醒 ${id}`, due_date: '2026-10-15', due_time: '15:00' })
const nativeWindow = window as Window & { __TAURI_INTERNALS__?: unknown }

beforeEach(() => {
  vi.clearAllMocks()
  state.enabledPluginIds = ['official.task-tool']
  delete nativeWindow.__TAURI_INTERNALS__
  api.dueReminders.mockResolvedValue([notice('a')])
  api.acknowledgeReminders.mockResolvedValue(undefined)
  vi.mocked(invokeCommand).mockResolvedValue(undefined)
})
afterEach(() => { delete nativeWindow.__TAURI_INTERNALS__ })

it('查看提醒定位对应任务，并逐项确认队列', async () => {
  let pending = [notice('a'), notice('b')]
  api.dueReminders.mockImplementation(async () => pending)
  api.acknowledgeReminders.mockImplementation(async ids => { pending = pending.filter(item => !ids.includes(item.id)) })
  const onOpen = vi.fn()
  render(<TaskReminderCenter onOpen={onOpen} />)
  await screen.findByText('提醒 a')
  expect(screen.getByText('另有 1 条')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '查看任务' }))
  await screen.findByText('提醒 b')
  expect(onOpen).toHaveBeenCalledWith('a')
  expect(api.acknowledgeReminders).toHaveBeenCalledWith(['a'])
  fireEvent.click(screen.getByRole('button', { name: '知道了' }))
  await waitFor(() => expect(screen.queryByLabelText('任务提醒')).toBeNull())
})

it('确认写入失败时保留提醒，用户可以重试', async () => {
  api.acknowledgeReminders.mockRejectedValueOnce(new Error('磁盘不可写'))
  render(<TaskReminderCenter onOpen={vi.fn()} />)
  await screen.findByText('提醒 a')
  fireEvent.click(screen.getByRole('button', { name: '知道了' }))
  await screen.findByText('磁盘不可写')
  expect(screen.getByText('提醒 a')).toBeTruthy()
  api.dueReminders.mockResolvedValue([])
  fireEvent.click(screen.getByRole('button', { name: '知道了' }))
  await waitFor(() => expect(screen.queryByLabelText('任务提醒')).toBeNull())
})

it('确认之前发出的迟到查询不会重新显示已确认提醒', async () => {
  let resolveOld!: (items: TaskReminder[]) => void
  api.dueReminders.mockResolvedValueOnce([notice('a')])
    .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    .mockResolvedValue([])
  render(<TaskReminderCenter onOpen={vi.fn()} />)
  await screen.findByText('提醒 a')
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(api.dueReminders).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('button', { name: '知道了' }))
  await waitFor(() => expect(screen.queryByLabelText('任务提醒')).toBeNull())
  await act(async () => { resolveOld([notice('a')]) })
  expect(screen.queryByLabelText('任务提醒')).toBeNull()
})

it('原生主窗打开失败时不消耗提醒', async () => {
  nativeWindow.__TAURI_INTERNALS__ = {}
  vi.mocked(invokeCommand).mockImplementation(async command => {
    if (command === 'task_open_from_reminder') throw new Error('主窗口不可用')
    return undefined as never
  })
  render(<TaskReminderWindow />)
  await screen.findByText('提醒 a')
  fireEvent.click(screen.getByRole('button', { name: '查看任务' }))
  await screen.findByText('主窗口不可用')
  expect(api.acknowledgeReminders).not.toHaveBeenCalled()
  expect(screen.getByText('提醒 a')).toBeTruthy()
})

it('停用任务插件后隐藏提醒，并忽略旧查询结果', async () => {
  let resolveOld!: (items: TaskReminder[]) => void
  api.dueReminders.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  const view = render(<TaskReminderCenter onOpen={vi.fn()} />)
  state.enabledPluginIds = []
  view.rerender(<TaskReminderCenter onOpen={vi.fn()} />)
  await act(async () => { resolveOld([notice('a')]) })
  expect(screen.queryByLabelText('任务提醒')).toBeNull()
  expect(api.acknowledgeReminders).not.toHaveBeenCalled()
})
