import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const UrlToolView = lazy(() => import('./UrlToolView'))

const plugin: ToolPlugin = {
  id: 'official.url-tool',
  name: 'URL 工具',
  version: '0.1.0',
  description: 'URL 编解码和参数解析',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.url-tool.open',
      pluginId: 'official.url-tool',
      title: 'URL 工具',
      description: '编码、解码并解析 URL 参数',
      keywords: ['url', 'uri', 'encode', 'decode', 'query', 'params', '链接', '编码', '解码', '参数'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.url-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.url-tool.view',
      title: 'URL 工具',
      component: UrlToolView,
    },
  ],
}

export default plugin
