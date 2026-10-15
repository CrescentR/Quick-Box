import { lazy } from 'react'
import type { ToolPlugin } from '../../core/plugin/plugin-types'

const plugin: ToolPlugin = {
  id: 'official.library-tool', name: '命令与文件', version: '1.0.0', source: 'builtin',
  description: '记录常用命令、保存文件副本，按标题、标签和内容搜索',
  permissions: ['storage.read', 'storage.write', 'fs.read', 'fs.write', 'clipboard.write'],
  commands: [{ id: 'official.library-tool.open', pluginId: 'official.library-tool', title: '命令与文件', description: '个人命令记录和文件收藏库', keywords: ['命令', '记录', '保存', '文件', '收藏', 'command', 'file', 'library', 'shell', '脚本'], source: 'builtin', executeMode: 'view', run: async (ctx) => ctx.openView('official.library-tool.view') }],
  views: [{ id: 'official.library-tool.view', title: '命令与文件', component: lazy(() => import('./LibraryToolView')) }],
}
export default plugin
