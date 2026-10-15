import { AppWindow, Pin, PinOff } from 'lucide-react'
import type { Command as QuickBoxCommand } from '../../../core/command/command-types'
import { pluginRegistry } from '../../../core/plugin/plugin-registry'
import { EmptyState, Icon, KeyboardShortcut } from '../../../ui'
import { getToolMeta } from '../launcher-catalog'
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
  const view = pluginRegistry.getView(viewId)
  const categoryName = command ? getToolMeta(command).category.name : undefined

  return (
    <div className="qb-launcher-view">
      <header className="qb-launcher-view__bar">
        {command ? <ToolIcon command={command} /> : null}
        <div className="qb-launcher-view__copy">
          <div className="qb-launcher-view__title">{command?.title ?? view?.title ?? viewId}</div>
          {categoryName ? <div className="qb-launcher-view__sub">{categoryName}</div> : null}
        </div>
        {command ? (
          <button
            type="button"
            className={isQuick ? 'qb-launcher-icon-btn is-on' : 'qb-launcher-icon-btn'}
            onClick={onToggleQuick}
            title={isQuick ? '取消置顶' : '置顶到常用'}
          >
            <Icon icon={isQuick ? PinOff : Pin} size={14} />
          </button>
        ) : null}
        <button type="button" className="qb-launcher-icon-btn" onClick={onOpenActions} title="更多动作">
          <KeyboardShortcut keys={['Ctrl', 'K']} />
        </button>
      </header>

      <div className="qb-launcher-view__body qb-scrollbar">
        {view ? (
          <ToolErrorBoundary key={viewId === 'official.task-tool.view' ? viewId : `${viewId}:${params?.requestId ?? ''}`}>
            <Suspense fallback={<p role="status">正在加载工具…</p>}>
              <ToolProvider viewId={viewId} params={params}>
                <view.component params={params} />
              </ToolProvider>
            </Suspense>
          </ToolErrorBoundary>
        ) : (
          <EmptyState
            icon={<Icon icon={AppWindow} size={20} tone="muted" />}
            title="视图不可用"
            description={`找不到视图 "${viewId}"。`}
          />
        )}
      </div>
    </div>
  )
}

export default ToolViewPane
