import { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import { EmptyState } from '../EmptyState/EmptyState'
import { LoadingState } from '../LoadingState/LoadingState'
import { ListSection, type ListSectionProps } from './ListSection'
import './List.css'

export interface ListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  isLoading?: boolean
  emptyState?: ReactNode
  loadingRows?: number
}

const ListRoot = forwardRef<HTMLDivElement, ListProps>(function ListRoot({
  children,
  isLoading = false,
  emptyState,
  loadingRows = 5,
  className,
  ...props
}, ref) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0
  const hasContent = childCount > 0

  return (
    <div ref={ref} className={clsx('qb-list', className)} {...props}>
      <div className="qb-list__viewport qb-scrollbar">
        <div className="qb-list__content">
          {isLoading ? <LoadingState rows={loadingRows} /> : null}
          {!isLoading && hasContent ? children : null}
          {!isLoading && !hasContent
            ? (emptyState ?? (
                <EmptyState title="暂无结果" description="当前没有可显示的内容。" />
              ))
            : null}
        </div>
      </div>
    </div>
  )
})

export const List = Object.assign(ListRoot, {
  Section: ListSection,
})

export type { ListSectionProps }

export default List
