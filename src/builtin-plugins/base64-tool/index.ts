import type { ToolPlugin } from '../../core/plugin/plugin-types'
import Base64ToolView from './Base64ToolView'

const plugin: ToolPlugin = {
  id: 'official.base64-tool',
  name: 'Base64 工具',
  version: '0.1.0',
  description: 'Base64 编码和解码',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.base64-tool.open',
      pluginId: 'official.base64-tool',
      title: 'Base64 工具',
      description: 'Base64 编码和解码',
      keywords: ['base64', 'encode', 'decode', '编码', '解码'],
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
      title: 'Base64 工具',
      component: Base64ToolView,
    },
  ],
}

export default plugin
