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

export function minimizeCurrentWindow() {
  return invokeCommand<void>('minimize_launcher_window')
}

export function maximizeCurrentWindow() {
  return invokeCommand<void>('maximize_launcher_window')
}

export function unmaximizeCurrentWindow() {
  return invokeCommand<void>('unmaximize_launcher_window')
}

export function closeCurrentWindow() {
  return invokeCommand<void>('close_launcher_window')
}

export async function resetCurrentWindow() {
  return invokeCommand<void>('reset_launcher_window')
}

export function isCurrentWindowMaximized() {
  return invokeCommand<boolean>('is_launcher_window_maximized')
}
