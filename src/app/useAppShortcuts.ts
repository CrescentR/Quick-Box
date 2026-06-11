import { useEffect } from 'react'
import type { AppPage } from '../pages/page-types'

export function useAppShortcuts(onPageChange: (page: AppPage) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandModifier = event.ctrlKey || event.metaKey

      if (isCommandModifier && event.key === ',') {
        event.preventDefault()
        event.stopPropagation()
        onPageChange('settings')
        return
      }

      if (isCommandModifier && event.key === '1') {
        event.preventDefault()
        event.stopPropagation()
        onPageChange('launcher')
        return
      }

      if (isCommandModifier && event.key === '2') {
        event.preventDefault()
        event.stopPropagation()
        onPageChange('plugins')
        return
      }

      if (isCommandModifier && event.key === '3') {
        event.preventDefault()
        event.stopPropagation()
        onPageChange('settings')
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [onPageChange])
}
