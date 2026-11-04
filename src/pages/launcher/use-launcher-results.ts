import { useMemo } from 'react'
import { commandRegistry } from '../../core/command/command-registry'
import { searchCommands } from '../../core/command/command-search'
import type { Command as QuickBoxCommand, CommandSearchResult, CommandUsageInfo } from '../../core/command/command-types'
import { usePluginStore } from '../../stores/plugin-store'
import { getToolMeta, type ToolCategoryFilter, type ToolCategoryId } from './launcher-catalog'
import { MAX_QUICK_COMMANDS } from './launcher-preferences'

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

interface LauncherResultsOptions {
  query: string
  category: ToolCategoryFilter
  quickCommandIds: string[]
  usageByCommandId: Record<string, CommandUsageInfo>
}

/** 启用插件的命令 → 搜索排序 → 分类筛选，以及常用工具和各分类计数 */
export function useLauncherResults({ query, category, quickCommandIds, usageByCommandId }: LauncherResultsOptions) {
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
  const results = useMemo(
    () => filterResults(searchResults, category, quickCommandIds),
    [category, quickCommandIds, searchResults],
  )

  return { commandById, quickCommands, searchResults, categoryCounts, results, enabledPluginIds, pluginStatus }
}
