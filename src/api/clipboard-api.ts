import { invokeCommand } from './tauri-api'

export function readClipboardText() {
  return invokeCommand<string>('read_clipboard_text')
}

export function writeClipboardText(text: string) {
  return invokeCommand<void>('write_clipboard_text', { text })
}
