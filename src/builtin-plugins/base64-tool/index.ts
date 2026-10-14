import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const Base64ToolView = lazy(() => import('./Base64ToolView'))

const plugin: ToolPlugin = {
  id: 'official.base64-tool',
  name: 'Base64 编解码',
  version: '0.1.0',
  description: '编码和解码 Base64 文本',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.base64-tool.open',
      pluginId: 'official.base64-tool',
      title: 'Base64 编解码',
      description: '编码和解码 Base64',
      keywords: ['base64', 'encode', 'decode', 'text', '编码', '解码', '文本'],
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
      title: 'Base64 编解码',
      component: Base64ToolView,
    },
  ],
}

export default plugin
