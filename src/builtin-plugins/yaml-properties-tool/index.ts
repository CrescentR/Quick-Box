import type { ToolPlugin } from '../../core/plugin/plugin-types'
import YamlPropertiesToolView from './YamlPropertiesToolView'

const plugin: ToolPlugin = {
  id: 'official.yaml-properties-tool',
  name: 'YAML / Properties 互转',
  version: '0.1.0',
  description: '在 YAML 配置和 .properties 键值之间双向转换',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.yaml-properties-tool.open',
      pluginId: 'official.yaml-properties-tool',
      title: 'YAML / Properties 互转',
      description: '把 application.yml 与 application.properties 互相转换',
      keywords: [
        'yaml',
        'yml',
        'properties',
        'spring',
        'application.yml',
        'application.properties',
        '配置',
        '互转',
        '转换',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.yaml-properties-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.yaml-properties-tool.view',
      title: 'YAML / Properties 互转',
      component: YamlPropertiesToolView,
    },
  ],
}

export default plugin
