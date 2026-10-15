import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { TaskReminderWindow } from './app/TaskReminders'

const isReminder = window.location.hash === '#task-reminder' || (
  Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) && getCurrentWindow().label === 'task-reminder'
)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isReminder ? <TaskReminderWindow /> : <App />}
  </React.StrictMode>,
)
