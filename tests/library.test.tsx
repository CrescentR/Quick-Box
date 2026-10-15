import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import LibraryToolView from '../src/builtin-plugins/library-tool/LibraryToolView'
import StorageSettings from '../src/pages/StorageSettings'
import { invokeCommand } from '../src/api/tauri-api'
import type { LibraryItem } from '../src/api/library-api'

vi.mock('../src/api/tauri-api', () => ({ invokeCommand: vi.fn() }))
const invoke = vi.mocked(invokeCommand)
let records: LibraryItem[]
beforeEach(() => {
  records = []
  invoke.mockReset()
  invoke.mockImplementation(async (command, args) => {
    if (command === 'load_library') return records
    if (command === 'save_library_item') { const item = args?.item as LibraryItem; records = [item, ...records.filter((r) => r.id !== item.id)]; return records }
    if (command === 'delete_library_item') { records = records.filter((r) => r.id !== args?.id); return records }
    if (command === 'get_storage_location') return { path: 'D:\\Original', defaultPath: 'D:\\Original' }
    return undefined
  })
})
it('保存多行命令，重载后可搜索，删除前需确认', async () => {
  const view = render(<LibraryToolView />)
  await waitFor(() => expect((screen.getByText('新建命令') as HTMLButtonElement).disabled).toBe(false))
  fireEvent.change(screen.getByLabelText('标题'), { target: { value: '部署服务' } })
  fireEvent.change(screen.getByLabelText('标签'), { target: { value: 'docker' } })
  fireEvent.change(screen.getByLabelText('命令内容'), { target: { value: 'docker compose build\ndocker compose up -d' } })
  fireEvent.click(screen.getByText('保存命令'))
  await screen.findByText('已保存。')
  expect(records[0].content).toBe('docker compose build\ndocker compose up -d')
  view.unmount(); render(<LibraryToolView />)
  fireEvent.click(await screen.findByRole('button', { name: /部署服务\s*docker/ }))
  expect((screen.getByLabelText('命令内容') as HTMLTextAreaElement).value).toContain('compose up -d')
  fireEvent.change(screen.getByLabelText('搜索命令与文件'), { target: { value: '不存在' } })
  expect(screen.getByText('没有匹配的资料')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '删除', exact: true }))
  expect(records).toHaveLength(1)
  fireEvent.click(screen.getByText('确认删除'))
  await screen.findByText('已删除。'); expect(records).toHaveLength(0)
})
it('保存失败保留草稿并提示错误', async () => {
  render(<LibraryToolView />)
  await waitFor(() => expect((screen.getByText('新建命令') as HTMLButtonElement).disabled).toBe(false))
  fireEvent.change(screen.getByLabelText('标题'), { target: { value: '状态' } })
  fireEvent.change(screen.getByLabelText('命令内容'), { target: { value: 'git status' } })
  invoke.mockRejectedValueOnce({ message: '磁盘已满' })
  fireEvent.click(screen.getByText('保存命令'))
  await screen.findByText('磁盘已满')
  expect((screen.getByLabelText('命令内容') as HTMLTextAreaElement).value).toBe('git status')
  expect((screen.getByText('新建命令') as HTMLButtonElement).disabled).toBe(true)
  expect(records).toHaveLength(0)
})
it('保存文件发送精确字节，超限文件不会上传', async () => {
  render(<LibraryToolView />)
  await waitFor(() => expect((screen.getByText('保存文件') as HTMLButtonElement).disabled).toBe(false))
  const file = new File([new Uint8Array([0, 255, 65])], '配置.bin')
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([0, 255, 65]).buffer })
  fireEvent.change(screen.getByLabelText('选择保存的文件'), { target: { files: [file] } })
  await screen.findByText(/已保存 1 个文件副本/)
  expect(invoke).toHaveBeenCalledWith('save_library_item', expect.objectContaining({ bytes: [0, 255, 65], item: expect.objectContaining({ fileName: '配置.bin', size: 3, kind: 'file' }) }))
  const large = new File([], 'large.zip'); Object.defineProperty(large, 'size', { value: 21 * 1024 * 1024 })
  fireEvent.change(screen.getByLabelText('选择保存的文件'), { target: { files: [large] } })
  await screen.findByText(/超过 20 MB/)
  expect(records).toHaveLength(1)
})
it('允许选择C盘迁移，失败保留当前位置，成功后更新路径', async () => {
  render(<StorageSettings />)
  const input = await screen.findByLabelText('新存储目录')
  expect((input as HTMLInputElement).readOnly).toBe(true)
  invoke.mockResolvedValueOnce('C:\\QuickBox\\data')
  fireEvent.click(screen.getByText('选择文件夹'))
  await waitFor(() => expect((input as HTMLInputElement).value).toBe('C:\\QuickBox\\data'))
  await waitFor(() => expect((screen.getByText('迁移并使用') as HTMLButtonElement).disabled).toBe(false))
  invoke.mockRejectedValueOnce({ message: '请选择空目录' })
  fireEvent.click(screen.getByText('迁移并使用'))
  await screen.findByText('请选择空目录')
  expect(invoke).toHaveBeenCalledWith('set_storage_location', { path: 'C:\\QuickBox\\data' })
  expect(screen.getByText('D:\\Original')).toBeTruthy()
  invoke.mockResolvedValueOnce({ path: 'C:\\QuickBox\\data', defaultPath: 'D:\\Original' })
  fireEvent.click(screen.getByText('迁移并使用'))
  await screen.findByText(/迁移完成/)
  expect(screen.getByText('C:\\QuickBox\\data')).toBeTruthy()
})

it('取消文件夹选择或选择器失败时保留原目录', async () => {
  render(<StorageSettings />)
  const input = await screen.findByLabelText('新存储目录')
  invoke.mockResolvedValueOnce(null)
  fireEvent.click(screen.getByText('选择文件夹'))
  await waitFor(() => expect((screen.getByText('选择文件夹') as HTMLButtonElement).disabled).toBe(false))
  expect((input as HTMLInputElement).value).toBe('D:\\Original')
  invoke.mockRejectedValueOnce({ message: '无法打开文件夹选择器' })
  fireEvent.click(screen.getByText('选择文件夹'))
  await screen.findByText('无法打开文件夹选择器')
  expect((input as HTMLInputElement).value).toBe('D:\\Original')
  expect(invoke.mock.calls.some(([command]) => command === 'set_storage_location')).toBe(false)
})
