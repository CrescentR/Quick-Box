import { lazy } from 'react'
import type { ToolPlugin } from '../../core/plugin/plugin-types'

const plugin: ToolPlugin = {
  id: 'official.snippet-tool', name: '本地代码片段', version: '1.0.0', source: 'builtin',
  description: '搜索、编辑和复制本地代码片段与模板', permissions: ['storage.read', 'storage.write', 'clipboard.write'],
  commands: [{ id: 'official.snippet-tool.open', pluginId: 'official.snippet-tool', title: '本地代码片段', description: '保存代码和模板，按标题与标签检索', keywords: ['snippet', '片段', '模板', '代码'], source: 'builtin', executeMode: 'view', run: async (ctx) => ctx.openView('official.snippet-tool.view') }],
  views: [{ id: 'official.snippet-tool.view', title: '本地代码片段', component: lazy(() => import('./SnippetToolView')) }],
}
export default plugin
