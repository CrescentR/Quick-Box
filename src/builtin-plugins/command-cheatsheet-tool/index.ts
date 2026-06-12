import type { ToolPlugin } from '../../core/plugin/plugin-types'
import CommandCheatsheetToolView from './CommandCheatsheetToolView'

const plugin: ToolPlugin = {
  id: 'official.command-cheatsheet-tool',
  name: 'Linux 命令速查',
  version: '0.1.0',
  description: '基于 tldr 的常用命令示例速查',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.command-cheatsheet-tool.open',
      pluginId: 'official.command-cheatsheet-tool',
      title: 'Linux 命令速查',
      description: '查看 tar、find、grep 等命令的常用示例',
      keywords: [
        'tldr',
        'linux',
        'command',
        'cheat',
        'sheet',
        'man',
        'shell',
        'bash',
        'tar',
        'find',
        'grep',
        '命令',
        '速查',
        '手册',
        '示例',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.command-cheatsheet-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.command-cheatsheet-tool.view',
      title: 'Linux 命令速查',
      component: CommandCheatsheetToolView,
    },
  ],
}

export default plugin
