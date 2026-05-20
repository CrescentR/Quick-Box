import { create } from 'zustand'

interface PluginState {
  enabledPluginIds: string[]
  setEnabledPluginIds: (pluginIds: string[]) => void
}

export const usePluginStore = create<PluginState>((set) => ({
  enabledPluginIds: [],
  setEnabledPluginIds: (enabledPluginIds) => set({ enabledPluginIds }),
}))
