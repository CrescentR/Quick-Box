import { create } from 'zustand'
import { loadPluginStates, savePluginStates } from '../api/plugin-api'
import type { ToolPlugin } from '../core/plugin/plugin-types'

type PluginStateStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

interface PluginState {
  enabledPluginIds: string[]
  status: PluginStateStatus
  error?: string
  hydratePluginState: (plugins: ToolPlugin[]) => Promise<void>
  setPluginEnabled: (plugin: ToolPlugin, enabled: boolean, plugins: ToolPlugin[]) => Promise<void>
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

function defaultEnabledIds(plugins: ToolPlugin[]) {
  return plugins.map((plugin) => plugin.id)
}

function toPersistedStates(plugins: ToolPlugin[], enabledPluginIds: string[]) {
  const enabled = new Set(enabledPluginIds)

  return plugins.map((plugin) => ({
    id: plugin.id,
    source: plugin.source,
    enabled: enabled.has(plugin.id),
  }))
}

export const usePluginStore = create<PluginState>((set, get) => ({
  enabledPluginIds: [],
  status: 'idle',
  error: undefined,
  hydratePluginState: async (plugins) => {
    if (get().status === 'loading') {
      return
    }

    set({ status: 'loading', error: undefined })

    try {
      const persistedStates = await loadPluginStates()
      const persistedById = new Map(
        persistedStates.map((state) => [state.id, state.enabled]),
      )
      const enabledPluginIds = plugins
        .filter((plugin) => persistedById.get(plugin.id) ?? true)
        .map((plugin) => plugin.id)

      set({ enabledPluginIds, status: 'ready', error: undefined })
    } catch (error) {
      set({
        enabledPluginIds: defaultEnabledIds(plugins),
        status: 'error',
        error: getErrorMessage(error),
      })
    }
  },
  setPluginEnabled: async (plugin, enabled, plugins) => {
    const currentIds =
      get().status === 'idle' && get().enabledPluginIds.length === 0
        ? defaultEnabledIds(plugins)
        : get().enabledPluginIds
    const nextEnabledIds = enabled
      ? Array.from(new Set([...currentIds, plugin.id]))
      : currentIds.filter((pluginId) => pluginId !== plugin.id)

    set({ enabledPluginIds: nextEnabledIds, status: 'saving', error: undefined })

    try {
      await savePluginStates(toPersistedStates(plugins, nextEnabledIds))
      set({ status: 'ready', error: undefined })
    } catch (error) {
      set({ status: 'error', error: getErrorMessage(error) })
    }
  },
}))
