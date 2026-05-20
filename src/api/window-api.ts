import { invokeCommand } from './tauri-api'

export function showLauncherWindow() {
  return invokeCommand<void>('show_launcher_window')
}

export function hideLauncherWindow() {
  return invokeCommand<void>('hide_launcher_window')
}

export function toggleLauncherWindow() {
  return invokeCommand<void>('toggle_launcher_window')
}
