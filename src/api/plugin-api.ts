import type { PluginSource } from '../core/plugin/plugin-types'
import { invokeCommand } from './tauri-api'

export interface PersistedPluginState {
  id: string
  source: PluginSource
  enabled: boolean
}

export function loadPluginStates() {
  return invokeCommand<PersistedPluginState[]>('load_plugin_states')
}

export function savePluginStates(states: PersistedPluginState[]) {
  return invokeCommand<void>('save_plugin_states', { states })
}
