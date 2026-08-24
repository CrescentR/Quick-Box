import type { ToolPlugin } from '../../core/plugin/plugin-types'
import JwtKeyToolView from './JwtKeyToolView'

const plugin: ToolPlugin = {
  id: 'official.jwt-key-tool',
  name: 'JWT 密钥生成器',
  version: '0.1.0',
  description: '生成本地 JWT 签名密钥，支持 HMAC、RSA 和 ECDSA',
  author: 'QuickBox',
  source: 'builtin',
  permissions: ['clipboard.write'],
  commands: [
    {
      id: 'official.jwt-key-tool.open',
      pluginId: 'official.jwt-key-tool',
      title: 'JWT 密钥生成器',
      description: '生成 HS256/RS256/ES256 签名密钥、PEM 和 JWK',
      keywords: [
        'jwt',
        'key',
        'secret',
        'pem',
        'jwk',
        'hs256',
        'rs256',
        'es256',
        'rsa',
        'ecdsa',
        '密钥',
        '私钥',
        '公钥',
        '签名',
      ],
      source: 'builtin',
      executeMode: 'view',
      run: async (ctx) => {
        await ctx.openView('official.jwt-key-tool.view')
      },
    },
  ],
  views: [
    {
      id: 'official.jwt-key-tool.view',
      title: 'JWT 密钥生成器',
      component: JwtKeyToolView,
    },
  ],
}

export default plugin
