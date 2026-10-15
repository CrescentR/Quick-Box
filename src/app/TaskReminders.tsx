import { useCallback, useEffect, useRef, useState } from 'react'
import { BellRing, ExternalLink, X } from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { taskApi } from '../api/task-api'
import { invokeCommand } from '../api/tauri-api'
import type { TaskReminder } from '../core/tasks/task-types'
import { usePluginStore } from '../stores/plugin-store'
import { useConfigStore } from '../stores/config-store'
import { useAppTheme } from './useAppTheme'
import './TaskReminders.css'

const native = () => Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
const messageOf = (cause: unknown) => cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : '无法读取任务提醒，请重试。'

function useReminders(active: boolean, popup: boolean) {
  const [notices, setNotices] = useState<TaskReminder[]>([])
  const [error, setError] = useState('')
  const alive = useRef(false)
  const request = useRef(0)
  const acknowledging = useRef(false)
  const refresh = useCallback(async () => {
    if (acknowledging.current) return
    const current = ++request.current
    try {
      const due = await taskApi.dueReminders()
      if (alive.current && current === request.current) { setNotices(due); setError('') }
    } catch (cause) {
      if (alive.current && current === request.current) setError(messageOf(cause))
    }
  }, [])

  useEffect(() => {
    alive.current = active
    if (!active) { setNotices([]); setError(''); return }
    void refresh()
    const update = () => { void refresh() }
    const timer = window.setInterval(update, 15_000)
    window.addEventListener('quickbox:tasks-changed', update)
    window.addEventListener('quickbox:storage-changed', update)
    window.addEventListener('focus', update)
    let stop: (() => void) | undefined
    let disposed = false
    if (popup && native()) {
      void listen('quickbox:task-reminders', update).then((unlisten) => {
        if (disposed) unlisten()
        else stop = unlisten
      }).catch((cause) => { if (!disposed) setError(messageOf(cause)) })
    }
    return () => {
      disposed = true; alive.current = false; request.current++
      stop?.(); window.clearInterval(timer)
      window.removeEventListener('quickbox:tasks-changed', update)
      window.removeEventListener('quickbox:storage-changed', update)
      window.removeEventListener('focus', update)
    }
  }, [active, popup, refresh])
  const acknowledge = async (ids: string[]) => {
    acknowledging.current = true
    request.current++
    try {
      await taskApi.acknowledgeReminders(ids)
      if (alive.current) setNotices((existing) => existing.filter((item) => !ids.includes(item.id)))
    } finally {
      acknowledging.current = false
      if (alive.current) void refresh()
    }
  }
  return { notices, acknowledge, error, setError, refresh }
}

function ReminderCard({ active, popup = false, onOpen }: { active: boolean; popup?: boolean; onOpen?: (id: string) => void }) {
  const { notices, acknowledge: acknowledgeNotices, error, setError, refresh } = useReminders(active, popup)
  const [busy, setBusy] = useState(false)
  const current = notices[0]
  const visible = notices.length > 0
  useEffect(() => {
    if (!popup || !native()) return
    void invokeCommand(visible ? 'task_show_reminder' : 'task_hide_reminder').catch((cause) => setError(messageOf(cause)))
  }, [popup, visible, setError])

  const acknowledge = async (open: boolean) => {
    if (!current || busy) return
    setBusy(true); setError('')
    try {
      if (open) {
        if (popup && native()) await invokeCommand('task_open_from_reminder', { id: current.id })
        else onOpen?.(current.id)
      }
      await acknowledgeNotices([current.id])
    } catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  if (!active || (!current && !popup)) return null
  return <section className={`qb-task-reminder${popup ? ' qb-task-reminder--window' : ''}`} aria-label="任务提醒" role="status">
    <header><span><BellRing size={16} />任务提醒</span>{notices.length > 1 && <small>另有 {notices.length - 1} 条</small>}
      {current && <button type="button" disabled={busy} aria-label="关闭当前任务提醒" onClick={() => void acknowledge(false)}><X size={15} /></button>}
    </header>
    <strong className="qb-task-reminder__title">{current?.title ?? '正在读取提醒…'}</strong>
    {current && <p>{current.due_date} {current.due_time} 到期</p>}
    {error && <p role="alert" className="qb-task-reminder__error">{error}</p>}
    <footer>{current ? <>
      <button className="qb-tool-button qb-tool-button--primary" type="button" disabled={busy} onClick={() => void acknowledge(true)}><ExternalLink size={13} />查看任务</button>
      <button className="qb-tool-button" type="button" disabled={busy} onClick={() => void acknowledge(false)}>{busy ? '处理中…' : '知道了'}</button>
    </> : <button className="qb-tool-button" type="button" onClick={() => void refresh()}>重新读取</button>}</footer>
  </section>
}

/** 原生窗口的提醒由 Rust 后台持续轮询，浏览器预览则在当前页面演示提醒。 */
export function TaskReminderCenter({ onOpen }: { onOpen: (id: string) => void }) {
  const enabled = usePluginStore((state) => state.enabledPluginIds.includes('official.task-tool'))
  return <ReminderCard active={enabled && !native()} onOpen={onOpen} />
}

export function TaskReminderWindow() {
  const { config, hydrateConfig } = useConfigStore()
  useAppTheme(config.theme)
  useEffect(() => { void hydrateConfig() }, [hydrateConfig])
  return <main className="qb-task-reminder-shell"><ReminderCard active popup /></main>
}
