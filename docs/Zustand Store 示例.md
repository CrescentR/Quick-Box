你可以用 Zustand 管理启动器状态。
TypeScript
import { create } from 'zustand'

interface LauncherState {
  query: string
  selectedIndex: number
  activeViewId?: string
  activeViewParams?: Record<string, unknown>
  setQuery: (query: string) => void
  setSelectedIndex: (index: number) => void
  openView: (viewId: string, params?: Record<string, unknown>) => void
  closeView: () => void
}

export const useLauncherStore = create<LauncherState>(set => ({
  query: '',
  selectedIndex: 0,
  activeViewId: undefined,
  activeViewParams: undefined,
  setQuery: query => set({ query, selectedIndex: 0 }),
  setSelectedIndex: selectedIndex => set({ selectedIndex }),
  openView: (viewId, params) =>
    set({
      activeViewId: viewId,
      activeViewParams: params,
    }),
  closeView: () =>
    set({
      activeViewId: undefined,
      activeViewParams: undefined,
    }),
}))
