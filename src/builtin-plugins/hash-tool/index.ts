import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const HashToolView = lazy(() => import('./HashToolView'))

const plugin: ToolPlugin = {
  id: 'official.hash-tool',
  name: 'Hash 工具',
  version: '0.1.0',
  description: '生成 SHA 系列摘要',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.hash-tool.open',
      pluginId: 'official.hash-tool',
      title: 'Hash 工具',
      description: '生成 SHA-1、SHA-256 和 SHA-512 摘要',
      keywords: ['hash', 'sha', 'sha1', 'sha256', 'sha512', 'digest', '哈希', '摘要'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.hash-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.hash-tool.view',
      title: 'Hash 工具',
      component: HashToolView,
    },
  ],
}

export default plugin
