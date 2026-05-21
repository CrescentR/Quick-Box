import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import './WindowShell.css'

export interface WindowShellProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  mode?: 'launcher' | 'split'
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function WindowShell({
  mode = 'launcher',
  title,
  footer,
  children,
  className,
  ...props
}: WindowShellProps) {
  return (
    <section
      className={clsx(
        'qb-window',
        'qb-window-shell',
        mode === 'launcher' ? 'qb-window--launcher' : 'qb-window--split',
        className,
      )}
      {...props}
    >
      {title ? (
        <header className="qb-window-shell__header" data-tauri-drag-region>
          <div className="qb-window-shell__title">{title}</div>
        </header>
      ) : null}
      <div className="qb-window-shell__body">{children}</div>
      {footer ? <footer className="qb-window-shell__footer">{footer}</footer> : null}
    </section>
  )
}

export default WindowShell
