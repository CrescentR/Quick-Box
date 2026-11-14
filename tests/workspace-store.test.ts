import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBackup, emptyWorkspace, mergeWorkspace, readBackup } from '../src/core/workspace/workspace-data'
const api = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('../src/api/tauri-api', () => ({ invokeCommand: api.invoke }))
beforeEach(() => { vi.resetModules(); api.invoke.mockReset(); localStorage.clear() })
describe('工作台持久化', () => {
  it('旧收藏只迁移一次；写入失败不标记就绪、不移除旧数据', async () => {
    localStorage.setItem('quickbox.launcher.quickCommandIds', '["json","json","port"]')
    api.invoke.mockImplementation(async (command) => { if (command === 'load_workspace') return null; throw new Error('disk full') })
    const { useWorkspaceStore } = await import('../src/stores/workspace-store')
    await expect(useWorkspaceStore.getState().hydrate()).rejects.toThrow('disk full')
    expect(useWorkspaceStore.getState().ready).toBe(false)
    expect(localStorage.getItem('quickbox.launcher.quickCommandIds')).toContain('json')
    api.invoke.mockImplementation(async (command) => command === 'load_workspace' ? null : undefined)
    await useWorkspaceStore.getState().hydrate()
    expect(useWorkspaceStore.getState().data.quickCommandIds).toEqual(['json', 'port'])
  })
  it('串行修改以最新数据为基础，写入失败保留之前成功的数据', async () => {
    api.invoke.mockImplementation(async (command) => command === 'load_workspace' ? emptyWorkspace() : undefined)
    const { useWorkspaceStore } = await import('../src/stores/workspace-store')
    await useWorkspaceStore.getState().hydrate()
    await Promise.all([
      useWorkspaceStore.getState().update((data) => ({ ...data, quickCommandIds: [...data.quickCommandIds, 'json'] })),
      useWorkspaceStore.getState().update((data) => ({ ...data, quickCommandIds: [...data.quickCommandIds, 'port'] })),
    ])
    expect(useWorkspaceStore.getState().data.quickCommandIds).toEqual(['json', 'port'])
    api.invoke.mockRejectedValue(new Error('write failed'))
    await expect(useWorkspaceStore.getState().update((data) => ({ ...data, quickCommandIds: [] }))).rejects.toThrow()
    expect(useWorkspaceStore.getState().data.quickCommandIds).toEqual(['json', 'port'])
  })
  it('工作台备份导出、SHA-256 校验解析与增量合并保留双方数据', async () => {
    const local = {
      ...emptyWorkspace(),
      quickCommandIds: ['official.json-tool.open'],
      snippets: [{ id: 's1', title: 'Local', content: 'echo 1', language: 'shell', tags: 'dev', updatedAt: '2026-01-01T00:00:00Z' }],
    }
    const incoming = {
      ...emptyWorkspace(),
      quickCommandIds: ['official.timestamp-tool.open'],
      snippets: [{ id: 's2', title: 'Incoming', content: 'echo 2', language: 'shell', tags: 'ops', updatedAt: '2026-01-02T00:00:00Z' }],
    }
    const backup = await createBackup(incoming)
    const parsed = await readBackup(backup)
    const merged = mergeWorkspace(local, parsed)
    expect(merged.quickCommandIds).toEqual(['official.timestamp-tool.open', 'official.json-tool.open'])
    expect(merged.snippets.map((s) => s.id)).toEqual(['s1', 's2'])
  })
})
