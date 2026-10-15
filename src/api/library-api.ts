import { invokeCommand } from './tauri-api'

export interface LibraryItem {
  id: string
  kind: 'command' | 'file'
  title: string
  content: string
  tags: string
  fileName: string | null
  size: number | null
  updatedAt: string
}
export const MAX_LIBRARY_FILE_SIZE = 20 * 1024 * 1024
export const loadLibrary = () => invokeCommand<LibraryItem[]>('load_library')
export const saveLibraryItem = (item: LibraryItem, bytes?: number[]) => invokeCommand<LibraryItem[]>('save_library_item', { item, bytes: bytes ?? null })
export const deleteLibraryItem = (id: string) => invokeCommand<LibraryItem[]>('delete_library_item', { id })
export const readLibraryFile = (id: string) => invokeCommand<number[]>('read_library_file', { id })
export function libraryError(cause: unknown): string {
  return cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : '操作失败，请重试'
}
export function downloadLibraryFile(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/octet-stream' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
