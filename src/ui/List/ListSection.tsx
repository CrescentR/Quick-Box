import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export interface ListSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  children?: ReactNode
}

export function ListSection({ title, children, className, ...props }: ListSectionProps) {
  return (
    <section className={clsx('qb-list-section', className)} {...props}>
      <header className="qb-list-section__header">
        <span className="qb-list-section__title">{title}</span>
      </header>
      <div className="qb-list-section__content">{children}</div>
    </section>
  )
}

export default ListSection
