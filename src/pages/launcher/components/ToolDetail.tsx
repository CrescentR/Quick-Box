import { Pin, PinOff, Search } from 'lucide-react'
import type { Command as QuickBoxCommand, CommandSource, CommandUsageInfo } from '../../../core/command/command-types'
import { pluginRegistry } from '../../../core/plugin/plugin-registry'
import { localizeCommand, localizePlugin, useLocale, useT } from '../../../i18n'
import { EmptyState, Icon, KeyboardShortcut } from '../../../ui'
import { formatLastRun, getCategoryLabel, getToolMeta } from '../launcher-catalog'
import { ToolIcon } from './ToolIcon'

export interface ToolDetailProps {
  command?: QuickBoxCommand
  usage?: CommandUsageInfo
  isQuick: boolean
  onRun: () => void
  onToggleQuick: () => void
  onOpenActions: () => void
}

/** 右侧工具详情面板 */
export function ToolDetail({ command, usage, isQuick, onRun, onToggleQuick, onOpenActions }: ToolDetailProps) {
  const locale = useLocale()
  const tr = useT()

  const sourceLabels: Record<CommandSource, string> = {
    builtin: tr('官方内置', 'Built-in'),
    local: tr('本地扩展', 'Local'),
    market: tr('插件市场', 'Marketplace'),
  }

  if (!command) {
    return (
      <EmptyState
        icon={<Icon icon={Search} size={20} tone="muted" />}
        title={tr('没有选中的工具', 'No tool selected')}
        description={tr('换个关键词或分类试试。', 'Try another keyword or category.')}
      />
    )
  }

  const { category } = getToolMeta(command)
  const localizedCommand = localizeCommand(command, locale)
  const plugin = pluginRegistry.getPlugin(command.pluginId)
  const pluginName = plugin ? localizePlugin(plugin, locale).name : command.pluginId
  const keywords = command.keywords.filter(Boolean).slice(0, 8)

  return (
    <div className="qb-launcher-detail">
      <div className="qb-launcher-detail__scroll qb-scrollbar">
        <header className="qb-launcher-detail__head">
          <ToolIcon command={command} size="lg" />
          <div className="qb-launcher-detail__head-copy">
            <h2 className="qb-launcher-detail__title">{localizedCommand.title}</h2>
            <div className="qb-launcher-detail__category">
              {getCategoryLabel(category, locale)}
              <span className="qb-launcher-detail__sep">·</span>
              {sourceLabels[command.source] ?? command.source}
            </div>
          </div>
        </header>

        <p className="qb-launcher-detail__desc">{localizedCommand.description || tr('一个 QuickBox 工具。', 'A QuickBox utility tool.')}</p>

        <dl className="qb-launcher-detail__meta">
          <div className="qb-launcher-detail__meta-row">
            <dt>{tr('打开方式', 'Execution')}</dt>
            <dd>{command.executeMode === 'view' ? tr('独立工具视图', 'Tool View') : tr('直接执行', 'Direct Action')}</dd>
          </div>
          <div className="qb-launcher-detail__meta-row">
            <dt>{tr('所属插件', 'Plugin')}</dt>
            <dd>{pluginName}</dd>
          </div>
          <div className="qb-launcher-detail__meta-row">
            <dt>{tr('使用次数', 'Run Count')}</dt>
            <dd>{tr(`${usage?.runCount ?? 0} 次`, `${usage?.runCount ?? 0}`)}</dd>
          </div>
          <div className="qb-launcher-detail__meta-row">
            <dt>{tr('最近使用', 'Last Used')}</dt>
            <dd>{formatLastRun(usage?.lastRunAt, locale)}</dd>
          </div>
        </dl>

        {keywords.length ? (
          <div className="qb-launcher-detail__keywords">
            <div className="qb-launcher-section-title">{tr('搜索关键词', 'Keywords')}</div>
            <div className="qb-launcher-detail__keyword-list">
              {keywords.map((keyword) => (
                <span key={keyword} className="qb-launcher-detail__keyword">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <footer className="qb-launcher-detail__actions">
        <button type="button" className="qb-launcher-btn qb-launcher-btn--primary" onClick={onRun}>
          <span>{command.executeMode === 'view' ? tr(`打开 ${localizedCommand.title}`, `Open ${localizedCommand.title}`) : tr(`执行 ${localizedCommand.title}`, `Run ${localizedCommand.title}`)}</span>
          <KeyboardShortcut keys="Enter" />
        </button>
        <div className="qb-launcher-detail__action-row">
          <button
            type="button"
            className={`qb-launcher-btn${isQuick ? ' is-on' : ''}`}
            onClick={onToggleQuick}
            aria-pressed={isQuick}
          >
            <Icon icon={isQuick ? PinOff : Pin} size={14} />
            <span>{isQuick ? tr('已置顶常用', 'Pinned') : tr('置顶到常用', 'Pin Tool')}</span>
            <KeyboardShortcut keys={['Ctrl', 'D']} />
          </button>
          <button type="button" className="qb-launcher-btn" onClick={onOpenActions}>
            <span>{tr('更多动作', 'More Actions')}</span>
            <KeyboardShortcut keys={['Ctrl', 'K']} />
          </button>
        </div>
      </footer>
    </div>
  )
}

export default ToolDetail
