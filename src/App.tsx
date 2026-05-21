import { useEffect, useState } from 'react'
import MainLayout from './layouts/MainLayout'
import LauncherPage from './pages/LauncherPage'
import PluginManagerPage from './pages/PluginManagerPage'
import SettingsPage from './pages/SettingsPage'
import type { AppPage } from './pages/page-types'
import { loadBuiltinPlugins } from './core/plugin/builtin-loader'

let didBootstrap = false

function bootstrapApp() {
  if (didBootstrap) return
  loadBuiltinPlugins()
  didBootstrap = true
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('launcher')

  useEffect(() => {
    bootstrapApp()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === ',') {
        event.preventDefault()
        setCurrentPage('settings')
        return
      }

      if (event.ctrlKey && event.key === '1') {
        event.preventDefault()
        setCurrentPage('launcher')
        return
      }

      if (event.ctrlKey && event.key === '2') {
        event.preventDefault()
        setCurrentPage('plugins')
        return
      }

      if (event.ctrlKey && event.key === '3') {
        event.preventDefault()
        setCurrentPage('settings')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  bootstrapApp()

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
