import type { ToolPlugin } from '../../core/plugin/plugin-types'
import JsonToolView from './JsonToolView'

const plugin: ToolPlugin = {
  id: 'official.json-tool',
  name: 'JSON Tool',
  version: '0.1.0',
  description: 'Format, minify, and validate JSON content',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.read', 'clipboard.write'],
  commands: [
    {
      id: 'official.json-tool.open',
      pluginId: 'official.json-tool',
      title: 'JSON Tool',
      description: 'Format, minify, and validate JSON',
      keywords: ['json', 'format', 'minify', 'validate', 'beautify'],
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
      title: 'JSON Tool',
      component: JsonToolView,
    },
  ],
}

export default plugin
