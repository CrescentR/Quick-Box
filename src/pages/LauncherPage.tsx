import { useEffect, useMemo } from 'react'
import CommandInput from '../components/CommandInput'
import CommandList from '../components/CommandList'
import WindowHeader from '../components/WindowHeader'
import { commandRegistry } from '../core/command/command-registry'
import { runCommand } from '../core/command/command-runner'
import { searchCommands } from '../core/command/command-search'
import type { CommandSearchResult } from '../core/command/command-types'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { hideLauncherWindow } from '../api/window-api'
import { useLauncherStore } from '../stores/launcher-store'

interface ActiveViewState {
  viewId: string
  params?: Record<string, unknown>
}

function PluginViewRenderer({ activeView }: { activeView?: ActiveViewState }) {
  if (!activeView) {
    return <div className="plugin-view empty-state">选择一个命令开始</div>
  }

  const view = pluginRegistry.getView(activeView.viewId)

  if (!view) {
    return <div className="plugin-view view-missing">View not found: {activeView.viewId}</div>
  }

  const Component = view.component
  return (
    <div className="plugin-view">
      <Component params={activeView.params} />
    </div>
  )
}

export default function LauncherPage() {
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

  const results = useMemo(
    () => searchCommands(commandRegistry.list(), query),
    [query],
  )

  const activeView = activeViewId
    ? {
        viewId: activeViewId,
        params: activeViewParams,
      }
    : undefined

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(results.length - 1, 0))
    }
  }, [results.length, selectedIndex, setSelectedIndex])

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeViewId) {
          closeView()
          return
        }

        await hideLauncherWindow()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeViewId, closeView])

  const runResult = async (result: CommandSearchResult) => {
    await runCommand(result.command, {
      openView: async (viewId, params) => openView(viewId, params),
      closeView,
    })
  }

  const handleInputKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
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
      const selected = results[selectedIndex]
      if (selected) {
        await runResult(selected)
      }
    }
  }

  return (
    <section className="launcher">
      <WindowHeader />
      <div className="launcher-body">
        <aside className="command-panel">
          <CommandInput value={query} onChange={setQuery} onKeyDown={handleInputKeyDown} />
          <CommandList results={results} selectedIndex={selectedIndex} onRun={runResult} />
        </aside>
        <PluginViewRenderer activeView={activeView} />
      </div>
    </section>
  )
}
