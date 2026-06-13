import { useEffect, useState } from 'react'
import { ensureAppBootstrapped } from './app/bootstrap'
import { useAppShortcuts } from './app/useAppShortcuts'
import { useAppTheme } from './app/useAppTheme'
import MainLayout from './layouts/MainLayout'
import AccountPage from './pages/AccountPage'
import LauncherPage from './pages/LauncherPage'
import PluginMarketPage from './pages/PluginMarketPage'
import PluginManagerPage from './pages/PluginManagerPage'
import SettingsPage from './pages/SettingsPage'
import type { AppPage } from './pages/page-types'
import { pluginRegistry } from './core/plugin/plugin-registry'
import { useAccountStore } from './stores/account-store'
import { useConfigStore } from './stores/config-store'
import { usePluginStore } from './stores/plugin-store'

export default function App() {
  ensureAppBootstrapped()

  const [currentPage, setCurrentPage] = useState<AppPage>('launcher')
  const { config, hydrateConfig } = useConfigStore()
  const { hydratePluginState } = usePluginStore()
  const { hydrateAccount } = useAccountStore()

  useAppTheme(config.theme)
  useAppShortcuts(setCurrentPage)

  useEffect(() => {
    void hydrateConfig()
    void hydratePluginState(pluginRegistry.listPlugins())
    void hydrateAccount()
  }, [hydrateAccount, hydrateConfig, hydratePluginState])

  const renderPage = () => {
    switch (currentPage) {
      case 'market':
        return <PluginMarketPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'plugins':
        return <PluginManagerPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'account':
        return <AccountPage currentPage={currentPage} onPageChange={setCurrentPage} />
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
