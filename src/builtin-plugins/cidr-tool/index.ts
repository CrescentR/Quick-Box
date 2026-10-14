import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const CidrToolView = lazy(() => import('./CidrToolView'))

const plugin: ToolPlugin = {
  id: 'official.cidr-tool',
  name: 'CIDR 子网计算器',
  version: '0.1.0',
  description: '计算 IPv4 网段、掩码、广播地址和可用主机范围',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.cidr-tool.open',
      pluginId: 'official.cidr-tool',
      title: 'CIDR 子网计算器',
      description: '解析 IPv4 CIDR，计算网络、广播和主机范围',
      keywords: [
        'cidr',
        'subnet',
        'ip',
        'ipv4',
        'netmask',
        'broadcast',
        'vpc',
        '网段',
        '子网',
        '掩码',
        '广播',
        '计算器',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.cidr-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.cidr-tool.view',
      title: 'CIDR 子网计算器',
      component: CidrToolView,
    },
  ],
}

export default plugin
