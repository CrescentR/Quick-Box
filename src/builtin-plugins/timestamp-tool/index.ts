import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const TimestampToolView = lazy(() => import('./TimestampToolView'))

const plugin: ToolPlugin = {
  id: 'official.timestamp-tool',
  name: '时间戳转换',
  version: '0.1.0',
  description: '在 Unix 时间戳和 ISO 时间之间转换',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.timestamp-tool.open',
      pluginId: 'official.timestamp-tool',
      title: '时间戳转换',
      description: '转换时间戳和日期',
      keywords: ['timestamp', 'time', 'date', 'unix', 'iso', '时间戳', '时间', '日期'],
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
      title: '时间戳转换',
      component: TimestampToolView,
    },
  ],
}

export default plugin
