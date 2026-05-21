import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import './EmptyState.css'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode
  title: ReactNode
  description: ReactNode
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={clsx('qb-empty-state', className)} {...props}>
      {icon ? <div className="qb-empty-state__icon">{icon}</div> : null}
      <div className="qb-empty-state__title">{title}</div>
      <div className="qb-empty-state__description">{description}</div>
      {action ? <div className="qb-empty-state__action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
