import { useWorkspaceStore } from '../stores/workspace-store'
import { ClipboardSuggestion } from './launcher/components/ClipboardSuggestion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  AppWindow,
  Command,
  LayoutPanelTop,
  PackageSearch,
  Pin,
  PinOff,
  Search,
  Settings2,
} from 'lucide-react'
import type { AppPage } from './page-types'
import { loadCommandUsage, recordCommandUsage } from '../api/command-usage-api'
import { hideLauncherWindow } from '../api/window-api'
import { commandRegistry } from '../core/command/command-registry'
import { runCommand } from '../core/command/command-runner'
import { searchCommands } from '../core/command/command-search'
import type { Command as QuickBoxCommand, CommandSearchResult, CommandUsageInfo } from '../core/command/command-types'
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
  Toast,
  WindowShell,
} from '../ui'
import { CategoryFilter } from './launcher/components/CategoryFilter'
import { QuickTiles } from './launcher/components/QuickTiles'
import { ToolIcon } from './launcher/components/ToolIcon'
import { ToolRow } from './launcher/components/ToolRow'
import { ToolViewPane } from './launcher/components/ToolViewPane'
import {
  TOOL_CATEGORIES,
  getToolMeta,
  type ToolCategoryFilter,
  type ToolCategoryId,
} from './launcher/launcher-catalog'
import {
  MAX_QUICK_COMMANDS,
} from './launcher/launcher-preferences'
import './Workbench.css'
import './LauncherPage.css'
import type { PageNavigationProps } from './page-types'
import PageHeader from './PageHeader'

/** 指针移动超过该距离才视为拖拽 */
const COMMAND_DRAG_THRESHOLD = 6

interface LauncherToastState {
  tone: 'default' | 'success' | 'warning' | 'danger'
  title: string
  description: string
}

interface PendingCommandDrag {
  commandId: string
  startX: number
  startY: number
  isDragging: boolean
}

/**
 * 按分类筛出当前列表
 * @param results 已按相关度排序的搜索结果
 * @param category 当前分类
 * @param quickCommandIds 常用工具 id
 */
function filterResults(
  results: CommandSearchResult[],
  category: ToolCategoryFilter,
  quickCommandIds: string[],
) {
  if (category === 'all') return results
  if (category === 'quick') {
    const order = new Map(quickCommandIds.map((id, index) => [id, index]))
    return results
      .filter((result) => order.has(result.command.id))
      .sort((left, right) => (order.get(left.command.id) ?? 0) - (order.get(right.command.id) ?? 0))
  }
  return results.filter((result) => getToolMeta(result.command).category.id === category)
}

