import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  AppWindow,
  ArrowRight,
  Command,
  LayoutPanelTop,
  PackageSearch,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { AppPage } from './page-types'
import { hideLauncherWindow } from '../api/window-api'
import { commandRegistry } from '../core/command/command-registry'
import { runCommand } from '../core/command/command-runner'
import { searchCommands } from '../core/command/command-search'
import type { CommandSearchResult, CommandSource } from '../core/command/command-types'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { useLauncherStore } from '../stores/launcher-store'
import {
  ActionPanel,
  type ActionPanelItem,
  CommandInput,
  EmptyState,
  Icon,
  KeyboardShortcut,
  List,
  ListItem,
  Tag,
  Toast,
  WindowShell,
} from '../ui'
import './LauncherPage.css'
import './Workbench.css'
import type { PageNavigationProps } from './page-types'
import PageHeader from './PageHeader'

interface ActiveViewState {
  viewId: string
  params?: Record<string, unknown>
}

function PluginViewRenderer({ activeView }: { activeView?: ActiveViewState }) {
  if (!activeView) {
    return null
  }

  const view = pluginRegistry.getView(activeView.viewId)

  if (!view) {
    return (
      <EmptyState
        icon={<Icon icon={AppWindow} size={20} tone="muted" />}
        title="视图不可用"
        description={`QuickBox 找不到视图 "${activeView.viewId}"。`}
      />
    )
  }

  const Component = view.component
  return (
    <div className="qb-launcher-plugin-view">
      <Component params={activeView.params} />
    </div>
  )
}

function getSourceTone(source: CommandSource): 'primary' | 'success' | 'warning' | 'default' {
  switch (source) {
    case 'builtin':
      return 'primary'
    case 'local':
      return 'success'
    case 'market':
      return 'warning'
    default:
      return 'default'
  }
}

function getSourceLabel(source: CommandSource) {
  switch (source) {
    case 'builtin':
      return '官方'
    case 'local':
      return '本地'
    case 'market':
      return '市场'
    default:
      return source
  }
}

function getExecuteModeLabel(mode: CommandSearchResult['command']['executeMode']) {
  return mode === 'view' ? '打开视图' : '直接执行'
}

