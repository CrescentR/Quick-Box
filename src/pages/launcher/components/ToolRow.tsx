import type { PointerEvent as ReactPointerEvent } from 'react'
import clsx from 'clsx'
import { Star } from 'lucide-react'
import type { Command as QuickBoxCommand } from '../../../core/command/command-types'
import { getCommandAlias } from '../launcher-catalog'
import { ToolIcon } from './ToolIcon'

export interface ToolRowProps {
  command: QuickBoxCommand
  query: string
  selected: boolean
  open: boolean
  pinned: boolean
  dragging: boolean
  onSelect: () => void
  onLaunch: () => void
  onTogglePin: () => void
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}

/** 高亮标题中与搜索词匹配的片段 */
function HighlightText({ text, query }: { text: string; query: string }) {
  const keyword = query.trim()
  const start = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1
  if (start < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, start)}
      <mark className="qb-launcher-mark">{text.slice(start, start + keyword.length)}</mark>
      {text.slice(start + keyword.length)}
    </>
  )
}

/** 中间栏的一条工具 */
export function ToolRow({
  command,
  query,
  selected,
  open,
  pinned,
  dragging,
  onSelect,
  onLaunch,
  onTogglePin,
  onPointerDown,
}: ToolRowProps) {
  const alias = getCommandAlias(command)

  return (
    <div
      className={clsx(
        'qb-tool-row',
        selected && 'is-selected',
        open && 'is-open',
        dragging && 'is-dragging',
      )}
      data-qb-command-selected={selected ? 'true' : undefined}
    >
      <button
        type="button"
        className="qb-tool-row__main"
        onClick={onLaunch}
        onPointerDown={onPointerDown}
        onMouseEnter={onSelect}
      >
        <ToolIcon command={command} />
        <span className="qb-tool-row__copy">
          <span className="qb-tool-row__title">
            <span className="qb-tool-row__name">
              <HighlightText text={command.title} query={query} />
            </span>
            {alias ? <span className="qb-tool-row__alias">{alias}</span> : null}
          </span>
          {command.description ? <span className="qb-tool-row__desc">{command.description}</span> : null}
        </span>
      </button>
      <button
        type="button"
        className={clsx('qb-tool-row__star', pinned && 'is-on')}
        onClick={onTogglePin}
        title={pinned ? '取消置顶' : '置顶到常用'}
        aria-pressed={pinned}
      >
        <Star size={13} strokeWidth={1.8} fill={pinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export default ToolRow
