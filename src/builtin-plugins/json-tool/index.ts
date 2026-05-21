import type { ToolPlugin } from '../../core/plugin/plugin-types'
import JsonToolView from './JsonToolView'

const plugin: ToolPlugin = {
  id: 'official.json-tool',
  name: 'JSON 工具',
  version: '0.1.0',
  description: '格式化、压缩并校验 JSON 内容',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.json-tool.open',
      pluginId: 'official.json-tool',
      title: 'JSON 工具',
      description: '格式化、压缩并校验 JSON',
      keywords: ['json', 'format', 'minify', 'validate', 'beautify', '格式化', '压缩', '校验'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.json-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.json-tool.view',
      title: 'JSON 工具',
      component: JsonToolView,
    },
  ],
}

export default plugin
