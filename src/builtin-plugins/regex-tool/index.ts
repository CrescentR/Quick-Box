import type { ToolPlugin } from '../../core/plugin/plugin-types'
import RegexToolView from './RegexToolView'

const plugin: ToolPlugin = {
  id: 'official.regex-tool',
  name: '正则测试',
  version: '0.1.0',
  description: '测试正则表达式匹配结果',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.regex-tool.open',
      pluginId: 'official.regex-tool',
      title: '正则测试',
      description: '测试正则表达式并查看匹配结果',
      keywords: ['regex', 'regexp', 'regular expression', 'match', '正则', '匹配', '表达式'],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.regex-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.regex-tool.view',
      title: '正则测试',
      component: RegexToolView,
    },
  ],
}

export default plugin
