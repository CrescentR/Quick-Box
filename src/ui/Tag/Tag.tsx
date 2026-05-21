import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import './Tag.css'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  children: ReactNode
}

export function Tag({ tone = 'default', children, className, ...props }: TagProps) {
  return (
    <span className={clsx('qb-tag', `qb-tag--${tone}`, className)} {...props}>
      {children}
    </span>
  )
}

export default Tag
