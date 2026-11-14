import { ToolShell } from '../../core/tool/ToolShell'
import { useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { lt, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import type { JsonValue } from './utility-shared'

type JwtAlgorithm = 'HS256'

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value))
}

async function signHs256(message: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return bytesToBase64Url(new Uint8Array(signature))
}

async function createJwt(payloadText: string, secret: string, algorithm: JwtAlgorithm) {
  if (algorithm !== 'HS256') return lt('当前版本仅支持 HS256', 'Only HS256 is supported in this version')

  const payload = JSON.parse(payloadText) as JsonValue
  const header = { alg: algorithm, typ: 'JWT' }
  const encodedHeader = textToBase64Url(JSON.stringify(header))
  const encodedPayload = textToBase64Url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = await signHs256(signingInput, secret)
  return `${signingInput}.${signature}`
}

export default function JwtGeneratorToolView() {
  const tr = useT()
  const [payload, setPayload] = useState('{\n  "id": 1,\n  "name": "QuickBox",\n  "iat": 1781200000\n}')
  const [secret, setSecret] = useState('quickbox-secret')
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>('HS256')
  const [token, setToken] = useState('')

  const generateToken = async () => {
    try {
      setToken(await createJwt(payload, secret, algorithm))
    } catch (error) {
      setToken(error instanceof Error ? error.message : lt('JWT 生成失败', 'Failed to generate JWT'))
    }
  }

  return (
    <ToolShell
      title={tr('JWT 生成器', 'JWT Generator')}
      level="L1"
      description={tr('输入 payload 和密钥，在本地生成 HS256 JWT，适合接口鉴权联调。', 'Sign HS256 JWT tokens locally from JSON payload and secret for API testing.')}
      notes={tr(
        '- 生成过程只在本地完成，不会把密钥或 payload 发送到网络。\n- 当前版本按文档需求实现 HS256。',
        '- Signing runs entirely locally; secrets and payloads are never sent over the network.\n- Currently implements HS256.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Payload JSON</span>
          <textarea className="qb-tool-textarea qb-mono" value={payload} onChange={(event) => setPayload(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('算法', 'Algorithm')}</span>
          <select className="qb-tool-input" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as JwtAlgorithm)}>
            <option value="HS256">HS256</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('密钥', 'Secret')}</span>
          <input className="qb-tool-input qb-mono" value={secret} onChange={(event) => setSecret(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JWT</span>
          <CodeBlock code={token || tr('// 点击生成 JWT', '// Click Generate JWT')} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void generateToken()}>
          {tr('生成 JWT', 'Generate JWT')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(token)} disabled={!token}>
          {tr('复制 JWT', 'Copy JWT')}
        </button>
      </div>
    </ToolShell>
  )
}
