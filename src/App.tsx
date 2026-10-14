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

export default function App() {
  ensureAppBootstrapped()

  const [currentPage, setCurrentPage] = useState<AppPage>('launcher')
  const { config, hydrateConfig } = useConfigStore()
  const { hydratePluginState } = usePluginStore()

  useAppTheme(config.theme)
  useAppShortcuts(setCurrentPage)

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
    </MainLayout>
  )
}
