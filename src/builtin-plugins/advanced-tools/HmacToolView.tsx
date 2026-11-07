import { useEffect, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { createHmac } from './hmac'
import type { HmacAlgorithm } from './hmac'

export default function HmacToolView() {
  const [message, setMessage] = useState('method=POST&path=/api/tools&ts=1716400000')
  const [secret, setSecret] = useState('quickbox-secret')
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>('SHA-256')
  const [digest, setDigest] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    createHmac(message, secret, algorithm)
      .then((value) => {
        if (!cancelled) {
          setDigest(value)
          setError('')
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setDigest('')
          setError(nextError instanceof Error ? nextError.message : '无法生成 HMAC')
        }
      })
    return () => {
      cancelled = true
    }
  }, [algorithm, message, secret])

  return (
    <ToolShell title="HMAC 生成器" level="L2" description="使用 Web Crypto 在本地生成接口签名调试常用的 HMAC 摘要。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">签名内容</span>
          <textarea className="qb-tool-textarea qb-mono" value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <label className="qb-tool-field">
            <span className="qb-tool-label">密钥</span>
            <input className="qb-tool-input qb-mono" value={secret} onChange={(event) => setSecret(event.target.value)} />
          </label>
          <label className="qb-tool-field">
            <span className="qb-tool-label">算法</span>
            <select className="qb-tool-input" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HmacAlgorithm)}>
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-384">SHA-384</option>
              <option value="SHA-512">SHA-512</option>
            </select>
          </label>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">签名结果</span>
          <CodeBlock code={error || digest || '// 等待输入'} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
