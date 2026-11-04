import { ToolShell } from './ToolShell'
import { useToolInput } from '../../core/tool/tool-context'
import { useMemo } from 'react'
import { CodeBlock } from '../../ui'

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  )
}

function decodeJwt(token: string) {
  try {
    const [header, payload, signature = ''] = token.trim().split('.')
    if (!header || !payload) return 'JWT 必须包含 header 和 payload 两段内容'
    return JSON.stringify(
      {
        header: JSON.parse(decodeBase64Url(header)),
        payload: JSON.parse(decodeBase64Url(payload)),
        signature长度: signature.length,
        是否有signature: Boolean(signature),
      },
      null,
      2,
    )
  } catch (error) {
    return error instanceof Error ? error.message : 'JWT 无效'
  }
}

export default function JwtDecoderToolView() {
  const [token, setToken] = useToolInput(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAxIiwibmFtZSI6IlF1aWNrQm94IiwiaWF0IjoxNzE2NDAwMDAwfQ.demo',
  )
  const output = useMemo(() => decodeJwt(token), [token])

  return (
    <ToolShell title="JWT 解析器" level="L2" description="在本地解析 JWT 的 header 与 payload，不把 token 发送到网络。这里只解析内容，未验证签名。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JWT</span>
          <textarea className="qb-tool-textarea qb-mono" value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解析结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
