import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import BackupSettings, { type BackupFile } from '../src/pages/BackupSettings'
import { invokeCommand } from '../src/api/tauri-api'

vi.mock('../src/api/tauri-api', () => ({ invokeCommand: vi.fn() }))
const invoke = vi.mocked(invokeCommand)
const binary: BackupFile = { id: 'abcd-123', name: '数据库备份.sql.gz', size: 40 * 1024 * 1024, createdAt: Date.now() }
const image: BackupFile = { id: 'abcd-124', name: '产品设计.png', size: 2048, createdAt: Date.now() }
beforeEach(() => {
  invoke.mockReset()
  invoke.mockImplementation(async (command) => command === 'load_backups' ? [] : undefined)
})

it('添加任意类型大文件使用原生选择，不解析JSON，并支持搜索和导出', async () => {
  const view = render(<BackupSettings />)
  await screen.findByText(/暂无备份/)
  expect(view.container.querySelector('input[type="file"]')).toBeNull()
  invoke.mockResolvedValueOnce([binary, image])
  fireEvent.click(screen.getByText('添加备份文件'))
  await screen.findByText('已保存 2 个备份副本。')
  expect(screen.getByText(binary.name)).toBeTruthy()
  expect(screen.getByText(image.name)).toBeTruthy()
  expect(invoke).toHaveBeenCalledWith('add_backup_files')
  fireEvent.change(screen.getByLabelText('搜索备份文件'), { target: { value: 'sql.gz' } })
  expect(screen.queryByText(image.name)).toBeNull()
  invoke.mockResolvedValueOnce('C:\\备份\\数据库备份.sql.gz')
  fireEvent.click(screen.getByText('导出'))
  await screen.findByText(/已导出至 C:/)
  expect(invoke).toHaveBeenCalledWith('export_backup_file', { id: binary.id })
})

it('取消添加保留列表，删除需要确认，失败保留原记录', async () => {
  invoke.mockResolvedValueOnce([binary])
  render(<BackupSettings />)
  await screen.findByText(binary.name)
  invoke.mockResolvedValueOnce([binary])
  fireEvent.click(screen.getByText('添加备份文件'))
  await waitFor(() => expect((screen.getByText('添加备份文件') as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByText('删除'))
  expect(invoke.mock.calls.some(([command]) => command === 'delete_backup_file')).toBe(false)
  invoke.mockRejectedValueOnce({ message: '文件被占用' })
  fireEvent.click(screen.getByText('确认删除备份'))
  await screen.findByText('文件被占用')
  expect(screen.getByText(binary.name)).toBeTruthy()
  invoke.mockResolvedValueOnce([])
  fireEvent.click(screen.getByText('确认删除备份'))
  await screen.findByText('备份副本已删除。')
  expect(screen.queryByText(binary.name)).toBeNull()
})

it('迁移数据后重新读取新目录的备份列表', async () => {
  render(<BackupSettings />)
  await screen.findByText(/暂无备份/)
  invoke.mockResolvedValueOnce([image])
  window.dispatchEvent(new Event('quickbox:storage-changed'))
  await screen.findByText(image.name)
  expect(invoke.mock.calls.filter(([command]) => command === 'load_backups')).toHaveLength(2)
})
