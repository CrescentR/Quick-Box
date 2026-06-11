import { create } from 'zustand'
import { loadConfig, saveConfig } from '../api/config-api'
import { defaultConfig } from '../core/config/default-config'
import type { QuickBoxConfig } from '../core/config/config-types'

type ConfigStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

interface ConfigState {
  config: QuickBoxConfig
  status: ConfigStatus
  error?: string
  hydrateConfig: () => Promise<void>
  setConfig: (config: QuickBoxConfig) => Promise<void>
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }

    if ('code' in error && typeof error.code === 'string') {
      return error.code
    }
  }

  return error instanceof Error ? error.message : String(error)
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: defaultConfig,
  status: 'idle',
  error: undefined,
  hydrateConfig: async () => {
    if (get().status === 'loading') {
      return
    }

    set({ status: 'loading', error: undefined })

    try {
      const config = await loadConfig()
      set({ config, status: 'ready', error: undefined })
    } catch (error) {
      set({
        config: defaultConfig,
        status: 'error',
        error: getErrorMessage(error),
      })
    }
  },
  setConfig: async (config) => {
    const previousConfig = get().config
    set({ config, status: 'saving', error: undefined })

    try {
      await saveConfig(config)
      set({ status: 'ready', error: undefined })
    } catch (error) {
      set({ config: previousConfig, status: 'error', error: getErrorMessage(error) })
    }
  },
}))
