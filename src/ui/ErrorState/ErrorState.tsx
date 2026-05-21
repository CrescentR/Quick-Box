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
  title = '出现了一点问题',
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
      {pluginName ? <div className="qb-error-state__meta">插件：{pluginName}</div> : null}
      {stackTrace ? <CodeBlock code={stackTrace} language="error" wrap /> : null}
      {(onRetry || onDisable || onCopyError) ? (
        <div className="qb-error-state__actions">
          {onRetry ? (
            <button className="qb-error-state__button" type="button" onClick={onRetry}>
              重试
            </button>
          ) : null}
          {onDisable ? (
            <button className="qb-error-state__button" type="button" onClick={onDisable}>
              停用
            </button>
          ) : null}
          {onCopyError ? (
            <button className="qb-error-state__button" type="button" onClick={onCopyError}>
              复制错误
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default ErrorState
