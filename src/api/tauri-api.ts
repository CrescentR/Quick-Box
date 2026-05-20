import { invoke } from '@tauri-apps/api/core'

export interface CommandError {
  code: string
  message: string
  details?: string
}

export async function invokeCommand<TResponse>(
  command: string,
  args?: Record<string, unknown>,
): Promise<TResponse> {
  return invoke<TResponse>(command, args)
}
