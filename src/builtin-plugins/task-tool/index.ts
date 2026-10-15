import { lazy } from 'react'
import type { ToolPlugin } from '../../core/plugin/plugin-types'

const plugin: ToolPlugin = {
  id: 'official.task-tool', name: '任务管理', version: '1.0.0', source: 'builtin', author: 'QuickBox',
  description: '安排日程、管理待办和子任务，支持重复提醒、列表标签及 Task 数据导入',
  permissions: ['storage.read', 'storage.write', 'notification.send'],
  commands: [{ id: 'official.task-tool.open', pluginId: 'official.task-tool', title: '任务管理', description: '今天、收集箱、任务列表与到期提醒', keywords: ['task', 'todo', '待办', '任务', '清单', '日程'], source: 'builtin', executeMode: 'view', run: async (ctx) => ctx.openView('official.task-tool.view') }],
  views: [{ id: 'official.task-tool.view', title: '任务管理', component: lazy(() => import('./TaskToolView')) }],
}
export default plugin
