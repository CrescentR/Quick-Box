import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Command as QuickBoxCommand } from '../../core/command/command-types'

/** 指针移动超过该距离才视为拖拽 */
const COMMAND_DRAG_THRESHOLD = 6

interface PendingCommandDrag {
  commandId: string
  startX: number
  startY: number
  isDragging: boolean
}

function isPointInsideElement(element: HTMLElement | null, x: number, y: number) {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

/**
 * 把工具行拖进常用区：用指针事件而非 HTML5 拖放，拖拽中显示跟随指针的幽灵卡片
 * @param commandById 按 id 查命令
 * @param onDrop 松手落在常用区时调用
 */
export function useQuickCommandDrag(
  commandById: Map<string, QuickBoxCommand>,
  onDrop: (command: QuickBoxCommand) => void,
) {
  const [draggedCommandId, setDraggedCommandId] = useState<string | null>(null)
  const [isQuickDropActive, setIsQuickDropActive] = useState(false)
  const quickDropRef = useRef<HTMLElement>(null)
  const dragGhostRef = useRef<HTMLDivElement | null>(null)
  const dragPointerRef = useRef({ x: 0, y: 0 })
  const pendingCommandDragRef = useRef<PendingCommandDrag | null>(null)
  // 拖拽结束后的那次 click 不应再打开工具
  const suppressCommandClickRef = useRef(false)

  const startCommandPointerDrag = useCallback((event: ReactPointerEvent<HTMLElement>, command: QuickBoxCommand) => {
    if (event.button !== 0) return
    pendingCommandDragRef.current = {
      commandId: command.id,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
    }
  }, [])

  useEffect(() => {
    const cleanupPointerDrag = () => {
      pendingCommandDragRef.current = null
      setDraggedCommandId(null)
      setIsQuickDropActive(false)
    }

    const onPointerMove = (event: PointerEvent) => {
      const drag = pendingCommandDragRef.current
      if (!drag) return
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
      if (!drag.isDragging && distance < COMMAND_DRAG_THRESHOLD) return
      if (!drag.isDragging) {
        drag.isDragging = true
        setDraggedCommandId(drag.commandId)
      }
      event.preventDefault()
      dragPointerRef.current = { x: event.clientX, y: event.clientY }
      const ghost = dragGhostRef.current
      if (ghost) {
        ghost.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
      }
      setIsQuickDropActive(isPointInsideElement(quickDropRef.current, event.clientX, event.clientY))
    }

    const onPointerUp = (event: PointerEvent) => {
      const drag = pendingCommandDragRef.current
      if (!drag) return
      const shouldDrop = drag.isDragging && isPointInsideElement(quickDropRef.current, event.clientX, event.clientY)
      const command = shouldDrop ? commandById.get(drag.commandId) : undefined
      if (drag.isDragging) {
        suppressCommandClickRef.current = true
        window.setTimeout(() => {
          suppressCommandClickRef.current = false
        }, 0)
      }
      cleanupPointerDrag()
      if (command) onDrop(command)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', cleanupPointerDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', cleanupPointerDrag)
    }
  }, [onDrop, commandById])

  useLayoutEffect(() => {
    const ghost = dragGhostRef.current
    if (!ghost) return
    const { x, y } = dragPointerRef.current
    ghost.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  }, [draggedCommandId])

  return {
    draggedCommand: draggedCommandId ? commandById.get(draggedCommandId) : undefined,
    draggedCommandId,
    isQuickDropActive,
    quickDropRef,
    dragGhostRef,
    suppressCommandClickRef,
    startCommandPointerDrag,
  }
}
