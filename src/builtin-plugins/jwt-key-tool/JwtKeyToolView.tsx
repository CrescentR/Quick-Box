import { useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
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
  const tr = useT()
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
      setStatus(error instanceof Error ? error.message : tr('密钥生成失败', 'Failed to generate key'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title={tr('JWT 密钥生成器', 'JWT Key Generator')}
      description={tr(
        '在本地生成 JWT 签名密钥。HMAC 输出随机密钥，RSA / ECDSA 输出 PEM 与 JWK，适合联调鉴权配置。',
        'Generate JWT signing keys locally. HMAC outputs random secrets while RSA / ECDSA outputs PEM and JWK pairs.',
      )}
      badge={algorithm}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('算法', 'Algorithm')}</span>
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
            <span className="qb-tool-label">{tr('密钥字节数', 'Secret bytes')}</span>
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
            <span className="qb-tool-label">{tr('RSA 模数长度', 'RSA modulus bits')}</span>
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
            <span className="qb-tool-label">{tr('曲线', 'Curve')}</span>
            <input className="qb-tool-input qb-mono" value="P-256" readOnly />
          </label>
        )}
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void generateKey()} disabled={busy}>
          {busy ? tr('生成中…', 'Generating...') : tr('生成密钥', 'Generate key')}
        </button>
        {hmacSecret ? (
          <>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(hmacSecret.hex, 'HMAC hex secret')}>
              {tr('复制 Hex', 'Copy Hex')}
            </button>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(hmacSecret.base64, 'HMAC base64 secret')}>
              {tr('复制 Base64', 'Copy Base64')}
            </button>
            <button
              className="qb-tool-button"
              type="button"
              onClick={() => void copyText(hmacSecret.base64url, 'HMAC base64url secret')}
            >
              {tr('复制 Base64URL', 'Copy Base64URL')}
            </button>
          </>
        ) : null}
        {asymmetricKey ? (
          <>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(asymmetricKey.privatePem, 'Private PEM')}>
              {tr('复制私钥 PEM', 'Copy private PEM')}
            </button>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(asymmetricKey.publicPem, 'Public PEM')}>
              {tr('复制公钥 PEM', 'Copy public PEM')}
            </button>
            <button className="qb-tool-button" type="button" onClick={() => void copyText(asymmetricKey.privateJwk, 'Private JWK')}>
              {tr('复制私钥 JWK', 'Copy private JWK')}
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
            <span className="qb-tool-label">{tr('私钥 PEM', 'Private PEM')}</span>
            <CodeBlock code={asymmetricKey.privatePem} language="pem" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">{tr('公钥 PEM', 'Public PEM')}</span>
            <CodeBlock code={asymmetricKey.publicPem} language="pem" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">{tr('私钥 JWK', 'Private JWK')}</span>
            <CodeBlock code={asymmetricKey.privateJwk} language="json" wrap copyable />
          </div>
          <div className="qb-tool-field">
            <span className="qb-tool-label">{tr('公钥 JWK', 'Public JWK')}</span>
            <CodeBlock code={asymmetricKey.publicJwk} language="json" wrap copyable />
          </div>
        </div>
      ) : null}

      {!hmacSecret && !asymmetricKey && !status ? (
        <CodeBlock code={tr('// 选择算法后点击生成密钥', '// Choose an algorithm and click Generate key')} language="txt" wrap />
      ) : null}

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          '- 密钥只在本地用 Web Crypto 生成，不会上传。\n- HMAC 建议长度与算法一致：HS256 / 32 字节、HS384 / 48 字节、HS512 / 64 字节。\n- RS256 输出 PKCS#8 私钥与 SPKI 公钥；ES256 使用 P-256 曲线。\n- 现有「JWT 生成器」用密钥签发 Token，本工具只负责生成密钥材料。',
          '- Keys are generated locally via Web Crypto and never uploaded.\n- Recommended HMAC lengths: HS256 / 32 bytes, HS384 / 48 bytes, HS512 / 64 bytes.\n- RS256 outputs PKCS#8 private / SPKI public keys; ES256 uses P-256.\n- Use "JWT Generator" to sign tokens with the generated key material.',
        )}
        metadata={[
          { label: 'HMAC', value: 'HS256 / HS384 / HS512' },
          { label: tr('非对称', 'Asymmetric'), value: 'RS256 / ES256' },
          { label: tr('输出', 'Output'), value: 'Hex · Base64 · PEM · JWK' },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
