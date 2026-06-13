import { invoke } from '@tauri-apps/api/core'

export interface CommandError {
  code: string
  message: string
  details?: string
}

const previewConfigKey = 'quickbox.preview.config'
const previewPluginStatesKey = 'quickbox.preview.pluginStates'
const previewCommandUsageKey = 'quickbox.preview.commandUsage'
const previewClipboardHistoryKey = 'quickbox.preview.clipboardHistory'

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
    case 'load_clipboard_history':
      return readLocalStorageJson(previewClipboardHistoryKey, []) as TResponse
    case 'record_clipboard_text': {
      const text = String(args?.text ?? '')
      if (!text.trim()) {
        return readLocalStorageJson(previewClipboardHistoryKey, []) as TResponse
      }
      const items = readLocalStorageJson<Array<{ id: number; text: string; createdAt: string }>>(
        previewClipboardHistoryKey,
        [],
      )
      const nextItem = {
        id: Date.now(),
        text,
        createdAt: new Date().toISOString(),
      }
      const nextItems = [nextItem, ...items.filter((item) => item.text !== text)].slice(0, 100)
      window.localStorage.setItem(previewClipboardHistoryKey, JSON.stringify(nextItems))
      return nextItems as TResponse
    }
    case 'delete_clipboard_history_item': {
      const id = Number(args?.id ?? 0)
      const items = readLocalStorageJson<Array<{ id: number; text: string; createdAt: string }>>(
        previewClipboardHistoryKey,
        [],
      )
      const nextItems = items.filter((item) => item.id !== id)
      window.localStorage.setItem(previewClipboardHistoryKey, JSON.stringify(nextItems))
      return nextItems as TResponse
    }
    case 'clear_clipboard_history':
      window.localStorage.setItem(previewClipboardHistoryKey, JSON.stringify([]))
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
    case 'list_directory_files':
      return [] as TResponse
    case 'apply_batch_rename':
      return [] as TResponse
    case 'search_file_contents':
      return [] as TResponse
    case 'pick_screen_color':
      return {
        x: 0,
        y: 0,
        r: 59,
        g: 130,
        b: 246,
        hex: '#3b82f6',
        rgb: 'rgb(59, 130, 246)',
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