function ResultDetail({
  result,
  totalCommands,
  onRun,
  onOpenActions,
}: {
  result?: CommandSearchResult
  totalCommands: number
  onRun: () => void
  onOpenActions: () => void
}) {
  if (!result) {
    return (
      <EmptyState
        icon={<Icon icon={Search} size={20} tone="muted" />}
        title="准备启动"
        description="搜索命令、打开工具，并用键盘完成整个 QuickBox 流程。"
        action={
          <span className="qb-launcher-empty-action">
            <KeyboardShortcut keys={['Alt', 'Space']} />
            <span>呼出 QuickBox</span>
          </span>
        }
      />
    )
  }

  return (
    <div className="qb-launcher-detail">
      <section className="qb-launcher-detail__hero">
        <div className="qb-launcher-detail__hero-top">
          <div className="qb-launcher-detail__hero-badge">
            <Icon icon={Command} size={22} tone="primary" />
          </div>
          <Tag tone={getSourceTone(result.command.source)}>
            {getSourceLabel(result.command.source)}
          </Tag>
        </div>

        <div className="qb-launcher-detail__hero-copy">
          <div className="qb-launcher-detail__eyebrow">当前命令</div>
          <div className="qb-launcher-detail__hero-title">{result.command.title}</div>
          <div className="qb-launcher-detail__hero-description">
            {result.command.description ??
              '一个为快速键盘工作流设计的 QuickBox 命令。'}
          </div>
        </div>

        <div className="qb-launcher-detail__hero-tags">
          <Tag tone="default">{getExecuteModeLabel(result.command.executeMode)}</Tag>
          <Tag tone="default">{result.command.pluginId}</Tag>
          <Tag tone="default">匹配度 {result.score.toFixed(2)}</Tag>
        </div>

        <div className="qb-launcher-detail__actionbar">
          <button className="qb-launcher-detail__action" type="button" onClick={onRun}>
            <KeyboardShortcut keys="Enter" />
            <span>执行命令</span>
          </button>
          <div className="qb-launcher-detail__action-copy">
            <KeyboardShortcut keys={['Ctrl', 'K']} />
            <span className="qb-launcher-footer__label">打开动作面板</span>
          </div>
        </div>
      </section>

      <div className="qb-launcher-detail__meta-grid">
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">来源</div>
          <div className="qb-launcher-detail__meta-value">
            {getSourceLabel(result.command.source)}
          </div>
        </div>
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">插件</div>
          <div className="qb-launcher-detail__meta-value">{result.command.pluginId}</div>
        </div>
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">命令库</div>
          <div className="qb-launcher-detail__meta-value">{totalCommands} 条命令</div>
        </div>
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">执行方式</div>
          <div className="qb-launcher-detail__meta-value">
            {getExecuteModeLabel(result.command.executeMode)}
          </div>
        </div>
      </div>

      <section className="qb-launcher-detail__summary">
        <div className="qb-launcher-detail__summary-title">接下来会发生什么</div>
        <div className="qb-launcher-detail__bullet-list">
          <div className="qb-launcher-detail__bullet">
            <Icon icon={ArrowRight} size={14} tone="primary" />
            <span>{getExecuteModeLabel(result.command.executeMode)}</span>
          </div>
          <div className="qb-launcher-detail__bullet">
            <Icon icon={ShieldCheck} size={14} tone="primary" />
            <span>工具视图会保持在 QuickBox 统一设计外壳内</span>
          </div>
          <div className="qb-launcher-detail__bullet">
            <Icon icon={Sparkles} size={14} tone="primary" />
            <span>匹配文本：{result.matchedText || result.command.title}</span>
          </div>
          <button className="qb-launcher-detail__inline-action" type="button" onClick={onOpenActions}>
            <KeyboardShortcut keys={['Ctrl', 'K']} />
            <span>打开动作面板，切换页面或执行当前命令</span>
          </button>
        </div>
      </section>
    </div>
  )
}

function groupResults(results: CommandSearchResult[]) {
  const order: CommandSource[] = ['builtin', 'local', 'market']

  return order
    .map((source) => ({
      source,
      items: results
        .map((result, index) => ({ result, index }))
        .filter((entry) => entry.result.command.source === source),
    }))
    .filter((section) => section.items.length > 0)
}

interface LauncherToastState {
  tone: 'default' | 'success' | 'warning' | 'danger'
  title: string
  description: string
}

