import type { ToolPlugin } from '../../core/plugin/plugin-types'
import UuidToolView from './UuidToolView'

const plugin: ToolPlugin = {
  id: 'official.uuid-tool',
  name: 'UUID Tool',
  version: '0.1.0',
  description: 'Generate random UUID values',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.uuid-tool.open',
      pluginId: 'official.uuid-tool',
      title: 'UUID Tool',
      description: 'Generate random UUID v4 values',
      keywords: ['uuid', 'guid', 'id', 'random'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.uuid-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.uuid-tool.view',
      title: 'UUID Tool',
      component: UuidToolView,
    },
  ],
}

export default plugin
