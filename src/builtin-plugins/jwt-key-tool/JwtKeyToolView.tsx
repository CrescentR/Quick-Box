import { useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'
import {
  HMAC_BYTE_LENGTH,
  generateEcdsaKeyPair,
  generateHmacSecret,
  generateRsaKeyPair,
  type AsymmetricKeyMaterial,
  type HmacSecretEncoding,
  type JwtKeyAlgorithm,
} from './jwt-key-utils'

const algorithms: JwtKeyAlgorithm[] = ['HS256', 'HS384', 'HS512', 'RS256', 'ES256']

function isHmac(algorithm: JwtKeyAlgorithm): algorithm is 'HS256' | 'HS384' | 'HS512' {
  return algorithm.startsWith('HS')
}

export default function JwtKeyToolView() {
  const [algorithm, setAlgorithm] = useState<JwtKeyAlgorithm>('HS256')
  const [hmacBytes, setHmacBytes] = useState(32)
  const [rsaBits, setRsaBits] = useState<2048 | 4096>(2048)
  const [hmacSecret, setHmacSecret] = useState<HmacSecretEncoding | null>(null)
  const [asymmetricKey, setAsymmetricKey] = useState<AsymmetricKeyMaterial | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const { copyText, clipboardToast } = useClipboardToast()

  const generateKey = async () => {
    setBusy(true)
    setStatus('')
    try {
      if (isHmac(algorithm)) {
        setAsymmetricKey(null)
        setHmacSecret(generateHmacSecret(hmacBytes))
        return
      }

      setHmacSecret(null)
      const nextKey = algorithm === 'RS256' ? await generateRsaKeyPair(rsaBits) : await generateEcdsaKeyPair()
      setAsymmetricKey(nextKey)
    } catch (error) {
      setHmacSecret(null)
      setAsymmetricKey(null)
      setStatus(error instanceof Error ? error.message : '密钥生成失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">JWT 密钥生成器</div>
          <div className="qb-tool-view__description">
            在本地生成 JWT 签名密钥。HMAC 输出随机密钥，RSA / ECDSA 输出 PEM 与 JWK，适合联调鉴权配置。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{algorithm}</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">算法</span>
          <select
            id="jwt-key-algorithm"
            name="jwt-key-algorithm"
            className="qb-tool-input"
            value={algorithm}
            onChange={(event) => {
              const next = event.target.value as JwtKeyAlgorithm
              setAlgorithm(next)
              if (isHmac(next)) setHmacBytes(HMAC_BYTE_LENGTH[next])
            }}
          >
            {algorithms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {isHmac(algorithm) ? (
          <label className="qb-tool-field">
            <span className="qb-tool-label">密钥字节数</span>
            <input
              id="jwt-key-hmac-bytes"
              name="jwt-key-hmac-bytes"
              className="qb-tool-input qb-mono"
              type="number"
              min={16}
              max={128}
              value={hmacBytes}
              onChange={(event) => setHmacBytes(Number(event.target.value) || 32)}
            />
          </label>
        ) : algorithm === 'RS256' ? (
          <label className="qb-tool-field">
            <span className="qb-tool-label">RSA 模数长度</span>
            <select
              id="jwt-key-rsa-bits"
              name="jwt-key-rsa-bits"
              className="qb-tool-input"
              value={rsaBits}
              onChange={(event) => setRsaBits(Number(event.target.value) as 2048 | 4096)}
            >
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </label>
        ) : (
          <label className="qb-tool-field">
            <span className="qb-tool-label">曲线</span>
            <input className="qb-tool-input qb-mono" value="P-256" readOnly />
          </label>
        )}
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void generateKey()} disabled={busy}>
          {busy ? '生成中…' : '生成密钥'}
        </button>
        {hmacSecret ? (
          <>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(hmacSecret.hex, 'HMAC hex secret')}>
              复制 Hex
            </button>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(hmacSecret.base64, 'HMAC base64 secret')}>
              复制 Base64
            </button>
            <button
              className="qb-tool-button"
              type="button"
              onClick={() => void copyText(hmacSecret.base64url, 'HMAC base64url secret')}
            >
              复制 Base64URL
            </button>
          </>
        ) : null}
        {asymmetricKey ? (
          <>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(asymmetricKey.privatePem, 'Private PEM')}>
              复制私钥 PEM
            </button>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(asymmetricKey.publicPem, 'Public PEM')}>
              复制公钥 PEM
            </button>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(asymmetricKey.privateJwk, 'Private JWK')}>
              复制私钥 JWK
            </button>
          </>
        ) : null}
      </div>

      {status ? <CodeBlock code={status} language="txt" wrap /> : null}

      {hmacSecret ? (
        <div className="qb-tool-grid">
          <div className="qb-tool-field">
            <span className="qb-tool-label">Hex</span>
            <CodeBlock code={hmacSecret.hex} language="txt" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">Base64</span>
            <CodeBlock code={hmacSecret.base64} language="txt" wrap copyable />
          </div>
          <div className="qb-tool-field qb-tool-field--full">
            <span className="qb-tool-label">Base64URL</span>
            <CodeBlock code={hmacSecret.base64url} language="txt" wrap copyable />
          </div>
        </div>
      ) : null}

      {asymmetricKey ? (
        <div className="qb-tool-grid">
          <div className="qb-tool-field">
            <span className="qb-tool-label">私钥 PEM</span>
            <CodeBlock code={asymmetricKey.privatePem} language="pem" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">公钥 PEM</span>
            <CodeBlock code={asymmetricKey.publicPem} language="pem" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">私钥 JWK</span>
            <CodeBlock code={asymmetricKey.privateJwk} language="json" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">公钥 JWK</span>
            <CodeBlock code={asymmetricKey.publicJwk} language="json" wrap copyable />
          </div>
        </div>
      ) : null}

      {!hmacSecret && !asymmetricKey && !status ? (
        <CodeBlock code="// 选择算法后点击生成密钥" language="txt" wrap />
      ) : null}

      <Detail
        title="使用说明"
        markdown="- 密钥只在本地用 Web Crypto 生成，不会上传。\n- HMAC 建议长度与算法一致：HS256 / 32 字节、HS384 / 48 字节、HS512 / 64 字节。\n- RS256 输出 PKCS#8 私钥与 SPKI 公钥；ES256 使用 P-256 曲线。\n- 现有「JWT 生成器」用密钥签发 Token，本工具只负责生成密钥材料。"
        metadata={[
          { label: 'HMAC', value: 'HS256 / HS384 / HS512' },
          { label: '非对称', value: 'RS256 / ES256' },
          { label: '输出', value: 'Hex · Base64 · PEM · JWK' },
        ]}
      />
      {clipboardToast}
    </section>
  )
}
