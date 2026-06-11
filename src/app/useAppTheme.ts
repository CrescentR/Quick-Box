import { useEffect } from 'react'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import type { QuickBoxConfig } from '../core/config/config-types'

export function useAppTheme(theme: QuickBoxConfig['theme']) {
  const resolvedTheme = useResolvedTheme(theme)

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.themeMode = theme
  }, [theme, resolvedTheme])
}
