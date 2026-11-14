import { useWorkspaceStore } from '../stores/workspace-store'
import { ClipboardSuggestion } from './launcher/components/ClipboardSuggestion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppWindow,
  Command,
  Languages,
  LayoutPanelTop,
  PackageSearch,
  Pin,
  PinOff,
  Search,
  Settings2,
} from 'lucide-react'
import type { AppPage } from './page-types'
import { hideLauncherWindow } from '../api/window-api'
import { runCommand } from '../core/command/command-runner'
import type { Command as QuickBoxCommand } from '../core/command/command-types'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { localizeCommand, useLocale, useT } from '../i18n'
import { useConfigStore } from '../stores/config-store'
import { useLauncherStore } from '../stores/launcher-store'
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
import { ToolDetail } from './launcher/components/ToolDetail'
import { ToolIcon } from './launcher/components/ToolIcon'
import { ToolRow } from './launcher/components/ToolRow'
import { ToolViewPane } from './launcher/components/ToolViewPane'
import { getCategoryLabel, TOOL_CATEGORIES, type ToolCategoryFilter } from './launcher/launcher-catalog'
import { MAX_QUICK_COMMANDS } from './launcher/launcher-preferences'
import { useCommandUsage } from './launcher/use-command-usage'
import { useLauncherResults } from './launcher/use-launcher-results'
import { useQuickCommandDrag } from './launcher/use-quick-command-drag'
import './Workbench.css'
import './LauncherPage.css'
import type { PageNavigationProps } from './page-types'
import PageHeader from './PageHeader'

interface LauncherToastState {
  tone: 'default' | 'success' | 'warning' | 'danger'
  title: string
  description: string
}

function focusWorkspace() {
  const root = document.querySelector<HTMLElement>('.qb-launcher-view__body')
  const next = root?.querySelector<HTMLElement>('input, textarea, select, [contenteditable="true"]')
  next?.focus()
  return Boolean(next)
}

