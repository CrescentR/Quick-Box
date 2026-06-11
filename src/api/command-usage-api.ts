import { invokeCommand } from './tauri-api'

export interface CommandUsage {
  commandId: string
  runCount: number
  lastRunAt?: string
}

export function loadCommandUsage() {
  return invokeCommand<CommandUsage[]>('load_command_usage')
}

export function recordCommandUsage(commandId: string) {
  return invokeCommand<CommandUsage>('record_command_usage', { commandId })
}
