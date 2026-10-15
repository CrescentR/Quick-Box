import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
import source from './data/source.json'
import commandNames from './data/command-names.json'
const CommandCheatsheetToolView = lazy(() => import('./CommandCheatsheetToolView'))

const plugin: ToolPlugin = {
  id: 'official.command-cheatsheet-tool',
  name: 'Linux 命令大全',
  version: '1.0.0',
  description: `${source.count} 份离线 Linux 命令手册，支持中文全文搜索与 tldr 快速示例`,
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.command-cheatsheet-tool.open',
      pluginId: 'official.command-cheatsheet-tool',
      title: 'Linux 命令大全',
      description: `离线搜索 ${source.count} 个命令的详细说明、选项和使用示例`,
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
        'linux-command',
        '大全',
        'systemctl',
        'iptables',
        'journalctl',
        'apt',
        'yum',
        'ssh',
        ...commandNames,
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
      title: 'Linux 命令大全',
      component: CommandCheatsheetToolView,
    },
  ],
}

export default plugin
