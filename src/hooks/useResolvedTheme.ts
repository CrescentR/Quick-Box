import { useEffect, useMemo, useState } from 'react'
import type { QuickBoxConfig } from '../core/config/config-types'

export type ResolvedTheme = 'dark' | 'light'

function readSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const syncSystemTheme = () => setSystemTheme(readSystemTheme())

    syncSystemTheme()
    mediaQuery.addEventListener('change', syncSystemTheme)

    return () => mediaQuery.removeEventListener('change', syncSystemTheme)
  }, [])

  return systemTheme
}

export function useResolvedTheme(theme: QuickBoxConfig['theme']) {
  const systemTheme = useSystemTheme()

  return useMemo<ResolvedTheme>(
    () => (theme === 'system' ? systemTheme : theme),
    [systemTheme, theme],
  )
}
