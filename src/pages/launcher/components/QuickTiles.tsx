import { forwardRef } from 'react'
import clsx from 'clsx'
import { Pin } from 'lucide-react'
import type { Command as QuickBoxCommand } from '../../../core/command/command-types'
import { Icon, KeyboardShortcut } from '../../../ui'
import { getCommandAlias } from '../launcher-catalog'
import { ToolIcon } from './ToolIcon'

export interface QuickTilesProps {
  commands: QuickBoxCommand[]
  selectedCommandId?: string
  openCommandId?: string
  draggingTitle?: string
  isDropActive: boolean
  onLaunch: (command: QuickBoxCommand) => void
  onMove: (id: string, direction: number) => void
  onRemove: (command: QuickBoxCommand) => void
}

/** 常用工具磁贴，同时作为拖拽放置区 */
export const QuickTiles = forwardRef<HTMLElement, QuickTilesProps>(function QuickTiles(
  { commands, selectedCommandId, openCommandId, draggingTitle, isDropActive, onLaunch, onRemove, onMove },
  ref,
) {
  return (
    <section
      ref={ref}
      className={clsx('qb-launcher-quick', isDropActive && 'is-drop-active', draggingTitle && 'is-dragging')}
    >
      <header className="qb-launcher-section-title">
        <span>常用置顶</span>
        <span className="qb-launcher-section-title__hint">
          {draggingTitle ? `放到这里：${draggingTitle}` : 'Alt 1–8'}
        </span>
      </header>

      {commands.length ? (
        <div className="qb-launcher-quick__grid">
          {commands.map((command, index) => (
            <div key={command.id}>
            <button
              type="button"
              className={clsx(
                'qb-launcher-tile',
                command.id === selectedCommandId && 'is-selected',
                command.id === openCommandId && 'is-open',
              )}
              onClick={() => onLaunch(command)}
              onContextMenu={(event) => {
                event.preventDefault()
                onRemove(command)
              }}
              title={`${command.description ?? command.title}（右键取消置顶）`}
            >
              <ToolIcon command={command} />
              <span className="qb-launcher-tile__copy">
                <span className="qb-launcher-tile__name">{command.title}</span>
                <span className="qb-launcher-tile__meta">{getCommandAlias(command) ?? command.description}</span>
              </span>
              {index < 8 ? (
                <span className="qb-launcher-tile__key">
                  <KeyboardShortcut keys={['Alt', String(index + 1)]} />
                </span>
              ) : null}
            </button>
            <div className="qb-quick-order">
              <button type="button" aria-label={`前移 ${command.title}`} disabled={index === 0} onClick={() => onMove(command.id, -1)}>←</button>
              <button type="button" aria-label={`后移 ${command.title}`} disabled={index === commands.length - 1} onClick={() => onMove(command.id, 1)}>→</button>
              <button type="button" aria-label={`取消置顶 ${command.title}`} onClick={() => onRemove(command)}>取消置顶</button>
            </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="qb-launcher-quick__empty">
          <Icon icon={Pin} size={13} tone="muted" />
          <span>拖进来，或选中后按 Ctrl+D</span>
        </div>
      )}
    </section>
  )
})

export default QuickTiles