export default function LauncherPage({ currentPage, onPageChange }: PageNavigationProps) {
  const locale = useLocale()
  const tr = useT()
  const { config, setConfig } = useConfigStore()
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
  const commandListRef = useRef<HTMLDivElement>(null)
  const selectedCommandIdRef = useRef<string>()
  const { usageByCommandId, recordUsage } = useCommandUsage()
  const { commandById, quickCommands, searchResults, categoryCounts, results, enabledPluginIds, pluginStatus } =
    useLauncherResults({ query, category, quickCommandIds, usageByCommandId })
  const hasQuery = query.trim().length > 0

  const selectedResult = results[selectedIndex]
  const selectedIsQuick = selectedResult ? quickCommandIds.includes(selectedResult.command.id) : false
  const openCommandId = typeof activeViewParams?.commandId === 'string' ? activeViewParams.commandId : activeCommandId
  const openCommand = openCommandId ? commandById.get(openCommandId) : undefined

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
        setToast({
          tone: 'danger',
          title: locale === 'en-US' ? 'Failed to open tool' : '工具打开失败',
          description: error instanceof Error ? error.message : (locale === 'en-US' ? 'Please retry or select another tool.' : '请重试或选择其他工具。'),
        })
        return
      }
      await recordUsage(command.id)
    },
    [closeView, locale, openView, recordUsage],
  )

  const toggleQuickCommand = useCallback(
    (command: QuickBoxCommand) => {
      const commandTitle = localizeCommand(command, locale).title
      void useWorkspaceStore.getState().update((data) => {
        const isQuick = data.quickCommandIds.includes(command.id)
        if (!isQuick && data.quickCommandIds.length >= MAX_QUICK_COMMANDS) {
          throw new Error(locale === 'en-US' ? 'Up to 8 tools can be pinned. Unpin one first.' : '常用工具最多 8 个，请先取消一个置顶。')
        }
        return { ...data, quickCommandIds: isQuick ? data.quickCommandIds.filter((id) => id !== command.id) : [...data.quickCommandIds, command.id] }
      }).then(() => {
        const pinned = useWorkspaceStore.getState().data.quickCommandIds.includes(command.id)
        setToast({
          tone: 'success',
          title: pinned ? (locale === 'en-US' ? 'Pinned to Quick Access' : '已置顶到常用') : (locale === 'en-US' ? 'Unpinned' : '已取消置顶'),
          description: commandTitle,
        })
      }).catch((error) => setToast({
        tone: 'warning',
        title: locale === 'en-US' ? 'Pinned tools unchanged' : '未更改常用工具',
        description: error instanceof Error ? error.message : (locale === 'en-US' ? 'Failed to save. Please retry.' : '保存失败，请重试'),
      }))
    }, [locale],
  )

  const addQuickCommand = useCallback(
    (command: QuickBoxCommand) => {
      const commandTitle = localizeCommand(command, locale).title
      if (quickCommandIds.includes(command.id)) {
        setToast({ tone: 'warning', title: locale === 'en-US' ? 'Already pinned' : '已经在常用里了', description: commandTitle })
        return
      }
      toggleQuickCommand(command)
    },
    [locale, quickCommandIds, toggleQuickCommand],
  )

  const {
    draggedCommand,
    draggedCommandId,
    isQuickDropActive,
    quickDropRef,
    dragGhostRef,
    suppressCommandClickRef,
    startCommandPointerDrag,
  } = useQuickCommandDrag(commandById, addQuickCommand)

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
    [launchCommand, results, selectResult, suppressCommandClickRef],
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

  const matchedCategory = TOOL_CATEGORIES.find((item) => item.id === category)
  const listTitle =
    hasQuery
      ? tr('搜索结果', 'Search Results')
      : category === 'quick'
        ? tr('常用置顶', 'Pinned')
        : matchedCategory
          ? getCategoryLabel(matchedCategory, locale)
          : tr('全部工具', 'All Tools')

  const selectedLocalized = selectedResult ? localizeCommand(selectedResult.command, locale) : undefined
  const nextLocale = locale === 'en-US' ? 'zh-CN' : 'en-US'

  const actionItems: ActionPanelItem[] = [
    {
      id: 'run-selected',
      title: selectedLocalized ? tr(`打开 ${selectedLocalized.title}`, `Open ${selectedLocalized.title}`) : tr('打开选中工具', 'Open Selected Tool'),
      description: selectedLocalized?.description ?? tr('请先选择一个工具', 'Select a tool first'),
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
      title: selectedIsQuick ? tr('取消置顶', 'Unpin Tool') : tr('置顶到常用', 'Pin to Quick Access'),
      description: selectedLocalized ? selectedLocalized.title : tr('请先选择一个工具', 'Select a tool first'),
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
      id: 'switch-language',
      title: tr('Switch to English', '切换为简体中文'),
      description: tr('将界面语言切换为英文', 'Switch interface language to Simplified Chinese'),
      icon: <Icon icon={Languages} size={16} tone="primary" />,
      keywords: ['language', 'english', 'chinese', 'i18n', '语言', '英文', '中文'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void setConfig({ ...config, language: nextLocale })
      },
    },
    {
      id: 'go-plugins',
      title: tr('打开插件', 'Open Plugins'),
      description: tr('查看官方工具和启用状态。', 'Manage built-in tools and enable status.'),
      icon: <Icon icon={LayoutPanelTop} size={16} tone="primary" />,
      shortcut: 'Ctrl+2',
      keywords: ['plugins', '插件'],
      onAction: () => navigateToPage('plugins'),
    },
    {
      id: 'go-settings',
      title: tr('打开设置', 'Open Settings'),
      description: tr('主题、语言、呼出方式和桌面集成。', 'Theme, language, hotkey, and local storage.'),
      icon: <Icon icon={Settings2} size={16} tone="primary" />,
      shortcut: 'Ctrl+3',
      keywords: ['settings', '设置'],
      onAction: () => navigateToPage('settings'),
    },
    {
      id: 'hide-launcher',
      title: tr('隐藏 QuickBox', 'Hide QuickBox'),
      description: tr('收起窗口。', 'Collapse the launcher window.'),
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
              placeholder={tr('搜索工具', 'Search tools')}
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
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['↑', '↓']} separator="" />{tr('选择', 'Select')}</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys="Enter" />{tr('打开', 'Open')}</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys="Tab" />{tr('工作台', 'Focus')}</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['Alt', '1-8']} />{tr('常用', 'Pinned')}</span>
          </div>
          <div className="qb-launcher-footer__group">
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['Ctrl', 'D']} />{tr('置顶', 'Pin')}</span>
            <span className="qb-launcher-footer__hint"><KeyboardShortcut keys={['Ctrl', 'K']} />{tr('动作', 'Actions')}</span>
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
              draggingTitle={draggedCommand ? localizeCommand(draggedCommand, locale).title : undefined}
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
                  title={hasQuery ? tr(`没有「${query.trim()}」`, `No results for "${query.trim()}"`) : tr('这个分类还是空的', 'This category is empty')}
                  description={tr('换个词，或到插件页打开更多工具。', 'Try another keyword, or enable more tools in Plugins.')}
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
            <ToolDetail
              command={selectedResult?.command}
              usage={selectedResult ? usageByCommandId[selectedResult.command.id] : undefined}
              isQuick={selectedIsQuick}
              onRun={() => void launchSelected()}
              onToggleQuick={() => {
                if (selectedResult) toggleQuickCommand(selectedResult.command)
              }}
              onOpenActions={() => setIsActionPanelOpen(true)}
            />
          )}
        </section>

        <ActionPanel
          open={isActionPanelOpen}
          title={tr('动作', 'Actions')}
          description={selectedLocalized?.title}
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
              <span className="qb-launcher-drag-ghost__title">{localizeCommand(draggedCommand, locale).title}</span>
            </div>
          </div>
        ) : null}
      </div>
    </WindowShell>
  )
}
