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
        title="View unavailable"
        description={`QuickBox could not find the view "${activeView.viewId}".`}
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
      return 'Official'
    case 'local':
      return 'Local'
    case 'market':
      return 'Market'
    default:
      return source
  }
}

function getExecuteModeLabel(mode: CommandSearchResult['command']['executeMode']) {
  return mode === 'view' ? 'Open View' : 'Run Directly'
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
        title="Ready to launch"
        description="Search commands, jump through tools, and keep the entire launcher workflow on the keyboard."
        action={
          <span className="qb-launcher-empty-action">
            <KeyboardShortcut keys={['Alt', 'Space']} />
            <span>Call QuickBox</span>
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
          <div className="qb-launcher-detail__eyebrow">Selected command</div>
          <div className="qb-launcher-detail__hero-title">{result.command.title}</div>
          <div className="qb-launcher-detail__hero-description">
            {result.command.description ??
              'A focused launcher action designed for fast keyboard-driven workflows.'}
          </div>
        </div>

        <div className="qb-launcher-detail__hero-tags">
          <Tag tone="default">{getExecuteModeLabel(result.command.executeMode)}</Tag>
          <Tag tone="default">{result.command.pluginId}</Tag>
          <Tag tone="default">score {result.score.toFixed(2)}</Tag>
        </div>

        <div className="qb-launcher-detail__actionbar">
          <button className="qb-launcher-detail__action" type="button" onClick={onRun}>
            <KeyboardShortcut keys="Enter" />
            <span>Run command</span>
          </button>
          <div className="qb-launcher-detail__action-copy">
            <KeyboardShortcut keys={['Ctrl', 'K']} />
            <span className="qb-launcher-footer__label">Open actions</span>
          </div>
        </div>
      </section>

      <div className="qb-launcher-detail__meta-grid">
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">Source</div>
          <div className="qb-launcher-detail__meta-value">
            {getSourceLabel(result.command.source)}
          </div>
        </div>
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">Plugin</div>
          <div className="qb-launcher-detail__meta-value">{result.command.pluginId}</div>
        </div>
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">Library Size</div>
          <div className="qb-launcher-detail__meta-value">{totalCommands} commands</div>
        </div>
        <div className="qb-launcher-detail__meta-card">
          <div className="qb-launcher-detail__meta-label">Execute mode</div>
          <div className="qb-launcher-detail__meta-value">
            {getExecuteModeLabel(result.command.executeMode)}
          </div>
        </div>
      </div>

      <section className="qb-launcher-detail__summary">
        <div className="qb-launcher-detail__summary-title">What happens next</div>
        <div className="qb-launcher-detail__bullet-list">
          <div className="qb-launcher-detail__bullet">
            <Icon icon={ArrowRight} size={14} tone="primary" />
            <span>{getExecuteModeLabel(result.command.executeMode)}</span>
          </div>
          <div className="qb-launcher-detail__bullet">
            <Icon icon={ShieldCheck} size={14} tone="primary" />
            <span>Visuals stay inside the QuickBox design system shell</span>
          </div>
          <div className="qb-launcher-detail__bullet">
            <Icon icon={Sparkles} size={14} tone="primary" />
            <span>Matched text: {result.matchedText || result.command.title}</span>
          </div>
          <button className="qb-launcher-detail__inline-action" type="button" onClick={onOpenActions}>
            <KeyboardShortcut keys={['Ctrl', 'K']} />
            <span>Open action panel for page navigation and launcher commands</span>
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
      title: selectedResult.command.executeMode === 'view' ? 'Opened tool view' : 'Command executed',
      description: selectedResult.command.title,
    })
  }

  const navigateToPage = (page: AppPage) => {
    onPageChange(page)
    setIsActionPanelOpen(false)
    setToast({
      tone: 'default',
      title: 'Switched workspace',
      description:
        page === 'plugins'
          ? 'Browsing the plugin catalog.'
          : page === 'settings'
            ? 'Adjusting launcher behavior.'
            : 'Returned to the launcher.',
    })
  }

  const actionItems: ActionPanelItem[] = [
    {
      id: 'run-selected',
      title: selectedResult ? `Run ${selectedResult.command.title}` : 'Run selected command',
      description: selectedResult
        ? getExecuteModeLabel(selectedResult.command.executeMode)
        : 'Select a command first',
      icon: <Icon icon={selectedResult?.command.executeMode === 'view' ? AppWindow : Command} size={16} tone="primary" />,
      shortcut: 'Enter',
      disabled: !selectedResult,
      keywords: ['run', 'open', 'selected', 'command'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void launchSelected()
      },
    },
    {
      id: 'clear-search',
      title: 'Clear search',
      description: 'Reset the current launcher query and jump back to the full command library.',
      icon: <Icon icon={Search} size={16} tone="muted" />,
      shortcut: 'Esc',
      keywords: ['clear', 'reset', 'search'],
      onAction: () => {
        setQuery('')
        setSelectedIndex(0)
        setIsActionPanelOpen(false)
      },
    },
    {
      id: 'go-launcher',
      title: 'Open Launcher',
      description: 'Return to the main command search workspace.',
      icon: <Icon icon={Command} size={16} tone="primary" />,
      shortcut: 'Ctrl+1',
      keywords: ['launcher', 'home', 'workspace'],
      onAction: () => navigateToPage('launcher'),
    },
    {
      id: 'go-plugins',
      title: 'Open Plugins',
      description: 'Review official tools, permissions, and enabled status.',
      icon: <Icon icon={LayoutPanelTop} size={16} tone="primary" />,
      shortcut: 'Ctrl+2',
      keywords: ['plugins', 'catalog', 'extensions'],
      onAction: () => navigateToPage('plugins'),
    },
    {
      id: 'go-settings',
      title: 'Open Settings',
      description: 'Adjust theme, invocation, and desktop integration.',
      icon: <Icon icon={Settings2} size={16} tone="primary" />,
      shortcut: 'Ctrl+3',
      keywords: ['settings', 'preferences', 'theme'],
      onAction: () => navigateToPage('settings'),
    },
    {
      id: 'hide-launcher',
      title: 'Hide QuickBox',
      description: 'Dismiss the launcher window and return to the desktop.',
      icon: <Icon icon={AppWindow} size={16} tone="muted" />,
      shortcut: 'Esc',
      keywords: ['hide', 'dismiss', 'close'],
      onAction: () => {
        setIsActionPanelOpen(false)
        void hideLauncherWindow()
      },
    },
  ]

  if (activeViewId) {
    actionItems.unshift({
      id: 'close-view',
      title: 'Back to search results',
      description: 'Close the current tool view and return to the command detail pane.',
      icon: <Icon icon={ArrowRight} size={16} tone="primary" />,
      shortcut: 'Esc',
      keywords: ['back', 'close', 'view'],
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
          eyebrow="Workspace"
          title="QuickBox Launcher"
          description="A focused desktop launcher built for command search, tool previews, and fast keyboard execution."
        />
      }
      footer={
        <div className="qb-launcher-footer">
          <div className="qb-launcher-footer__left">
            <span className="qb-launcher-footer__label">Navigate</span>
            <KeyboardShortcut keys={['Up', 'Down']} />
            <KeyboardShortcut keys="Enter" />
            <KeyboardShortcut keys="Esc" />
          </div>
          <div className="qb-launcher-footer__right">
            <span className="qb-launcher-footer__label">{results.length} results</span>
            <KeyboardShortcut keys={['Ctrl', 'K']} />
            <span className="qb-launcher-footer__label">Actions</span>
          </div>
        </div>
      }
    >
      <div className="qb-launcher-page">
        <aside className="qb-launcher-page__rail">
          <div className="qb-launcher-search">
            <div className="qb-launcher-search__meta">
              <div className="qb-launcher-search__meta-group">
                <span className="qb-launcher-search__label">Command search</span>
                <Tag tone="primary">{allCommands.length} loaded</Tag>
              </div>
              <div className="qb-launcher-search__meta-group">
                <Tag tone="default">Keyboard-first</Tag>
              </div>
            </div>

          <CommandInput
            autoFocus
            className="qb-launcher-command-input"
            value={query}
            onChange={setQuery}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands, built-in tools, or plugin actions"
          />
          </div>

          <List
            className="qb-launcher-list"
            emptyState={
              <EmptyState
                icon={<Icon icon={PackageSearch} size={20} tone="muted" />}
                title="No matching commands"
                description="Try a broader keyword or open more built-in tools later."
              />
            }
          >
            {groupedResults.map((section) => (
              <List.Section
                key={section.source}
                title={`${getSourceLabel(section.source)} commands`}
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
                          <Tag tone="primary">Active</Tag>
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
          title="Launcher Actions"
          description="Jump across workspaces or trigger focused actions for the current selection."
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
