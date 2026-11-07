import type { ReactNode } from 'react'
import { Detail, Tag } from '../../ui'
import type { TagProps } from '../../ui'

type TagTone = NonNullable<TagProps['tone']>

export interface ToolShellProps {
  title: string
  description: ReactNode
  /** 工具复杂度等级（L1–L4），按等级自动着色；与 badge 二选一。 */
  level?: string
  /** 自定义右上角标签文字，例如“UUID v4”“系统能力”。 */
  badge?: ReactNode
  badgeTone?: TagTone
  /** 底部“说明”区域的 Markdown。 */
  notes?: string
  children: ReactNode
}

export function levelTone(level: string): TagTone {
  const rank = Number(level.replace(/^L/i, ''))
  if (rank >= 3) return 'warning'
  if (rank === 2) return 'success'
  return 'default'
}

/** 所有内置工具共用的面板骨架：统一标题区、标签与说明。 */
export function ToolShell({ title, description, level, badge, badgeTone, notes, children }: ToolShellProps) {
  const label = level ?? badge
  const tone = badgeTone ?? (level ? levelTone(level) : 'default')
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
          {label ? <Tag tone={tone}>{label}</Tag> : null}
        </div>
      </header>
      {children}
      {notes ? <Detail title="说明" markdown={notes} /> : null}
    </section>
  )
}
