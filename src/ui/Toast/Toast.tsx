import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import './Toast.css'

export interface ToastActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'success' | 'warning' | 'danger'
  title?: string
  description?: string
  icon?: ReactNode
  action?: ToastActionProps
  onDismiss?: () => void
}

function getToneIcon(tone: NonNullable<ToastProps['tone']>) {
  switch (tone) {
    case 'success':
      return CheckCircle2
    case 'warning':
      return TriangleAlert
    case 'danger':
      return XCircle
    default:
      return Info
  }
}

export function Toast({
  tone = 'default',
  title,
  description,
  icon,
  action,
  onDismiss,
  className,
  ...props
}: ToastProps) {
  const toneIcon = getToneIcon(tone)

  return (
    <div className={clsx('qb-toast', `qb-toast--${tone}`, className)} role="status" {...props}>
      <div className="qb-toast__icon">
        {icon ?? <Icon icon={toneIcon} size={18} tone={tone === 'default' ? 'primary' : tone} />}
      </div>
      <div className="qb-toast__content">
        {title ? <div className="qb-toast__title">{title}</div> : null}
        {description ? <div className="qb-toast__description">{description}</div> : null}
      </div>
      {action ? (
        <button type="button" className="qb-toast__action" {...action}>
          {action.label}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className="qb-toast__dismiss qb-focus-ring"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}

export default Toast
