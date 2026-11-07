import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } }
}

// 直接读取 Tauri 注入的窗口元数据，避免为了一个 label 把 @tauri-apps/api/window（约 78 KB）打进主包。
const windowLabel = (window as TauriWindow).__TAURI_INTERNALS__?.metadata?.currentWindow?.label
const isReminder = window.location.hash === '#task-reminder' || windowLabel === 'task-reminder'

async function render() {
  // 提醒小窗口只加载提醒模块，主窗口才加载完整应用。
  const root = isReminder
    ? React.createElement((await import('./app/TaskReminders')).TaskReminderWindow)
    : React.createElement((await import('./App')).default)

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>{root}</React.StrictMode>,
  )
}

void render()
