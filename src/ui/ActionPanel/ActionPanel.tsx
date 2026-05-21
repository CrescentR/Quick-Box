import { useEffect, useMemo, useState } from 'react'
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
  title = 'Action Panel',
  description = 'Fast actions for the current launcher context.',
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
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((current) => Math.min(current + 1, Math.max(filteredActions.length - 1, 0)))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        filteredActions[selectedIndex]?.onAction?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filteredActions, onClose, open, selectedIndex])

  if (!open) {
    return null
  }

  return (
    <div className="qb-action-panel-overlay" onClick={onClose}>
      <section
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
          placeholder="Search actions"
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
                title="No actions found"
                description="Try a broader search or close the panel."
              />
            )
          )}
        </div>
      </section>
    </div>
  )
}

export default ActionPanel
