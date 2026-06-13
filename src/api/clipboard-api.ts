import { invokeCommand } from './tauri-api'

export function readClipboardText() {
  return invokeCommand<string>('read_clipboard_text')
}

export function writeClipboardText(text: string) {
  return invokeCommand<void>('write_clipboard_text', { text })
}

export interface ClipboardHistoryItem {
  id: number
  text: string
  createdAt: string
}

export function loadClipboardHistory() {
  return invokeCommand<ClipboardHistoryItem[]>('load_clipboard_history')
}

export function recordClipboardText(text: string) {
  return invokeCommand<ClipboardHistoryItem[]>('record_clipboard_text', { text })
}

export function deleteClipboardHistoryItem(id: number) {
  return invokeCommand<ClipboardHistoryItem[]>('delete_clipboard_history_item', { id })
}

export function clearClipboardHistory() {
  return invokeCommand<void>('clear_clipboard_history')
}
