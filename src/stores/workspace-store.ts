import { create } from 'zustand'
import { invokeCommand } from '../api/tauri-api'
import { emptyWorkspace, validateWorkspace, type WorkspaceData } from '../core/workspace/workspace-data'

const legacyKey = 'quickbox.launcher.quickCommandIds'
let hydration: Promise<void> | undefined
let writes = Promise.resolve()
interface WorkspaceState {
  data: WorkspaceData
  ready: boolean
  saving: boolean
  error?: string
  hydrate: () => Promise<void>
  update: (change: (current: WorkspaceData) => WorkspaceData) => Promise<void>
}
export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  data: emptyWorkspace(), ready: false, saving: false,
  hydrate: () => {
    if (get().ready) return Promise.resolve()
    if (hydration) return hydration
    hydration = (async () => {
      try {
        const raw = await invokeCommand<WorkspaceData | null>('load_workspace')
        let data = raw ? validateWorkspace(raw) : emptyWorkspace()
        if (!raw) {
          const legacy = window.localStorage.getItem(legacyKey)
          if (legacy) {
            try {
              const ids = JSON.parse(legacy)
              if (Array.isArray(ids)) data.quickCommandIds = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length <= 200))].slice(0, 8)
            } catch { /* 保留损坏的旧数据，允许用户手动恢复。 */ }
          }
          await invokeCommand('save_workspace', { data })
        }
        set({ data, ready: true, error: undefined })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '读取工作台失败，请重试' })
        throw error
      } finally { hydration = undefined }
    })()
    return hydration
  },
  update: (change) => {
    const task = writes.then(async () => {
      await get().hydrate()
      set({ saving: true })
      try {
        const data = validateWorkspace(change(get().data))
        await invokeCommand('save_workspace', { data })
        set({ data, error: undefined })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '保存失败，原数据已保留' })
        throw error
      } finally { set({ saving: false }) }
    })
    writes = task.catch(() => {})
    return task
  },
}))
