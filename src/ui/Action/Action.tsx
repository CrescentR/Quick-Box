import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import { KeyboardShortcut } from '../KeyboardShortcut/KeyboardShortcut'
import './Action.css'

export interface ActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string
  description?: string
  icon?: ReactNode
  shortcut?: string | string[]
  tone?: 'default' | 'danger'
  selected?: boolean
  onAction?: () => void
}

export function Action({
  title,
  description,
  icon,
  shortcut,
  tone = 'default',
  selected = false,
  onAction,
  className,
  onClick,
  ...props
}: ActionProps) {
  return (
    <button
      type="button"
      className={clsx(
        'qb-action',
        `qb-action--${tone}`,
        { 'qb-action--selected': selected },
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onAction?.()
        }
      }}
      {...props}
    >
      {icon ? <span className="qb-action__icon">{icon}</span> : null}
      <span className="qb-action__copy">
        <span className="qb-action__title">{title}</span>
        {description ? <span className="qb-action__description">{description}</span> : null}
      </span>
      {shortcut ? (
        <span className="qb-action__shortcut">
          <KeyboardShortcut keys={shortcut} />
        </span>
      ) : null}
    </button>
  )
}

export default Action
