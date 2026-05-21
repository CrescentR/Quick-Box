import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import { CodeBlock } from '../CodeBlock/CodeBlock'
import './ErrorState.css'

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description: string
  pluginName?: string
  stackTrace?: string
  onRetry?: () => void
  onDisable?: () => void
  onCopyError?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  pluginName,
  stackTrace,
  onRetry,
  onDisable,
  onCopyError,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <section className={clsx('qb-error-state', className)} {...props}>
      <div className="qb-error-state__title">{title}</div>
      <div className="qb-error-state__description">{description}</div>
      {pluginName ? <div className="qb-error-state__meta">Plugin: {pluginName}</div> : null}
      {stackTrace ? <CodeBlock code={stackTrace} language="error" wrap /> : null}
      {(onRetry || onDisable || onCopyError) ? (
        <div className="qb-error-state__actions">
          {onRetry ? (
            <button className="qb-error-state__button" type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
          {onDisable ? (
            <button className="qb-error-state__button" type="button" onClick={onDisable}>
              Disable
            </button>
          ) : null}
          {onCopyError ? (
            <button className="qb-error-state__button" type="button" onClick={onCopyError}>
              Copy Error
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default ErrorState
