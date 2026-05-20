import { useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import LauncherPage from './pages/LauncherPage'
import { loadBuiltinPlugins } from './core/plugin/builtin-loader'

let didBootstrap = false

function bootstrapApp() {
  if (didBootstrap) return
  loadBuiltinPlugins()
  didBootstrap = true
}

export default function App() {
  useEffect(() => {
    bootstrapApp()
  }, [])

  bootstrapApp()

  return (
    <MainLayout>
      <LauncherPage />
    </MainLayout>
  )
}
