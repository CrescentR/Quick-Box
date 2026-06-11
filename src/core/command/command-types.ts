export type CommandSource = 'builtin' | 'local' | 'market'
export type CommandExecuteMode = 'immediate' | 'view'

export interface CommandContext {
  openView: (viewId: string, params?: Record<string, unknown>) => Promise<void>
  closeView: () => void
}

export interface Command {
  id: string
  pluginId: string
  title: string
  description?: string
  keywords: string[]
  source: CommandSource
  executeMode: CommandExecuteMode
  run: (ctx: CommandContext) => Promise<void> | void
}

export interface CommandSearchResult {
  command: Command
  score: number
  matchedText: string
}

export interface CommandUsageInfo {
  runCount: number
  lastRunAt?: string
}
