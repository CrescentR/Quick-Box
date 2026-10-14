import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyWorkspace } from '../src/core/workspace/workspace-data'
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
})
