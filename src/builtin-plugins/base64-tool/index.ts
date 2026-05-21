import type { ToolPlugin } from '../../core/plugin/plugin-types'
import Base64ToolView from './Base64ToolView'

const plugin: ToolPlugin = {
  id: 'official.base64-tool',
  name: 'Base64 Tool',
  version: '0.1.0',
  description: 'Encode and decode Base64 text payloads',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.base64-tool.open',
      pluginId: 'official.base64-tool',
      title: 'Base64 Tool',
      description: 'Encode and decode Base64',
      keywords: ['base64', 'encode', 'decode', 'text'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.base64-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.base64-tool.view',
      title: 'Base64 Tool',
      component: Base64ToolView,
    },
  ],
}

export default plugin
