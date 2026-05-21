import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import './LoadingState.css'

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number
}

export function LoadingState({
  rows = 5,
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div className={clsx('qb-loading-state', className)} {...props}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="qb-loading-state__row">
          <span className="qb-loading-state__line qb-loading-state__line--title qb-skeleton" />
          <span className="qb-loading-state__line qb-loading-state__line--subtitle qb-skeleton" />
        </div>
      ))}
    </div>
  )
}

export default LoadingState
