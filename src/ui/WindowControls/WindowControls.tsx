import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import {
  closeCurrentWindow,
  isCurrentWindowMaximized,
  maximizeCurrentWindow,
  minimizeCurrentWindow,
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
        className="qb-window-controls__button qb-window-controls__button--close qb-focus-ring"
        aria-label="关闭窗口"
        title="关闭"
        onClick={() => {
          void closeCurrentWindow()
        }}
      >
        <Icon icon={X} size={12} tone="muted" />
      </button>

      <button
        type="button"
        className="qb-window-controls__button qb-window-controls__button--minimize qb-focus-ring"
        aria-label="最小化窗口"
        title="最小化"
        onClick={() => {
          void minimizeCurrentWindow()
        }}
      >
        <Icon icon={Minus} size={12} tone="muted" />
      </button>

      <button
        type="button"
        className="qb-window-controls__button qb-window-controls__button--maximize qb-focus-ring"
        aria-label={isMaximized ? '还原窗口大小' : '最大化窗口'}
        title={isMaximized ? '还原' : '最大化'}
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
        <Icon icon={isMaximized ? Minimize2 : Maximize2} size={11} tone="muted" />
      </button>
    </div>
  )
}

export default WindowControls
