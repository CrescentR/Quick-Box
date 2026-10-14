import { useEffect, useMemo, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import { Search } from 'lucide-react'
import { Action, type ActionProps } from '../Action/Action'
import { CommandInput } from '../CommandInput/CommandInput'
import { EmptyState } from '../EmptyState/EmptyState'
import { Icon } from '../Icon/Icon'
import { KeyboardShortcut } from '../KeyboardShortcut/KeyboardShortcut'
import './ActionPanel.css'

export interface ActionPanelItem extends Omit<ActionProps, 'selected'> {
  id: string
  keywords?: string[]
}

export interface ActionPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean
  title?: string
  description?: string
  actions: ActionPanelItem[]
  query?: string
  onQueryChange?: (value: string) => void
  onClose?: () => void
  emptyState?: ReactNode
}

function filterActions(actions: ActionPanelItem[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return actions
  }

  return actions.filter((action) => {
    const haystacks = [action.title, action.description ?? '', ...(action.keywords ?? [])]
    return haystacks.some((value) => value.toLowerCase().includes(normalized))
  })
}

export function ActionPanel({
  open,
  title = '动作面板',
  description = '当前启动器上下文中的快捷动作。',
  actions,
  query,
  onQueryChange,
  onClose,
  emptyState,
  className,
  ...props
}: ActionPanelProps) {
  const [internalQuery, setInternalQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const panelRef = useRef<HTMLElement>(null)
  const resolvedQuery = query ?? internalQuery

  const filteredActions = useMemo(
    () => filterActions(actions, resolvedQuery),
    [actions, resolvedQuery],
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [resolvedQuery, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return
      if (event.key === 'Tab') {
        const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('input, button:not(:disabled), [tabindex="0"]') ?? [])
        const current = controls.indexOf(document.activeElement as HTMLElement)
        if (controls.length) { event.preventDefault(); controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus() }
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose?.()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((current) => Math.min(current + 1, Math.max(filteredActions.length - 1, 0)))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        const action = filteredActions[selectedIndex]
        if (action && !action.disabled) action.onAction?.()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [filteredActions, onClose, open, selectedIndex])

  useEffect(() => {
    if (!open) return
    return () => document.querySelector<HTMLInputElement>('[data-qb-launcher-search="true"]')?.focus()
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="qb-action-panel-overlay" onClick={onClose}>
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx('qb-action-panel', className)}
        onClick={(event) => event.stopPropagation()}
        {...props}
      >
        <header className="qb-action-panel__header">
          <div className="qb-action-panel__copy">
            <div className="qb-action-panel__title">{title}</div>
            <div className="qb-action-panel__description">{description}</div>
          </div>
          <div className="qb-action-panel__hint">
            <KeyboardShortcut keys="Esc" />
          </div>
        </header>

        <CommandInput
          autoFocus
          value={resolvedQuery}
          onChange={(value) => {
            onQueryChange?.(value)
            if (query === undefined) {
              setInternalQuery(value)
            }
          }}
          placeholder="搜索动作"
          className="qb-action-panel__input"
        />

        <div className="qb-action-panel__list qb-scrollbar">
          {filteredActions.length ? (
            filteredActions.map((action, index) => (
              <Action key={action.id} {...action} selected={index === selectedIndex} />
            ))
          ) : (
            emptyState ?? (
              <EmptyState
                icon={<Icon icon={Search} size={18} tone="muted" />}
                title="没有找到动作"
                description="换一个更宽泛的关键词，或关闭面板。"
              />
            )
          )}
        </div>
      </section>
    </div>
  )
}

export default ActionPanel
