import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, Minus, RefreshCw, X } from 'lucide-react'
import {
  closeCurrentWindow,
  isCurrentWindowMaximized,
  maximizeCurrentWindow,
  minimizeCurrentWindow,
  resetCurrentWindow,
  unmaximizeCurrentWindow,
} from '../../api/window-api'
import { Icon } from '../Icon/Icon'
import './WindowControls.css'

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let isMounted = true

    const syncMaximizedState = async () => {
      const maximized = await isCurrentWindowMaximized()
      if (isMounted) {
        setIsMaximized(maximized)
      }
    }

    void syncMaximizedState()
    const intervalId = window.setInterval(() => {
      void syncMaximizedState()
    }, 500)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="qb-window-controls">
      <button
        type="button"
        className="qb-window-controls__button qb-focus-ring"
        aria-label="Minimize window"
        title="Minimize"
        onClick={() => {
          void minimizeCurrentWindow()
        }}
      >
        <Icon icon={Minus} size={15} tone="muted" />
      </button>

      <button
        type="button"
        className="qb-window-controls__button qb-focus-ring"
        aria-label={isMaximized ? 'Restore window size' : 'Maximize window'}
        title={isMaximized ? 'Restore' : 'Maximize'}
        onClick={async () => {
          if (isMaximized) {
            await unmaximizeCurrentWindow()
            setIsMaximized(false)
            return
          }

          await maximizeCurrentWindow()
          setIsMaximized(true)
        }}
      >
        <Icon icon={isMaximized ? Minimize2 : Maximize2} size={14} tone="muted" />
      </button>

      <button
        type="button"
        className="qb-window-controls__button qb-window-controls__button--reset qb-focus-ring"
        aria-label="Reset window size"
        title="Reset size"
        onClick={() => {
          void resetCurrentWindow()
        }}
      >
        <Icon icon={RefreshCw} size={14} tone="muted" />
      </button>

      <button
        type="button"
        className="qb-window-controls__button qb-window-controls__button--danger qb-focus-ring"
        aria-label="Close window"
        title="Close"
        onClick={() => {
          void closeCurrentWindow()
        }}
      >
        <Icon icon={X} size={14} tone="muted" />
      </button>
    </div>
  )
}

export default WindowControls
