import { forwardRef } from 'react'
import clsx from 'clsx'
import { Pin } from 'lucide-react'
import type { Command as QuickBoxCommand } from '../../../core/command/command-types'
import { localizeCommand, useLocale, useT } from '../../../i18n'
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
  const locale = useLocale()
  const tr = useT()
  return (
    <section
      ref={ref}
      className={clsx('qb-launcher-quick', isDropActive && 'is-drop-active', draggingTitle && 'is-dragging')}
    >
      <header className="qb-launcher-section-title">
        <span>{tr('常用置顶', 'Pinned')}</span>
        <span className="qb-launcher-section-title__hint">
          {draggingTitle ? tr(`放到这里：${draggingTitle}`, `Drop here: ${draggingTitle}`) : 'Alt 1–8'}
        </span>
      </header>

      {commands.length ? (
        <div className="qb-launcher-quick__grid">
          {commands.map((command, index) => {
            const localized = localizeCommand(command, locale)
            return <div key={command.id}>
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
                title={tr(`${localized.description || localized.title}（右键取消置顶）`, `${localized.description || localized.title} (Right-click to unpin)`)}
              >
                <ToolIcon command={command} />
                <span className="qb-launcher-tile__copy">
                  <span className="qb-launcher-tile__name">{localized.title}</span>
                  <span className="qb-launcher-tile__meta">{getCommandAlias(command) ?? localized.description}</span>
                </span>
                {index < 8 ? (
                  <span className="qb-launcher-tile__key">
                    <KeyboardShortcut keys={['Alt', String(index + 1)]} />
                  </span>
                ) : null}
              </button>
              <div className="qb-quick-order">
                <button type="button" aria-label={tr(`前移 ${localized.title}`, `Move ${localized.title} left`)} disabled={index === 0} onClick={() => onMove(command.id, -1)}>←</button>
                <button type="button" aria-label={tr(`后移 ${localized.title}`, `Move ${localized.title} right`)} disabled={index === commands.length - 1} onClick={() => onMove(command.id, 1)}>→</button>
                <button type="button" aria-label={tr(`取消置顶 ${localized.title}`, `Unpin ${localized.title}`)} onClick={() => onRemove(command)}>{tr('取消置顶', 'Unpin')}</button>
              </div>
            </div>
          })}
        </div>
      ) : (
        <div className="qb-launcher-quick__empty">
          <Icon icon={Pin} size={13} tone="muted" />
          <span>{tr('拖进来，或选中后按 Ctrl+D', 'Drag a tool here or press Ctrl+D')}</span>
        </div>
      )}
    </section>
  )
})

export default QuickTiles
