import type { QuickBoxConfig } from '../core/config/config-types'
import { invokeCommand } from './tauri-api'

export function loadConfig() {
  return invokeCommand<QuickBoxConfig>('load_config')
}

export function saveConfig(config: QuickBoxConfig) {
  return invokeCommand<void>('save_config', { config })
}
