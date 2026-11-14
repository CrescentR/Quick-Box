import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import { useT } from '../../i18n'
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
  title,
  description,
  pluginName,
  stackTrace,
  onRetry,
  onDisable,
  onCopyError,
  className,
  ...props
}: ErrorStateProps) {
  const tr = useT()
  return (
    <section className={clsx('qb-error-state', className)} {...props}>
      <div className="qb-error-state__title">{title ?? tr('出现了一点问题', 'Something went wrong')}</div>
      <div className="qb-error-state__description">{description}</div>
      {pluginName ? <div className="qb-error-state__meta">{tr('插件：', 'Plugin: ')}{pluginName}</div> : null}
      {stackTrace ? <CodeBlock code={stackTrace} language="error" wrap /> : null}
      {(onRetry || onDisable || onCopyError) ? (
        <div className="qb-error-state__actions">
          {onRetry ? (
            <button className="qb-error-state__button" type="button" onClick={onRetry}>
              {tr('重试', 'Retry')}
            </button>
          ) : null}
          {onDisable ? (
            <button className="qb-error-state__button" type="button" onClick={onDisable}>
              {tr('停用', 'Disable')}
            </button>
          ) : null}
          {onCopyError ? (
            <button className="qb-error-state__button" type="button" onClick={onCopyError}>
              {tr('复制错误', 'Copy Error')}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default ErrorState
