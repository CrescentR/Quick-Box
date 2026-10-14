/** 常用工具 id 列表的本地存储 key */
export const QUICK_COMMAND_IDS_STORAGE_KEY = 'quickbox.launcher.quickCommandIds'

/** 常用工具最多数量，对应 Alt+1 ~ Alt+8 */
export const MAX_QUICK_COMMANDS = 8

export function readStringArrayPreference(key: string) {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function writePreference(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
}
