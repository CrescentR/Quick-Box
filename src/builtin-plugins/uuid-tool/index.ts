import type { ToolPlugin } from '../../core/plugin/plugin-types'
import UuidToolView from './UuidToolView'

const plugin: ToolPlugin = {
  id: 'official.uuid-tool',
  name: 'UUID 生成器',
  version: '0.1.0',
  description: '生成随机 UUID',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.uuid-tool.open',
      pluginId: 'official.uuid-tool',
      title: 'UUID 生成器',
      description: '生成随机 UUID v4',
      keywords: ['uuid', 'guid', 'id', 'random', '生成', '随机'],
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
      title: 'UUID 生成器',
      component: UuidToolView,
    },
  ],
}

export default plugin