function isPointInsideElement(element: HTMLElement | null, x: number, y: number) {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function focusWorkspace() {
  const root = document.querySelector<HTMLElement>('.qb-launcher-view__body')
  const next = root?.querySelector<HTMLElement>('input, textarea, select, [contenteditable="true"]')
  next?.focus()
  return Boolean(next)
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
  const [category, setCategory] = useState<ToolCategoryFilter>('all')
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false)
  const [actionQuery, setActionQuery] = useState('')
  const [toast, setToast] = useState<LauncherToastState | null>(null)
  const quickCommandIds = useWorkspaceStore((state) => state.data.quickCommandIds)
  const workspaceError = useWorkspaceStore((state) => state.error)
  const setQuickCommandIds = (ids: string[]) => { void useWorkspaceStore.getState().update((data) => ({ ...data, quickCommandIds: ids })).catch(() => {}) }
  const [activeCommandId, setActiveCommandId] = useState<string>()
  const [draggedCommandId, setDraggedCommandId] = useState<string | null>(null)
  const [isQuickDropActive, setIsQuickDropActive] = useState(false)
  const [usageByCommandId, setUsageByCommandId] = useState<Record<string, CommandUsageInfo>>({})
  const commandListRef = useRef<HTMLDivElement>(null)
  const quickDropRef = useRef<HTMLElement>(null)
  const dragGhostRef = useRef<HTMLDivElement | null>(null)
  const dragPointerRef = useRef({ x: 0, y: 0 })
  const selectedCommandIdRef = useRef<string>()
  const pendingCommandDragRef = useRef<PendingCommandDrag | null>(null)
  const suppressCommandClickRef = useRef(false)
  const { enabledPluginIds, status: pluginStatus } = usePluginStore()

  const allCommands = useMemo(() => {
    const commands = commandRegistry.list()
    if (pluginStatus === 'idle' || pluginStatus === 'loading') return commands
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
        .filter((command): command is QuickBoxCommand => Boolean(command))
        .slice(0, MAX_QUICK_COMMANDS),
    [commandById, quickCommandIds],
  )
  const searchResults = useMemo(
    () => searchCommands(allCommands, query, usageByCommandId),
    [allCommands, query, usageByCommandId],
  )
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<ToolCategoryId, number>> = {}
    for (const result of searchResults) {
      const id = getToolMeta(result.command).category.id
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }, [searchResults])
  const hasQuery = query.trim().length > 0
  const results = useMemo(
    () => filterResults(searchResults, category, quickCommandIds),
    [category, quickCommandIds, searchResults],
  )

  const selectedResult = results[selectedIndex]
  const selectedIsQuick = selectedResult ? quickCommandIds.includes(selectedResult.command.id) : false
  const openCommandId = typeof activeViewParams?.commandId === 'string' ? activeViewParams.commandId : activeCommandId
  const openCommand = openCommandId ? commandById.get(openCommandId) : undefined
  const draggedCommand = draggedCommandId ? commandById.get(draggedCommandId) : undefined

  const launchCommand = useCallback(
    async (command: QuickBoxCommand) => {
      setActiveCommandId(command.id)
      selectedCommandIdRef.current = command.id
      try {
        await runCommand(command, {
          openView: async (viewId, params) => openView(viewId, { ...params, commandId: command.id }),
          closeView,
        })
      } catch (error) {
        setToast({ tone: 'danger', title: '工具打开失败', description: error instanceof Error ? error.message : '请重试或选择其他工具。' })
        return
      }
      try {
        const usage = await recordCommandUsage(command.id)
        setUsageByCommandId((current) => ({
          ...current,
          [usage.commandId]: { runCount: usage.runCount, lastRunAt: usage.lastRunAt },
        }))
      } catch {
        // 使用记录不应阻断命令本身执行。
      }
    },
    [closeView, openView],
  )

  const toggleQuickCommand = useCallback(
    (command: QuickBoxCommand) => {
      void useWorkspaceStore.getState().update((data) => {
        const isQuick = data.quickCommandIds.includes(command.id)
        if (!isQuick && data.quickCommandIds.length >= MAX_QUICK_COMMANDS) throw new Error('常用工具最多 8 个，请先取消一个置顶。')
        return { ...data, quickCommandIds: isQuick ? data.quickCommandIds.filter((id) => id !== command.id) : [...data.quickCommandIds, command.id] }
      }).then(() => {
        const pinned = useWorkspaceStore.getState().data.quickCommandIds.includes(command.id)
        setToast({ tone: 'success', title: pinned ? '已置顶到常用' : '已取消置顶', description: command.title })
      }).catch((error) => setToast({ tone: 'warning', title: '未更改常用工具', description: error instanceof Error ? error.message : '保存失败，请重试' }))
    }, [],
  )

  const addQuickCommand = useCallback(
    (command: QuickBoxCommand) => {
      if (quickCommandIds.includes(command.id)) {
        setToast({ tone: 'warning', title: '已经在常用里了', description: command.title })
        return
      }
      toggleQuickCommand(command)
    },
    [quickCommandIds, toggleQuickCommand],
  )

  const startCommandPointerDrag = useCallback((event: ReactPointerEvent<HTMLElement>, command: QuickBoxCommand) => {
    if (event.button !== 0) return
    pendingCommandDragRef.current = {
      commandId: command.id,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
    }
  }, [])

  useEffect(() => {
    const cleanupPointerDrag = () => {
      pendingCommandDragRef.current = null
      setDraggedCommandId(null)
      setIsQuickDropActive(false)
    }

    const onPointerMove = (event: PointerEvent) => {
      const drag = pendingCommandDragRef.current
      if (!drag) return
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
      if (!drag.isDragging && distance < COMMAND_DRAG_THRESHOLD) return
      if (!drag.isDragging) {
        drag.isDragging = true
        setDraggedCommandId(drag.commandId)
      }
      event.preventDefault()
      dragPointerRef.current = { x: event.clientX, y: event.clientY }
      const ghost = dragGhostRef.current
      if (ghost) {
        ghost.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
      }
      setIsQuickDropActive(isPointInsideElement(quickDropRef.current, event.clientX, event.clientY))
    }

    const onPointerUp = (event: PointerEvent) => {
      const drag = pendingCommandDragRef.current
      if (!drag) return
      const shouldDrop = drag.isDragging && isPointInsideElement(quickDropRef.current, event.clientX, event.clientY)
      const command = shouldDrop ? commandById.get(drag.commandId) : undefined
      if (drag.isDragging) {
        suppressCommandClickRef.current = true
        window.setTimeout(() => {
          suppressCommandClickRef.current = false
        }, 0)
      }
      cleanupPointerDrag()
      if (command) addQuickCommand(command)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', cleanupPointerDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', cleanupPointerDrag)
    }
  }, [addQuickCommand, commandById])

  useLayoutEffect(() => {
    const ghost = dragGhostRef.current
    if (!ghost) return
    const { x, y } = dragPointerRef.current
    ghost.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  }, [draggedCommandId])

  const selectResult = useCallback(
    (index: number) => {
      if (!results.length) return
      const nextIndex = (index + results.length) % results.length
      selectedCommandIdRef.current = results[nextIndex].command.id
      setSelectedIndex(nextIndex)
    },
    [results, setSelectedIndex],
  )

  const launchAt = useCallback(
    async (index: number) => {
      const result = results[index]
      if (!result || suppressCommandClickRef.current) return
      selectResult(index)
      await launchCommand(result.command)
    },
    [launchCommand, results, selectResult],
  )

  const launchQuickCommand = useCallback(
    async (command: QuickBoxCommand) => {
      const index = results.findIndex((result) => result.command.id === command.id)
      if (index >= 0) selectResult(index)
      await launchCommand(command)
    },
    [launchCommand, results, selectResult],
  )

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      selectedCommandIdRef.current = undefined
      setQuery(nextQuery)
      if (activeViewId) closeView()
    },
    [activeViewId, closeView, setQuery],
  )

  const changeCategory = useCallback(
    (nextCategory: ToolCategoryFilter) => {
      selectedCommandIdRef.current = undefined
      setCategory(nextCategory)
      setSelectedIndex(0)
    },
    [setSelectedIndex],
  )

  const categoryOrder = useMemo<ToolCategoryFilter[]>(
    () => [
      'all',
      'quick',
      ...TOOL_CATEGORIES.filter((item) => categoryCounts[item.id]).map((item) => item.id),
    ],
    [categoryCounts],
  )

  const launchSelected = useCallback(async () => {
    if (!selectedResult) return
    await launchCommand(selectedResult.command)
  }, [launchCommand, selectedResult])

  useEffect(() => {
    let cancelled = false
    async function hydrateUsage() {
      try {
        const usage = await loadCommandUsage()
        if (cancelled) return
        setUsageByCommandId(
          Object.fromEntries(
            usage.map((item) => [item.commandId, { runCount: item.runCount, lastRunAt: item.lastRunAt }]),
          ),
        )
      } catch {
        if (!cancelled) setUsageByCommandId({})
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
        if (nextIndex !== selectedIndex) setSelectedIndex(nextIndex)
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
    const viewport = commandListRef.current
    const selectedItem = viewport?.querySelector<HTMLElement>('[data-qb-command-selected="true"]')
    if (!viewport || !selectedItem) return
    const viewportRect = viewport.getBoundingClientRect()
    const itemRect = selectedItem.getBoundingClientRect()
    const edgeBuffer = 48
    let nextScrollTop = viewport.scrollTop
    if (itemRect.bottom > viewportRect.bottom - edgeBuffer) {
      nextScrollTop += itemRect.bottom - (viewportRect.bottom - edgeBuffer)
    } else if (itemRect.top < viewportRect.top + edgeBuffer) {
      nextScrollTop -= viewportRect.top + edgeBuffer - itemRect.top
    }
    if (nextScrollTop !== viewport.scrollTop) {
      viewport.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
    }
  }, [results, selectedIndex])


  useEffect(() => {
    if (!activeViewId || pluginStatus === 'idle' || pluginStatus === 'loading') return
    const plugin = pluginRegistry.getPluginByView(activeViewId)
    if (plugin && !enabledPluginIds.includes(plugin.id)) closeView()
  }, [activeViewId, closeView, enabledPluginIds, pluginStatus])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return
      const isCommandModifier = event.ctrlKey || event.metaKey
      const target = event.target instanceof HTMLElement ? event.target : null
      const isLauncherSearch = Boolean(target?.closest('[data-qb-launcher-search="true"]'))
      const isEditingToolField =
        Boolean(target?.closest('input, textarea, select, [contenteditable="true"]')) && !isLauncherSearch
      const isInToolView = Boolean(target?.closest('.qb-launcher-view'))

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
        if (isInToolView && isEditingToolField) {
          document.querySelector<HTMLInputElement>('[data-qb-launcher-search="true"]')?.focus()
          return
        }
        if (activeViewId) {
          closeView()
          return
        }
        if (query) {
          handleQueryChange('')
          return
        }
        await hideLauncherWindow()
        return
      }

      if (isActionPanelOpen) return

      if (event.key === 'Tab' && isLauncherSearch) {
        event.preventDefault()
        event.stopPropagation()
        if (!event.shiftKey && activeViewId && focusWorkspace()) return
        const step = event.shiftKey ? -1 : 1
        const currentIndex = Math.max(categoryOrder.indexOf(category), 0)
        changeCategory(categoryOrder[(currentIndex + step + categoryOrder.length) % categoryOrder.length])
        return
      }

      if (isEditingToolField || isInToolView || target?.closest('button, a, [role=button]')) return

      const quickDigit = /^Digit([1-9])$/.exec(event.code)
      if (event.altKey && quickDigit) {
        const command = quickCommands[Number(quickDigit[1]) - 1]
        if (!command) return
        event.preventDefault()
        event.stopPropagation()
        await launchQuickCommand(command)
        return
      }

      if (isCommandModifier && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        event.stopPropagation()
        if (selectedResult) toggleQuickCommand(selectedResult.command)
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        selectResult(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1))
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
    category,
    categoryOrder,
    changeCategory,
    closeView,
    handleQueryChange,
    isActionPanelOpen,
    launchQuickCommand,
    launchSelected,
    query,
    quickCommands,
    selectResult,
    selectedIndex,
    selectedResult,
    toggleQuickCommand,
  ])

  const navigateToPage = (page: AppPage) => {
    onPageChange(page)
    setIsActionPanelOpen(false)
  }

  const listTitle =
    hasQuery
      ? '搜索结果'
      : category === 'quick'
        ? '常用置顶'
        : TOOL_CATEGORIES.find((item) => item.id === category)?.name ?? '全部工具'

  const actionItems: ActionPanelItem[] = [
    {
      id: 'run-selected',
      title: selectedResult ? `打开 ${selectedResult.command.title}` : '打开选中工具',
      description: selectedResult?.command.description ?? '请先选择一个工具',
      icon: <Icon icon={selectedResult?.command.executeMode === 'view' ? AppWindow : Command} size={16} tone="primary" />,
      shortcut: 'Enter',
      disabled: !selectedResult,
      keywords: ['run', 'open', '执行', '打开'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void launchSelected()
      },
    },
    {
      id: 'toggle-quick-selected',
      title: selectedIsQuick ? '取消置顶' : '置顶到常用',
      description: selectedResult ? selectedResult.command.title : '请先选择一个工具',
      icon: <Icon icon={selectedIsQuick ? PinOff : Pin} size={16} tone={selectedIsQuick ? 'warning' : 'muted'} />,
      shortcut: 'Ctrl+D',
      disabled: !selectedResult,
      keywords: ['quick', 'favorite', 'pin', '快捷', '收藏', '常用', '置顶'],
      onAction: () => {
        if (selectedResult) toggleQuickCommand(selectedResult.command)
        setIsActionPanelOpen(false)
      },
    },
    {
      id: 'go-plugins',
      title: '打开插件',
      description: '查看官方工具和启用状态。',
      icon: <Icon icon={LayoutPanelTop} size={16} tone="primary" />,
      shortcut: 'Ctrl+2',
      keywords: ['plugins', '插件'],
      onAction: () => navigateToPage('plugins'),
    },
    {
      id: 'go-settings',
      title: '打开设置',
      description: '主题、呼出方式和桌面集成。',
      icon: <Icon icon={Settings2} size={16} tone="primary" />,
      shortcut: 'Ctrl+3',
      keywords: ['settings', '设置'],
      onAction: () => navigateToPage('settings'),
    },
    {
      id: 'hide-launcher',
      title: '隐藏 QuickBox',
      description: '收起窗口。',
      icon: <Icon icon={AppWindow} size={16} tone="muted" />,
      shortcut: 'Esc',
      keywords: ['hide', '隐藏', '关闭'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void hideLauncherWindow()
      },
    },
  ]

  return (
    <WindowShell
      mode="split"
      className="qb-launcher-shell"
      title={
        <PageHeader compact currentPage={currentPage} onPageChange={onPageChange}>
          <div className="qb-launcher-search">
            <Icon icon={Search} size={16} tone="muted" className="qb-launcher-search__icon" />
            <CommandInput
              id="quickbox-command-search"
              name="quickbox-command-search"
              autoFocus
              className="qb-launcher-search__input"
              value={query}
              onChange={handleQueryChange}
              data-qb-launcher-search="true"
              placeholder="搜索工具"
            />
            <span className="qb-launcher-search__meta">
              {results.length}
              {query ? <KeyboardShortcut keys="Esc" /> : null}
            </span>
          </div>
        </PageHeader>
      }
      footer={
        <div className="qb-launcher-footer">
          <div className="qb-launcher-footer__group">
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['↑', '↓']} separator="" />选择</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys="Enter" />打开</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys="Tab" />工作台</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['Alt', '1-8']} />常用</span>
          </div>
          <div className="qb-launcher-footer__group">
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['Ctrl', 'D']} />置顶</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['Ctrl', 'K']} />动作</span>
          </div>
        </div>
      }
    >
      <div className={`qb-launcher-page${draggedCommandId ? ' qb-launcher-page--dragging' : ''}`}>
        <CategoryFilter
          value={category}
          counts={categoryCounts}
          total={searchResults.length}
          quickCount={quickCommands.length}
          onChange={changeCategory}
        />

        <section className="qb-launcher-rail">
          {workspaceError && <p role="alert">{workspaceError}</p>}
          <ClipboardSuggestion />
          {hasQuery || category === 'quick' ? null : (
            <QuickTiles
              ref={quickDropRef}
              commands={quickCommands}
              selectedCommandId={selectedResult?.command.id}
              openCommandId={activeCommandId}
              draggingTitle={draggedCommand?.title}
              isDropActive={isQuickDropActive}
              onLaunch={(command) => void launchQuickCommand(command)}
              onRemove={toggleQuickCommand}
              onMove={(id, direction) => {
                const ids = [...quickCommandIds]
                const index = ids.indexOf(id)
                const destination = index + direction
                if (index < 0 || destination < 0 || destination >= ids.length) return
                ;[ids[index], ids[destination]] = [ids[destination], ids[index]]
                setQuickCommandIds(ids)
              }}
            />
          )}

          <div className="qb-launcher-list-wrap">
            <header className="qb-launcher-section-title qb-launcher-list-wrap__head">
              <span>{listTitle}</span>
              <span className="qb-launcher-section-title__hint">{results.length}</span>
            </header>
            <div className="qb-launcher-list qb-scrollbar" ref={commandListRef}>
              {results.length ? (
                results.map((result, index) => (
                  <ToolRow
                    key={result.command.id}
                    command={result.command}
                    query={query}
                    selected={index === selectedIndex}
                    open={result.command.id === activeCommandId}
                    pinned={quickCommandIds.includes(result.command.id)}
                    dragging={draggedCommandId === result.command.id}
                    onSelect={() => selectResult(index)}
                    onLaunch={() => void launchAt(index)}
                    onTogglePin={() => toggleQuickCommand(result.command)}
                    onPointerDown={(event) => startCommandPointerDrag(event, result.command)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<Icon icon={PackageSearch} size={18} tone="muted" />}
                  title={hasQuery ? `没有「${query.trim()}」` : '这个分类还是空的'}
                  description="换个词，或到插件页打开更多工具。"
                />
              )}
            </div>
          </div>
        </section>

        <section className="qb-launcher-pane">
          {activeViewId ? (
            <ToolViewPane
              viewId={activeViewId}
              params={activeViewParams}
              command={openCommand}
              isQuick={Boolean(openCommand && quickCommandIds.includes(openCommand.id))}
              onToggleQuick={() => {
                if (openCommand) toggleQuickCommand(openCommand)
              }}
              onOpenActions={() => setIsActionPanelOpen(true)}
            />
          ) : (
            <div className="qb-launcher-idle">
              <p>点选左侧工具，在这里打开</p>
              <p>
                <KeyboardShortcut keys="Enter" /> 打开
                <span> · </span>
                <KeyboardShortcut keys="Tab" /> 把键盘交给工作台
              </p>
            </div>
          )}
        </section>

        <ActionPanel
          open={isActionPanelOpen}
          title="动作"
          description={selectedResult?.command.title}
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
            <Toast tone={toast.tone} title={toast.title} description={toast.description} onDismiss={() => setToast(null)} />
          </div>
        ) : null}

        {draggedCommand ? (
          <div ref={dragGhostRef} className="qb-launcher-drag-ghost" aria-hidden="true">
            <div className="qb-launcher-drag-ghost__card">
              <ToolIcon command={draggedCommand} />
              <span className="qb-launcher-drag-ghost__title">{draggedCommand.title}</span>
            </div>
          </div>
        ) : null}
      </div>
    </WindowShell>
  )
}
