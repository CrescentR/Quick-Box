import { commandRegistry } from '../command/command-registry'
import type { PluginView, ToolPlugin } from './plugin-types'

export class PluginRegistry {
  private readonly plugins = new Map<string, ToolPlugin>()
  private readonly views = new Map<string, PluginView>()

  register(plugin: ToolPlugin) {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`)
    }

    this.plugins.set(plugin.id, plugin)
    commandRegistry.registerMany(plugin.commands)

    for (const view of plugin.views ?? []) {
      if (this.views.has(view.id)) {
        throw new Error(`Plugin view already registered: ${view.id}`)
      }

      this.views.set(view.id, view)
    }
  }

  listPlugins() {
    return Array.from(this.plugins.values())
  }

  getPlugin(pluginId: string) {
    return this.plugins.get(pluginId)
  }

  getView(viewId: string) {
    return this.views.get(viewId)
  }

  clear() {
    this.plugins.clear()
    this.views.clear()
    commandRegistry.clear()
  }
}

export const pluginRegistry = new PluginRegistry()
