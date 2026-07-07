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
const previewMarketSourceUrlKey = 'quickbox.preview.marketSourceUrl'
const previewInstalledPluginsKey = 'quickbox.preview.installedPlugins'

const defaultMarketSourceUrl = 'https://raw.githubusercontent.com/quickbox/quickbox-plugins/main/release/plugins.json'

const previewMarketIndex = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  plugins: [
    {
      id: 'com.quickbox.json-formatter',
      name: 'JSON 格式化工具',
      version: '1.0.0',
      description: '格式化、压缩并校验 JSON 内容，支持大文件。',
      author: 'QuickBox',
      icon: 'icon.png',
      categories: ['developer'],
      downloadUrl: 'https://example.com/json-formatter-1.0.0.zip',
      sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      size: 15234,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      permissions: ['clipboard:read', 'clipboard:write'],
    },
    {
      id: 'com.quickbox.timestamp-converter',
      name: '时间戳转换器',
      version: '1.1.0',
      description: '在 Unix 时间戳与日期之间转换，支持毫秒与秒。',
      author: 'QuickBox',
      icon: 'icon.png',
      categories: ['developer', 'utility'],
      downloadUrl: 'https://example.com/timestamp-converter-1.1.0.zip',
      sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      size: 9876,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-06-01T00:00:00Z',
      permissions: ['clipboard:read', 'clipboard:write'],
    },
    {
      id: 'com.quickbox.color-picker',
      name: '颜色选择器',
      version: '0.9.0',
      description: '屏幕取色与调色板工具，支持 HEX / RGB / HSL 互转。',
      author: 'Community',
      icon: 'icon.png',
      categories: ['frontend', 'image'],
      downloadUrl: 'https://example.com/color-picker-0.9.0.zip',
      sha256: '0000000000000000000000000000000000000000000000000000000000000000',
      size: 22341,
      createdAt: '2025-03-15T00:00:00Z',
      updatedAt: '2025-03-15T00:00:00Z',
      permissions: ['clipboard:write', 'storage'],
    },
  ],
}

const previewDefaultConfig = {
  hotkey: 'Alt+Space',
  theme: 'dark',
  enableTray: true,
  alwaysOnTop: false,
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
    // ---- 插件市场预览模式桩 ----
    case 'get_market_source_url':
      return readLocalStorageJson(previewMarketSourceUrlKey, defaultMarketSourceUrl) as TResponse
    case 'set_market_source_url':
      window.localStorage.setItem(previewMarketSourceUrlKey, String(args?.url ?? defaultMarketSourceUrl))
      return undefined as TResponse
    case 'fetch_market_index':
      return previewMarketIndex as TResponse
    case 'load_installed_plugins':
      return readLocalStorageJson(previewInstalledPluginsKey, []) as TResponse
    case 'install_plugin':
    case 'update_plugin': {
      const pluginId = String(args?.pluginId ?? '')
      const marketPlugin = previewMarketIndex.plugins.find((p) => p.id === pluginId)
      if (!marketPlugin) {
        throw { code: 'PLUGIN_NOT_FOUND', message: `Preview: plugin ${pluginId} not in mock index` } satisfies CommandError
      }
      const installed = readLocalStorageJson<Array<Record<string, unknown>>>(previewInstalledPluginsKey, [])
      const now = new Date().toISOString()
      const record = {
        id: marketPlugin.id,
        name: marketPlugin.name,
        version: marketPlugin.version,
        path: `/preview/${marketPlugin.id}/versions/${marketPlugin.version}`,
        enabled: true,
        installedAt: now,
        updatedAt: now,
        manifest: {
          id: marketPlugin.id,
          name: marketPlugin.name,
          version: marketPlugin.version,
          description: marketPlugin.description,
          author: marketPlugin.author,
          icon: marketPlugin.icon,
          main: 'index.html',
          commands: [{ code: 'open', title: marketPlugin.name, description: marketPlugin.description, keywords: [marketPlugin.name] }],
          permissions: marketPlugin.permissions ?? [],
          categories: marketPlugin.categories,
        },
      }
      const nextInstalled = [record, ...installed.filter((p) => p.id !== pluginId)]
      window.localStorage.setItem(previewInstalledPluginsKey, JSON.stringify(nextInstalled))
      return record as TResponse
    }
    case 'uninstall_plugin': {
      const pluginId = String(args?.pluginId ?? '')
      const installed = readLocalStorageJson<Array<Record<string, unknown>>>(previewInstalledPluginsKey, [])
      window.localStorage.setItem(
        previewInstalledPluginsKey,
        JSON.stringify(installed.filter((p) => p.id !== pluginId)),
      )
      return undefined as TResponse
    }
    case 'enable_plugin':
    case 'disable_plugin': {
      const pluginId = String(args?.pluginId ?? '')
      const enabled = command === 'enable_plugin'
      const installed = readLocalStorageJson<Array<Record<string, unknown>>>(previewInstalledPluginsKey, [])
      const nextInstalled = installed.map((p) =>
        p.id === pluginId ? { ...p, enabled, updatedAt: new Date().toISOString() } : p,
      )
      window.localStorage.setItem(previewInstalledPluginsKey, JSON.stringify(nextInstalled))
      return undefined as TResponse
    }
    case 'open_plugin_window':
      return undefined as TResponse
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
