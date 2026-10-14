import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const ChmodCalculatorToolView = lazy(() => import('./ChmodCalculatorToolView'))

const plugin: ToolPlugin = {
  id: 'official.chmod-calculator-tool',
  name: 'Linux 权限计算器',
  version: '0.1.0',
  description: '在 rwx 勾选与八进制 chmod 模式之间双向转换',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.chmod-calculator-tool.open',
      pluginId: 'official.chmod-calculator-tool',
      title: 'Linux 权限计算器',
      description: '计算 chmod 八进制权限并生成命令',
      keywords: [
        'chmod',
        'permission',
        'rwx',
        '755',
        '644',
        '777',
        'linux',
        'unix',
        '权限',
        '八进制',
        '符号',
        'owner',
        'group',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.chmod-calculator-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.chmod-calculator-tool.view',
      title: 'Linux 权限计算器',
      component: ChmodCalculatorToolView,
    },
  ],
}

export default plugin
