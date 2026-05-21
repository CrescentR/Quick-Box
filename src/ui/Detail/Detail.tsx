import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import { LoadingState } from '../LoadingState/LoadingState'
import { Markdown } from '../Markdown/Markdown'
import './Detail.css'

export interface DetailMetadataItem {
  label: string
  value: string
}

export interface DetailProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  markdown?: string
  metadata?: DetailMetadataItem[]
  isLoading?: boolean
}

export function Detail({
  title,
  markdown,
  metadata,
  isLoading = false,
  className,
  ...props
}: DetailProps) {
  if (isLoading) {
    return <LoadingState rows={4} className={className} />
  }

  return (
    <section className={clsx('qb-detail', className)} {...props}>
      {title ? (
        <header className="qb-detail__header">
          <div className="qb-detail__title">{title}</div>
        </header>
      ) : null}

      {markdown ? <Markdown className="qb-detail__markdown" content={markdown} /> : null}

      {metadata?.length ? (
        <div className="qb-detail__metadata">
          {metadata.map((item) => (
            <div key={`${item.label}-${item.value}`} className="qb-detail__metadata-item">
              <div className="qb-detail__metadata-label">{item.label}</div>
              <div className="qb-detail__metadata-value">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default Detail
