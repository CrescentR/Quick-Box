import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import './Icon.css'

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon
  size?: number
  strokeWidth?: number
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted'
}

export function Icon({
  icon: LucideComponent,
  size = 16,
  strokeWidth = 1.8,
  tone = 'default',
  className,
  ...props
}: IconProps) {
  return (
    <span className={clsx('qb-icon', `qb-icon--${tone}`, className)} {...props}>
      <LucideComponent size={size} strokeWidth={strokeWidth} aria-hidden="true" />
    </span>
  )
}

export default Icon
