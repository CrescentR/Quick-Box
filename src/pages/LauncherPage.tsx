import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  AppWindow,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Command,
  LayoutPanelTop,
  PackageSearch,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  StarOff,
  X,
} from 'lucide-react'
import type { AppPage } from './page-types'
import { loadCommandUsage, recordCommandUsage } from '../api/command-usage-api'
import { hideLauncherWindow } from '../api/window-api'
import { commandRegistry } from '../core/command/command-registry'
import { runCommand } from '../core/command/command-runner'
import { searchCommands } from '../core/command/command-search'
import type { Command as QuickBoxCommand, CommandSearchResult, CommandSource } from '../core/command/command-types'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { useLauncherStore } from '../stores/launcher-store'
import { usePluginStore } from '../stores/plugin-store'
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
  isQuick,
  onRun,
  onToggleQuick,
  onOpenActions,
}: {
  result?: CommandSearchResult
  totalCommands: number
  isQuick: boolean
  onRun: () => void
  onToggleQuick: () => void
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
          <div className="qb-launcher-detail__action-group">
            <button className="qb-launcher-detail__action" type="button" onClick={onRun}>
              <KeyboardShortcut keys="Enter" />
              <span>执行命令</span>
            </button>
            <button
              className="qb-launcher-detail__action qb-launcher-detail__action--secondary"
              type="button"
              onClick={onToggleQuick}
              aria-pressed={isQuick}
              title={isQuick ? '从快捷工具移除' : '加入快捷工具'}
            >
              <Icon icon={isQuick ? StarOff : Star} size={15} tone={isQuick ? 'warning' : 'muted'} />
              <span>{isQuick ? '移出快捷' : '设为快捷'}</span>
            </button>
          </div>
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

const COMMAND_LIST_COLLAPSED_STORAGE_KEY = 'quickbox.launcher.commandListCollapsed'
const QUICK_COMMAND_IDS_STORAGE_KEY = 'quickbox.launcher.quickCommandIds'

function readBooleanPreference(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(key) === 'true'
}

function readStringArrayPreference(key: string) {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writePreference(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
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
  const [isCommandListCollapsed, setIsCommandListCollapsed] = useState(() =>
    readBooleanPreference(COMMAND_LIST_COLLAPSED_STORAGE_KEY, false),
  )
  const [quickCommandIds, setQuickCommandIds] = useState<string[]>(() =>
    readStringArrayPreference(QUICK_COMMAND_IDS_STORAGE_KEY),
  )
  const [usageByCommandId, setUsageByCommandId] = useState<Record<string, { runCount: number; lastRunAt?: string }>>({})
  const commandListRef = useRef<HTMLDivElement>(null)
  const selectedCommandIdRef = useRef<string>()
  const { enabledPluginIds, status: pluginStatus } = usePluginStore()

  const allCommands = useMemo(() => {
    const commands = commandRegistry.list()

    if (pluginStatus === 'idle' || pluginStatus === 'loading') {
      return commands
    }

    const enabledPlugins = new Set(enabledPluginIds)
    return commands.filter((command) => enabledPlugins.has(command.pluginId))
  }, [enabledPluginIds, pluginStatus])
  const commandById = useMemo(
    () => new Map(allCommands.map((command) => [command.id, command])),
    [allCommands],
  )
  const quickCommands = useMemo(
    () =>
      quickCommandIds
        .map((commandId) => commandById.get(commandId))
        .filter((command): command is QuickBoxCommand => Boolean(command)),
    [commandById, quickCommandIds],
  )
  const results = useMemo(() => searchCommands(allCommands, query, usageByCommandId), [allCommands, query, usageByCommandId])
  const groupedResults = useMemo(() => groupResults(results), [results])

  const activeView = activeViewId
    ? {
        viewId: activeViewId,
        params: activeViewParams,
      }
    : undefined

  const selectedResult = results[selectedIndex]
  const selectedIsQuick = selectedResult ? quickCommandIds.includes(selectedResult.command.id) : false

  const launchCommand = useCallback(
    async (command: QuickBoxCommand) => {
      await runCommand(command, {
        openView: async (viewId, params) => openView(viewId, params),
        closeView,
      })
      try {
        const usage = await recordCommandUsage(command.id)
        setUsageByCommandId((current) => ({
          ...current,
          [usage.commandId]: {
            runCount: usage.runCount,
            lastRunAt: usage.lastRunAt,
          },
        }))
      } catch {
        // 使用记录不应阻断命令本身执行。
      }
    },
    [closeView, openView],
  )

  const runResult = useCallback(
    async (result: CommandSearchResult) => {
      await launchCommand(result.command)
    },
    [launchCommand],
  )

  const toggleQuickCommand = useCallback(
    (command: QuickBoxCommand) => {
      const isQuickCommand = quickCommandIds.includes(command.id)
      setQuickCommandIds(
        isQuickCommand
          ? quickCommandIds.filter((commandId) => commandId !== command.id)
          : [command.id, ...quickCommandIds.filter((commandId) => commandId !== command.id)].slice(0, 12),
      )
      setToast({
        tone: isQuickCommand ? 'default' : 'success',
        title: isQuickCommand ? '已移出快捷工具' : '已加入快捷工具',
        description: command.title,
      })
    },
    [quickCommandIds],
  )

  const launchQuickCommand = useCallback(
    async (command: QuickBoxCommand) => {
      await launchCommand(command)
      setToast({
        tone: 'success',
        title: command.executeMode === 'view' ? '已打开快捷工具' : '快捷命令已执行',
        description: command.title,
      })
    },
    [launchCommand],
  )

  const selectResult = useCallback(
    async (index: number) => {
      const nextIndex = Math.min(Math.max(index, 0), Math.max(results.length - 1, 0))
      const nextResult = results[nextIndex]

      selectedCommandIdRef.current = nextResult?.command.id
      setSelectedIndex(nextIndex)

      if (!nextResult) {
        closeView()
        return
      }

      if (activeViewId) {
        await runResult(nextResult)
      }
    },
    [activeViewId, closeView, results, runResult, setSelectedIndex],
  )

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      selectedCommandIdRef.current = undefined
      setQuery(nextQuery)

      if (activeViewId) {
        closeView()
      }
    },
    [activeViewId, closeView, setQuery],
  )

  const launchSelected = useCallback(async () => {
    if (!selectedResult) {
      return
    }

    selectedCommandIdRef.current = selectedResult.command.id
    await runResult(selectedResult)
    setToast({
      tone: 'success',
      title: selectedResult.command.executeMode === 'view' ? '已打开工具视图' : '命令已执行',
      description: selectedResult.command.title,
    })
  }, [runResult, selectedResult])

  useEffect(() => {
    let cancelled = false

    async function hydrateUsage() {
      try {
        const usage = await loadCommandUsage()
        if (cancelled) return
        setUsageByCommandId(
          Object.fromEntries(
            usage.map((item) => [
              item.commandId,
              {
                runCount: item.runCount,
                lastRunAt: item.lastRunAt,
              },
            ]),
          ),
        )
      } catch {
        if (!cancelled) {
          setUsageByCommandId({})
        }
      }
    }

    void hydrateUsage()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const selectedCommandId = selectedCommandIdRef.current

    if (selectedCommandId) {
      const nextIndex = results.findIndex((result) => result.command.id === selectedCommandId)

      if (nextIndex >= 0) {
        if (nextIndex !== selectedIndex) {
          setSelectedIndex(nextIndex)
        }
        return
      }

      selectedCommandIdRef.current = undefined
    }

    if (selectedIndex >= results.length) {
      const nextIndex = Math.max(results.length - 1, 0)
      selectedCommandIdRef.current = results[nextIndex]?.command.id
      setSelectedIndex(nextIndex)
    }
  }, [results, selectedIndex, setSelectedIndex])

  useEffect(() => {
    if (isCommandListCollapsed) {
      return
    }

    const listRoot = commandListRef.current
    const viewport = listRoot?.querySelector<HTMLElement>('.qb-list__viewport')
    const selectedItem = listRoot?.querySelector<HTMLElement>('[data-qb-command-selected="true"]')

    if (!viewport || !selectedItem) {
      return
    }

    const viewportRect = viewport.getBoundingClientRect()
    const itemRect = selectedItem.getBoundingClientRect()
    const edgeBuffer = Math.min(96, Math.max(48, viewport.clientHeight * 0.24))
    let nextScrollTop = viewport.scrollTop

    if (itemRect.bottom > viewportRect.bottom - edgeBuffer) {
      nextScrollTop += itemRect.bottom - (viewportRect.bottom - edgeBuffer)
    } else if (itemRect.top < viewportRect.top + edgeBuffer) {
      nextScrollTop -= viewportRect.top + edgeBuffer - itemRect.top
    }

    if (nextScrollTop !== viewport.scrollTop) {
      viewport.scrollTo({
        top: nextScrollTop,
        behavior: 'smooth',
      })
    }
  }, [isCommandListCollapsed, results, selectedIndex])

  useEffect(() => {
    writePreference(COMMAND_LIST_COLLAPSED_STORAGE_KEY, String(isCommandListCollapsed))
  }, [isCommandListCollapsed])

  useEffect(() => {
    writePreference(QUICK_COMMAND_IDS_STORAGE_KEY, quickCommandIds)
  }, [quickCommandIds])

  useEffect(() => {
    if (!activeViewId || pluginStatus === 'idle' || pluginStatus === 'loading') {
      return
    }

    const plugin = pluginRegistry.getPluginByView(activeViewId)
    if (plugin && !enabledPluginIds.includes(plugin.id)) {
      closeView()
    }
  }, [activeViewId, closeView, enabledPluginIds, pluginStatus])

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
      const isCommandModifier = event.ctrlKey || event.metaKey
      const target = event.target instanceof HTMLElement ? event.target : null
      const isLauncherSearch = Boolean(target?.closest('[data-qb-launcher-search="true"]'))
      const isEditingToolField = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]')) && !isLauncherSearch

      if (event.altKey && event.code === 'Space') {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (isCommandModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        event.stopPropagation()
        setIsActionPanelOpen(true)
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()

        if (isActionPanelOpen) {
          setIsActionPanelOpen(false)
          return
        }

        if (activeViewId) {
          closeView()
          return
        }

        await hideLauncherWindow()
        return
      }

      if (isActionPanelOpen || isEditingToolField) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        await selectResult(selectedIndex + 1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        await selectResult(selectedIndex - 1)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        await launchSelected()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [
    activeViewId,
    closeView,
    isActionPanelOpen,
    launchSelected,
    selectResult,
    selectedIndex,
  ])

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
      id: 'toggle-quick-selected',
      title: selectedResult
        ? selectedIsQuick
          ? `移出快捷工具：${selectedResult.command.title}`
          : `加入快捷工具：${selectedResult.command.title}`
        : '加入快捷工具',
      description: selectedResult ? '把当前命令放到左侧快捷工具区。' : '请先选择一个命令',
      icon: <Icon icon={selectedIsQuick ? StarOff : Star} size={16} tone={selectedIsQuick ? 'warning' : 'muted'} />,
      shortcut: 'Star',
      disabled: !selectedResult,
      keywords: ['quick', 'favorite', 'pin', '快捷', '收藏', '常用'],
      onAction: () => {
        if (selectedResult) {
          toggleQuickCommand(selectedResult.command)
        }
        setIsActionPanelOpen(false)
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
        selectedCommandIdRef.current = undefined
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
      await selectResult(selectedIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      await selectResult(selectedIndex - 1)
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
            id="quickbox-command-search"
            name="quickbox-command-search"
            autoFocus
            className="qb-launcher-command-input"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleInputKeyDown}
            data-qb-launcher-search="true"
            placeholder="搜索命令、内置工具或插件动作"
          />
          </div>

          <section className="qb-launcher-quick">
            <header className="qb-launcher-section-header">
              <div className="qb-launcher-section-header__copy">
                <span className="qb-launcher-search__label">快捷工具</span>
                <Tag tone={quickCommands.length ? 'success' : 'default'}>{quickCommands.length} 个</Tag>
              </div>
            </header>
            {quickCommands.length ? (
              <div className="qb-launcher-quick__list qb-scrollbar">
                {quickCommands.map((command) => (
                  <div className="qb-launcher-quick__row" key={command.id}>
                    <button
                      className="qb-launcher-quick__run"
                      type="button"
                      onClick={() => {
                        void launchQuickCommand(command)
                      }}
                      title={`打开 ${command.title}`}
                    >
                      <Icon icon={command.executeMode === 'view' ? AppWindow : Command} size={16} tone="primary" />
                      <span className="qb-launcher-quick__text">
                        <span className="qb-launcher-quick__title">{command.title}</span>
                        <span className="qb-launcher-quick__description">{command.description}</span>
                      </span>
                    </button>
                    <button
                      className="qb-launcher-quick__remove"
                      type="button"
                      onClick={() => toggleQuickCommand(command)}
                      title="移出快捷工具"
                      aria-label={`移出快捷工具：${command.title}`}
                    >
                      <Icon icon={X} size={14} tone="muted" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="qb-launcher-quick__empty">
                选中命令后点击星标，把常用工具放在这里。
              </div>
            )}
          </section>

          <section className={`qb-launcher-command-panel${isCommandListCollapsed ? ' qb-launcher-command-panel--collapsed' : ''}`}>
            <header className="qb-launcher-command-panel__header">
              <div className="qb-launcher-section-header__copy">
                <span className="qb-launcher-search__label">命令列表</span>
                <Tag tone="default">{results.length} 条结果</Tag>
              </div>
              <button
                className="qb-launcher-command-panel__toggle"
                type="button"
                onClick={() => setIsCommandListCollapsed((current) => !current)}
                aria-expanded={!isCommandListCollapsed}
                title={isCommandListCollapsed ? '展开命令列表' : '收起命令列表'}
              >
                <Icon icon={isCommandListCollapsed ? ChevronRight : ChevronDown} size={16} tone="muted" />
                <span>{isCommandListCollapsed ? '展开' : '收起'}</span>
              </button>
            </header>

            {isCommandListCollapsed ? (
              <div className="qb-launcher-command-panel__collapsed">
                命令已收起，仍可搜索、按 Enter 执行，或直接打开上方快捷工具。
              </div>
            ) : (
              <List
                className="qb-launcher-list"
                ref={commandListRef}
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
                        data-qb-command-selected={index === selectedIndex ? 'true' : undefined}
                        selected={index === selectedIndex}
                        height={result.command.description ? 'comfortable' : 'compact'}
                        onClick={() => {
                          void selectResult(index)
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
                            {quickCommandIds.includes(result.command.id) ? (
                              <Icon icon={Star} size={13} tone="warning" />
                            ) : null}
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
            )}
          </section>
        </aside>

        <section className="qb-launcher-page__detail qb-scrollbar">
          {activeView ? (
            <PluginViewRenderer activeView={activeView} />
          ) : (
            <ResultDetail
              result={selectedResult}
              totalCommands={allCommands.length}
              isQuick={selectedIsQuick}
              onRun={() => {
                void launchSelected()
              }}
              onToggleQuick={() => {
                if (selectedResult) {
                  toggleQuickCommand(selectedResult.command)
                }
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
