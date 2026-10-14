import { Pin, PinOff, Search } from 'lucide-react'
import type { Command as QuickBoxCommand, CommandSource, CommandUsageInfo } from '../../../core/command/command-types'
import { EmptyState, Icon, KeyboardShortcut } from '../../../ui'
import { formatLastRun, getToolMeta } from '../launcher-catalog'
import { ToolIcon } from './ToolIcon'

const SOURCE_LABELS: Record<CommandSource, string> = {
  builtin: '官方',
  local: '本地',
  market: '市场',
}

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
  if (!command) {
    return (
      <EmptyState
        icon={<Icon icon={Search} size={20} tone="muted" />}
        title="没有选中的工具"
        description="换个关键词或分类试试。"
      />
    )
  }

  const { category } = getToolMeta(command)
  const keywords = command.keywords.filter(Boolean).slice(0, 8)

  return (
    <div className="qb-launcher-detail">
      <div className="qb-launcher-detail__scroll qb-scrollbar">
        <header className="qb-launcher-detail__head">
          <ToolIcon command={command} size="lg" />
          <div className="qb-launcher-detail__head-copy">
            <h2 className="qb-launcher-detail__title">{command.title}</h2>
            <div className="qb-launcher-detail__category">
              {category.name}
              <span className="qb-launcher-detail__sep">·</span>
              {SOURCE_LABELS[command.source] ?? command.source}
            </div>
          </div>
        </header>

        <p className="qb-launcher-detail__desc">{command.description ?? '一个 QuickBox 工具。'}</p>

        <dl className="qb-launcher-detail__meta">
          <div className="qb-launcher-detail__meta-row">
            <dt>打开方式</dt>
            <dd>{command.executeMode === 'view' ? '工具视图' : '直接执行'}</dd>
          </div>
          <div className="qb-launcher-detail__meta-row">
            <dt>使用次数</dt>
            <dd>{usage?.runCount ?? 0} 次</dd>
          </div>
          <div className="qb-launcher-detail__meta-row">
            <dt>最近使用</dt>
            <dd>{formatLastRun(usage?.lastRunAt)}</dd>
          </div>
          <div className="qb-launcher-detail__meta-row">
            <dt>插件</dt>
            <dd className="qb-launcher-detail__mono">{command.pluginId}</dd>
          </div>
        </dl>

        {keywords.length ? (
          <div className="qb-launcher-detail__keywords">
            <div className="qb-launcher-section-title">搜索关键词</div>
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
        <button
          type="button"
          className={`qb-launcher-btn${isQuick ? ' is-on' : ''}`}
          onClick={onToggleQuick}
          aria-pressed={isQuick}
        >
          <Icon icon={isQuick ? PinOff : Pin} size={14} />
          <span>{isQuick ? '取消固定' : '固定到常用'}</span>
          <KeyboardShortcut keys={['Ctrl', 'D']} />
        </button>
        <button type="button" className="qb-launcher-btn" onClick={onOpenActions}>
          <span>更多动作</span>
          <KeyboardShortcut keys={['Ctrl', 'K']} />
        </button>
        <button type="button" className="qb-launcher-btn qb-launcher-btn--primary" onClick={onRun}>
          <span>{command.executeMode === 'view' ? '打开工具' : '执行命令'}</span>
          <KeyboardShortcut keys="Enter" />
        </button>
      </footer>
    </div>
  )
}

export default ToolDetail
