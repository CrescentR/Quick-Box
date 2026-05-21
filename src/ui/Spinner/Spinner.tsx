import type { CSSProperties, HTMLAttributes } from 'react'
import clsx from 'clsx'
import './Spinner.css'

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number
}

export function Spinner({ size = 16, className, style, ...props }: SpinnerProps) {
  const spinnerStyle = {
    '--qb-spinner-size': `${size}px`,
    ...style,
  } as CSSProperties

  return (
    <span
      aria-hidden="true"
      className={clsx('qb-spinner', className)}
      style={spinnerStyle}
      {...props}
    />
  )
}

export default Spinner
