import type { ToolPlugin } from '../../core/plugin/plugin-types'
import TimestampToolView from './TimestampToolView'

const plugin: ToolPlugin = {
  id: 'official.timestamp-tool',
  name: 'Timestamp Tool',
  version: '0.1.0',
  description: 'Convert between Unix timestamps and ISO time strings',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.timestamp-tool.open',
      pluginId: 'official.timestamp-tool',
      title: 'Timestamp Tool',
      description: 'Convert timestamps and dates',
      keywords: ['timestamp', 'time', 'date', 'unix', 'iso'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.timestamp-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.timestamp-tool.view',
      title: 'Timestamp Tool',
      component: TimestampToolView,
    },
  ],
}

export default plugin
