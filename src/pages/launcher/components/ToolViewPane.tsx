import { AppWindow, Pin, PinOff } from 'lucide-react'
import type { Command as QuickBoxCommand } from '../../../core/command/command-types'
import { pluginRegistry } from '../../../core/plugin/plugin-registry'
import { localizeCommand, localizeViewTitle, useLocale, useT } from '../../../i18n'
import { EmptyState, Icon, KeyboardShortcut } from '../../../ui'
import { getCategoryLabel, getToolMeta } from '../launcher-catalog'
import { ToolIcon } from './ToolIcon'
import { Suspense } from 'react'
import { ToolErrorBoundary } from '../../../ui/ErrorState/ToolErrorBoundary'
import { ToolProvider } from '../../../core/tool/tool-context'

export interface ToolViewPaneProps {
  viewId: string
  params?: Record<string, unknown>
  command?: QuickBoxCommand
  isQuick: boolean
  onToggleQuick: () => void
  onOpenActions: () => void
}

/** 右侧工作台：标题条 + 正在打开的工具 */
export function ToolViewPane({
  viewId,
  params,
  command,
  isQuick,
  onToggleQuick,
  onOpenActions,
}: ToolViewPaneProps) {
  const locale = useLocale()
  const tr = useT()
  const view = pluginRegistry.getView(viewId)
  const categoryName = command ? getCategoryLabel(getToolMeta(command).category, locale) : undefined
  const title = command
    ? localizeCommand(command, locale).title
    : localizeViewTitle(viewId, view?.title ?? viewId, locale)

  return (
    <div className="qb-launcher-view">
      <header className="qb-launcher-view__bar">
        {command ? <ToolIcon command={command} /> : null}
        <div className="qb-launcher-view__copy">
          <div className="qb-launcher-view__title">{title}</div>
          {categoryName ? <div className="qb-launcher-view__sub">{categoryName}</div> : null}
        </div>
        {command ? (
          <button
            type="button"
            className={isQuick ? 'qb-launcher-icon-btn is-on' : 'qb-launcher-icon-btn'}
            onClick={onToggleQuick}
            title={isQuick ? tr('取消置顶', 'Unpin') : tr('置顶到常用', 'Pin to Quick Access')}
          >
            <Icon icon={isQuick ? PinOff : Pin} size={14} />
          </button>
        ) : null}
        <button type="button" className="qb-launcher-icon-btn" onClick={onOpenActions} title={tr('更多动作', 'More Actions')}>
          <KeyboardShortcut keys={['Ctrl', 'K']} />
        </button>
      </header>

      <div className="qb-launcher-view__body qb-scrollbar">
        {view ? (
          <ToolErrorBoundary key={viewId === 'official.task-tool.view' ? viewId : `${viewId}:${params?.requestId ?? ''}`}>
            <Suspense fallback={<p role="status">{tr('正在加载工具…', 'Loading tool…')}</p>}>
              <ToolProvider viewId={viewId} params={params}>
                <view.component params={params} />
              </ToolProvider>
            </Suspense>
          </ToolErrorBoundary>
        ) : (
          <EmptyState
            icon={<Icon icon={AppWindow} size={20} tone="muted" />}
            title={tr('视图不可用', 'View unavailable')}
            description={tr(`找不到视图 "${viewId}"。`, `View "${viewId}" could not be found.`)}
          />
        )}
      </div>
    </div>
  )
}

export default ToolViewPane
