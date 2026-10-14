import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const PortKillerToolView = lazy(() => import('./PortKillerToolView'))

const plugin: ToolPlugin = {
  id: 'official.port-killer-tool',
  name: '端口占用清理',
  version: '0.1.0',
  description: '扫描并终止占用指定端口的进程',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['process.manage'],
  commands: [
    {
      id: 'official.port-killer-tool.open',
      pluginId: 'official.port-killer-tool',
      title: '端口占用清理',
      description: '查找并终止占用端口的进程，解决 EADDRINUSE',
      keywords: [
        'port',
        'kill',
        'pid',
        'netstat',
        'lsof',
        'taskkill',
        'eaddrinuse',
        '端口',
        '占用',
        '杀进程',
        '清理',
        '释放',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.port-killer-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.port-killer-tool.view',
      title: '端口占用清理',
      component: PortKillerToolView,
    },
  ],
}

export default plugin
