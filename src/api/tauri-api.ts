import { invoke } from '@tauri-apps/api/core'

export interface CommandError {
  code: string
  message: string
  details?: string
}

const previewConfigKey = 'quickbox.preview.config'
const previewPluginStatesKey = 'quickbox.preview.pluginStates'
const previewCommandUsageKey = 'quickbox.preview.commandUsage'

const previewDefaultConfig = {
  hotkey: 'Alt+Space',
  theme: 'dark',
  enableTray: true,
}

interface PreviewWindow extends Window {
  __TAURI_INTERNALS__?: unknown
}

function isTauriRuntime() {
  return Boolean((window as PreviewWindow).__TAURI_INTERNALS__)
}

function readLocalStorageJson<TValue>(key: string, fallback: TValue): TValue {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as TValue) : fallback
  } catch {
    return fallback
  }
}

async function invokePreviewCommand<TResponse>(
  command: string,
  args?: Record<string, unknown>,
): Promise<TResponse> {
  switch (command) {
    case 'load_config':
      return readLocalStorageJson(previewConfigKey, previewDefaultConfig) as TResponse
    case 'save_config':
      window.localStorage.setItem(previewConfigKey, JSON.stringify(args?.config ?? previewDefaultConfig))
      return undefined as TResponse
    case 'load_plugin_states':
      return readLocalStorageJson(previewPluginStatesKey, []) as TResponse
    case 'save_plugin_states':
      window.localStorage.setItem(previewPluginStatesKey, JSON.stringify(args?.states ?? []))
      return undefined as TResponse
    case 'load_command_usage':
      return readLocalStorageJson(previewCommandUsageKey, []) as TResponse
    case 'record_command_usage': {
      const commandId = String(args?.commandId ?? '')
      const usage = readLocalStorageJson<Array<{ commandId: string; runCount: number; lastRunAt?: string }>>(
        previewCommandUsageKey,
        [],
      )
      const existing = usage.find((item) => item.commandId === commandId)
      const nextUsage = {
        commandId,
        runCount: (existing?.runCount ?? 0) + 1,
        lastRunAt: new Date().toISOString(),
      }
      const nextItems = existing
        ? usage.map((item) => (item.commandId === commandId ? nextUsage : item))
        : [...usage, nextUsage]
      window.localStorage.setItem(previewCommandUsageKey, JSON.stringify(nextItems))
      return nextUsage as TResponse
    }
    case 'read_clipboard_text':
      return ((await navigator.clipboard?.readText?.()) ?? '') as TResponse
    case 'write_clipboard_text':
      await navigator.clipboard?.writeText?.(String(args?.text ?? ''))
      return undefined as TResponse
    case 'is_launcher_window_maximized':
      return false as TResponse
    case 'show_launcher_window':
    case 'hide_launcher_window':
    case 'toggle_launcher_window':
    case 'minimize_launcher_window':
    case 'maximize_launcher_window':
    case 'unmaximize_launcher_window':
    case 'close_launcher_window':
    case 'reset_launcher_window':
      return undefined as TResponse
    case 'scan_port_occupants':
      return [] as TResponse
    case 'kill_port_occupants':
      return {
        port: Number(args?.port ?? 0),
        killedPids: [],
        failedPids: [
          {
            pid: 0,
            message: 'Preview mode does not support terminating processes.',
          },
        ],
      } as TResponse
    default:
      throw {
        code: 'PREVIEW_COMMAND_UNSUPPORTED',
        message: `Preview mode does not support command "${command}".`,
      } satisfies CommandError
  }
}

export async function invokeCommand<TResponse>(
  command: string,
  args?: Record<string, unknown>,
): Promise<TResponse> {
  if (!isTauriRuntime()) {
    return invokePreviewCommand<TResponse>(command, args)
  }

  return invoke<TResponse>(command, args)
}
