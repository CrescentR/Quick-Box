import { useWorkspaceStore } from './stores/workspace-store'
import { useEffect, useState } from 'react'
import { ensureAppBootstrapped } from './app/bootstrap'
import { useAppShortcuts } from './app/useAppShortcuts'
import { useAppTheme } from './app/useAppTheme'
import MainLayout from './layouts/MainLayout'
import LauncherPage from './pages/LauncherPage'
import PluginManagerPage from './pages/PluginManagerPage'
import SettingsPage from './pages/SettingsPage'
import type { AppPage } from './pages/page-types'
import { pluginRegistry } from './core/plugin/plugin-registry'
import { useConfigStore } from './stores/config-store'
import { usePluginStore } from './stores/plugin-store'
import { listen } from '@tauri-apps/api/event'
import { TaskReminderCenter } from './app/TaskReminders'
import { useLauncherStore } from './stores/launcher-store'

export default function App() {
  ensureAppBootstrapped()

  const [currentPage, setCurrentPage] = useState<AppPage>('launcher')
  const { config, hydrateConfig } = useConfigStore()
  const { hydratePluginState } = usePluginStore()

  useAppTheme(config.theme)
  useAppShortcuts(setCurrentPage)

  const openTask = (id: string) => {
    setCurrentPage('launcher')
    useLauncherStore.getState().openView('official.task-tool.view', {
      commandId: 'official.task-tool.open', taskId: id, requestId: crypto.randomUUID(),
    })
  }

  useEffect(() => {
    if (!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return
    let disposed = false
    let stop: (() => void) | undefined
    void listen<{ id: string }>('quickbox:task-open', (event) => {
      if (typeof event.payload?.id === 'string') openTask(event.payload.id)
    }).then((unlisten) => { if (disposed) unlisten(); else stop = unlisten }).catch(() => {})
    return () => { disposed = true; stop?.() }
  }, [])

  useEffect(() => {
    void useWorkspaceStore.getState().hydrate().catch(() => {})
    void hydrateConfig()
    void hydratePluginState(pluginRegistry.listPlugins())
  }, [hydrateConfig, hydratePluginState])

  const renderPage = () => {
    switch (currentPage) {
      case 'plugins':
        return <PluginManagerPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'settings':
        return <SettingsPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'launcher':
      default:
        return <LauncherPage currentPage={currentPage} onPageChange={setCurrentPage} />
    }
  }

  return (
    <MainLayout>
      {renderPage()}
      <TaskReminderCenter onOpen={openTask} />
    </MainLayout>
  )
}
