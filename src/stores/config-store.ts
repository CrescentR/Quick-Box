import { create } from 'zustand'
import { defaultConfig } from '../core/config/default-config'
import type { QuickBoxConfig } from '../core/config/config-types'

interface ConfigState {
  config: QuickBoxConfig
  setConfig: (config: QuickBoxConfig) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: defaultConfig,
  setConfig: (config) => set({ config }),
}))
