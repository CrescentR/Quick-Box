import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const CookieToolView = lazy(() => import('./CookieToolView'))

const plugin: ToolPlugin = {
  id: 'official.cookie-tool',
  name: 'Cookie 解析器',
  version: '0.1.0',
  description: '解析 Cookie / Set-Cookie 头，并重建请求 Cookie',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.cookie-tool.open',
      pluginId: 'official.cookie-tool',
      title: 'Cookie 解析器',
      description: '解析 Cookie 与 Set-Cookie，查看 HttpOnly、SameSite 等属性',
      keywords: [
        'cookie',
        'set-cookie',
        'httponly',
        'samesite',
        'session',
        'header',
        '解析',
        '请求头',
        '会话',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.cookie-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.cookie-tool.view',
      title: 'Cookie 解析器',
      component: CookieToolView,
    },
  ],
}

export default plugin
