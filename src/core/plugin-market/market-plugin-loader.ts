/**
 * 市场插件加载器
 *
 * 启动时从后端读取已安装的市场插件，将启用的插件注册到 PluginRegistry，
 * 使其命令出现在启动器命令面板中。
 *
 * UI 插件（有 main 字段）的命令执行时调用 openPluginWindow 打开独立窗口。
 */

import { openPluginWindow } from '../../api/plugin-market-api'
import type { Command } from '../command/command-types'
import type { PluginView } from '../plugin/plugin-types'
import { pluginRegistry } from '../plugin/plugin-registry'
import type { ToolPlugin } from '../plugin/plugin-types'
import type { InstalledPlugin } from './market-types'

/** 已注册的市场插件 ID 集合，用于避免重复注册和支持卸载后取消注册 */
const registeredMarketPluginIds = new Set<string>()

/**
 * 将一个已安装的市场插件注册到 PluginRegistry。
 * 如果插件已注册则先跳过（幂等）。
 */
export function registerMarketPlugin(installed: InstalledPlugin): void {
  const { manifest } = installed

  if (pluginRegistry.getPlugin(manifest.id)) {
    return
  }

  const hasMain = Boolean(manifest.main)

  const commands: Command[] = manifest.commands.map((cmd) => ({
    id: `${manifest.id}.${cmd.code}`,
    pluginId: manifest.id,
    title: cmd.title,
    description: cmd.description,
    keywords: cmd.keywords ?? [],
    source: 'market',
    executeMode: hasMain ? 'immediate' : 'immediate',
    run: async () => {
      if (hasMain) {
        await openPluginWindow(manifest.id)
      }
    },
  }))

  const plugin: ToolPlugin = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    source: 'market',
    // 权限格式兼容：市场插件用 `clipboard:read`，内置插件用 `clipboard.read`
    // 运行时都是字符串，直接强制转换即可
    permissions: manifest.permissions as unknown as ToolPlugin['permissions'],
    commands,
    views: [] as PluginView[],
  }

  pluginRegistry.register(plugin)
  registeredMarketPluginIds.add(manifest.id)
}

/**
 * 从后端加载所有已安装的市场插件并注册到 PluginRegistry。
 * 返回加载的插件数量。
 */
export async function loadInstalledMarketPlugins(): Promise<number> {
  const { loadInstalledPlugins } = await import('../../api/plugin-market-api')
  let installed: InstalledPlugin[] = []
  try {
    installed = await loadInstalledPlugins()
  } catch {
    // 预览模式或后端不可用时静默降级
    return 0
  }

  let count = 0
  for (const plugin of installed) {
    // 只注册启用的插件；禁用的插件不注册命令
    if (plugin.enabled) {
      registerMarketPlugin(plugin)
      count++
    }
  }

  return count
}

/** 获取已注册的市场插件 ID 集合 */
export function getRegisteredMarketPluginIds(): Set<string> {
  return new Set(registeredMarketPluginIds)
}