export default function LauncherPage({ currentPage, onPageChange }: PageNavigationProps) {
  const {
    query,
    selectedIndex,
    activeViewId,
    activeViewParams,
    setQuery,
    setSelectedIndex,
    openView,
    closeView,
  } = useLauncherStore()
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false)
  const [actionQuery, setActionQuery] = useState('')
  const [toast, setToast] = useState<LauncherToastState | null>(null)

  const allCommands = useMemo(() => commandRegistry.list(), [])
  const results = useMemo(() => searchCommands(allCommands, query), [allCommands, query])
  const groupedResults = useMemo(() => groupResults(results), [results])

  const activeView = activeViewId
    ? {
        viewId: activeViewId,
        params: activeViewParams,
      }
    : undefined

  const selectedResult = results[selectedIndex]

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(results.length - 1, 0))
    }
  }, [results.length, selectedIndex, setSelectedIndex])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 2400)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsActionPanelOpen(true)
        return
      }

      if (event.key === 'Escape') {
        if (isActionPanelOpen) {
          setIsActionPanelOpen(false)
          return
        }

        if (activeViewId) {
          closeView()
          return
        }

        await hideLauncherWindow()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeViewId, closeView, isActionPanelOpen])

  const runResult = async (result: CommandSearchResult) => {
    await runCommand(result.command, {
      openView: async (viewId, params) => openView(viewId, params),
      closeView,
    })
  }

  const launchSelected = async () => {
    if (!selectedResult) {
      return
    }

    await runResult(selectedResult)
    setToast({
      tone: 'success',
      title: selectedResult.command.executeMode === 'view' ? '已打开工具视图' : '命令已执行',
      description: selectedResult.command.title,
    })
  }

  const navigateToPage = (page: AppPage) => {
    onPageChange(page)
    setIsActionPanelOpen(false)
    setToast({
      tone: 'default',
      title: '已切换工作区',
      description:
        page === 'plugins'
          ? '正在查看插件能力。'
          : page === 'settings'
            ? '正在调整启动器行为。'
            : '已回到启动器。',
    })
  }

  const actionItems: ActionPanelItem[] = [
    {
      id: 'run-selected',
      title: selectedResult ? `执行 ${selectedResult.command.title}` : '执行选中命令',
      description: selectedResult
        ? getExecuteModeLabel(selectedResult.command.executeMode)
        : '请先选择一个命令',
      icon: <Icon icon={selectedResult?.command.executeMode === 'view' ? AppWindow : Command} size={16} tone="primary" />,
      shortcut: 'Enter',
      disabled: !selectedResult,
      keywords: ['run', 'open', 'selected', 'command', '执行', '打开', '命令'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void launchSelected()
      },
    },
    {
      id: 'clear-search',
      title: '清空搜索',
      description: '重置当前搜索词，并回到完整命令库。',
      icon: <Icon icon={Search} size={16} tone="muted" />,
      shortcut: 'Esc',
      keywords: ['clear', 'reset', 'search', '清空', '重置', '搜索'],
      onAction: () => {
        setQuery('')
        setSelectedIndex(0)
        setIsActionPanelOpen(false)
      },
    },
    {
      id: 'go-launcher',
      title: '打开启动器',
      description: '回到主命令搜索工作区。',
      icon: <Icon icon={Command} size={16} tone="primary" />,
      shortcut: 'Ctrl+1',
      keywords: ['launcher', 'home', 'workspace', '启动器', '首页', '工作区'],
      onAction: () => navigateToPage('launcher'),
    },
    {
      id: 'go-plugins',
      title: '打开插件',
      description: '查看官方工具、权限和启用状态。',
      icon: <Icon icon={LayoutPanelTop} size={16} tone="primary" />,
      shortcut: 'Ctrl+2',
      keywords: ['plugins', 'catalog', 'extensions', '插件', '能力', '扩展'],
      onAction: () => navigateToPage('plugins'),
    },
    {
      id: 'go-settings',
      title: '打开设置',
      description: '调整主题、呼出方式和桌面集成。',
      icon: <Icon icon={Settings2} size={16} tone="primary" />,
      shortcut: 'Ctrl+3',
      keywords: ['settings', 'preferences', 'theme', '设置', '偏好', '主题'],
      onAction: () => navigateToPage('settings'),
    },
    {
      id: 'hide-launcher',
      title: '隐藏 QuickBox',
      description: '收起启动器窗口并回到桌面。',
      icon: <Icon icon={AppWindow} size={16} tone="muted" />,
      shortcut: 'Esc',
      keywords: ['hide', 'dismiss', 'close', '隐藏', '关闭'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void hideLauncherWindow()
      },
    },
  ]

  if (activeViewId) {
    actionItems.unshift({
      id: 'close-view',
      title: '返回搜索结果',
      description: '关闭当前工具视图，回到命令详情面板。',
      icon: <Icon icon={ArrowRight} size={16} tone="primary" />,
      shortcut: 'Esc',
      keywords: ['back', 'close', 'view', '返回', '关闭', '视图'],
      onAction: () => {
        closeView()
        setIsActionPanelOpen(false)
      },
    })
  }

  const handleInputKeyDown = async (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, Math.max(results.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      await launchSelected()
    }
  }

  return (
    <WindowShell
      mode="split"
      title={
        <PageHeader
          currentPage={currentPage}
          onPageChange={onPageChange}
          eyebrow="工作区"
          title="QuickBox 启动器"
          description="用于命令搜索、工具预览和快速键盘执行的桌面入口。"
        />
      }
      footer={
        <div className="qb-launcher-footer">
          <div className="qb-launcher-footer__left">
            <span className="qb-launcher-footer__label">导航</span>
            <KeyboardShortcut keys={['Up', 'Down']} />
            <KeyboardShortcut keys="Enter" />
            <KeyboardShortcut keys="Esc" />
          </div>
          <div className="qb-launcher-footer__right">
            <span className="qb-launcher-footer__label">{results.length} 条结果</span>
            <KeyboardShortcut keys={['Ctrl', 'K']} />
            <span className="qb-launcher-footer__label">动作</span>
          </div>
        </div>
      }
    >
      <div className="qb-launcher-page">
        <aside className="qb-launcher-page__rail">
          <div className="qb-launcher-search">
            <div className="qb-launcher-search__meta">
              <div className="qb-launcher-search__meta-group">
                <span className="qb-launcher-search__label">命令搜索</span>
                <Tag tone="primary">已载入 {allCommands.length} 条</Tag>
              </div>
              <div className="qb-launcher-search__meta-group">
                <Tag tone="default">键盘优先</Tag>
              </div>
            </div>

          <CommandInput
            autoFocus
            className="qb-launcher-command-input"
            value={query}
            onChange={setQuery}
            onKeyDown={handleInputKeyDown}
            placeholder="搜索命令、内置工具或插件动作"
          />
          </div>

          <List
            className="qb-launcher-list"
            emptyState={
              <EmptyState
                icon={<Icon icon={PackageSearch} size={20} tone="muted" />}
                title="没有匹配的命令"
                description="换一个更宽泛的关键词，或稍后启用更多内置工具。"
              />
            }
          >
            {groupedResults.map((section) => (
              <List.Section
                key={section.source}
                title={`${getSourceLabel(section.source)}命令`}
              >
                {section.items.map(({ result, index }) => (
                  <ListItem
                    key={result.command.id}
                    id={result.command.id}
                    selected={index === selectedIndex}
                    height={result.command.description ? 'comfortable' : 'compact'}
                    onClick={() => {
                      setSelectedIndex(index)
                    }}
                    icon={
                      <Icon
                        icon={result.command.executeMode === 'view' ? AppWindow : Command}
                        size={18}
                        tone={index === selectedIndex ? 'primary' : 'muted'}
                      />
                    }
                    title={
                      <span className="qb-launcher-list-item__title">
                        <span className="qb-launcher-list-item__title-text">
                          {result.command.title}
                        </span>
                      </span>
                    }
                    subtitle={
                      result.command.description ? (
                        <span className="qb-launcher-list-item__subtitle">
                          <span>{result.command.description}</span>
                        </span>
                      ) : undefined
                    }
                    accessory={
                      index === selectedIndex ? (
                        <span className="qb-launcher-list-item__accessory">
                          <Tag tone="primary">当前</Tag>
                          <KeyboardShortcut keys="Enter" />
                        </span>
                      ) : (
                        <Tag tone={getSourceTone(result.command.source)}>
                          <span className="qb-launcher-list-item__source">
                            {getSourceLabel(result.command.source)}
                          </span>
                        </Tag>
                      )
                    }
                  />
                ))}
              </List.Section>
            ))}
          </List>
        </aside>

        <section className="qb-launcher-page__detail qb-scrollbar">
          {activeView ? (
            <PluginViewRenderer activeView={activeView} />
          ) : (
            <ResultDetail
              result={selectedResult}
              totalCommands={allCommands.length}
              onRun={() => {
                void launchSelected()
              }}
              onOpenActions={() => setIsActionPanelOpen(true)}
            />
          )}
        </section>

        <ActionPanel
          open={isActionPanelOpen}
          title="启动器动作"
          description="切换工作区，或对当前选中项执行聚焦操作。"
          actions={actionItems}
          query={actionQuery}
          onQueryChange={setActionQuery}
          onClose={() => {
            setActionQuery('')
            setIsActionPanelOpen(false)
          }}
        />

        {toast ? (
          <div className="qb-launcher-toast-layer">
            <Toast
              tone={toast.tone}
              title={toast.title}
              description={toast.description}
              onDismiss={() => setToast(null)}
            />
          </div>
        ) : null}
      </div>
    </WindowShell>
  )
}
