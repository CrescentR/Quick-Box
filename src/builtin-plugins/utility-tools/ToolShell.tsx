import type { ReactNode } from 'react'
import { Detail, Tag } from '../../ui'
interface ToolShellProps { title: string; level: string; description: string; children: ReactNode; notes?: string }
export function ToolShell({ title, level, description, children, notes }: ToolShellProps) {
  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">{title}</div>
          <div className="qb-tool-view__description">{description}</div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{level}</Tag>
        </div>
      </header>
      {children}
      {notes ? <Detail title="说明" markdown={notes} /> : null}
    </section>
  )
}
