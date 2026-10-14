import type { ToolPlugin } from '../../core/plugin/plugin-types'
import { lazy } from 'react'
const JsonSchemaToolView = lazy(() => import('./JsonSchemaToolView'))

const plugin: ToolPlugin = {
  id: 'official.json-schema-tool',
  name: 'JSON Schema 生成器',
  version: '0.1.0',
  description: '从示例 JSON 推断 JSON Schema',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.json-schema-tool.open',
      pluginId: 'official.json-schema-tool',
      title: 'JSON Schema 生成器',
      description: '根据示例 JSON 生成 Draft 2020-12 Schema',
      keywords: [
        'json',
        'schema',
        'json schema',
        'openapi',
        'draft',
        '类型',
        '契约',
        '生成',
        '接口',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.json-schema-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.json-schema-tool.view',
      title: 'JSON Schema 生成器',
      component: JsonSchemaToolView,
    },
  ],
}

export default plugin
