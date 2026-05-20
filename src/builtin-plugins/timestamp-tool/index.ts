import type { ToolPlugin } from '../../core/plugin/plugin-types'
import TimestampToolView from './TimestampToolView'

const plugin: ToolPlugin = {
  id: 'official.timestamp-tool',
  name: '时间戳工具',
  version: '0.1.0',
  description: '时间戳和日期互转',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.timestamp-tool.open',
      pluginId: 'official.timestamp-tool',
      title: '时间戳工具',
      description: '时间戳和日期互转',
      keywords: ['timestamp', 'time', 'date', 'unix', '时间戳', '日期'],
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
      title: '时间戳工具',
      component: TimestampToolView,
    },
  ],
}

export default plugin
