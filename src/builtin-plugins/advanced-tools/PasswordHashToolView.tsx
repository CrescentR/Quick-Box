import { useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock, Tag } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { hashPasswordPbkdf2, verifyPasswordPbkdf2 } from './password-hash'

export default function PasswordHashToolView() {
  const tr = useT()
  const [password, setPassword] = useState('QuickBox@2026')
  const [digest, setDigest] = useState<'SHA-256' | 'SHA-512'>('SHA-256')
  const [iterations, setIterations] = useState(100_000)
  const [generatedHash, setGeneratedHash] = useState('')
  const [verifyHash, setVerifyHash] = useState('')
  const [verifyStatus, setVerifyStatus] = useState<{ valid: boolean; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const handleGenerate = async () => {
    setBusy(true)
    try {
      const hash = await hashPasswordPbkdf2(password, iterations, digest)
      setGeneratedHash(hash)
      setVerifyHash(hash)
      setVerifyStatus(null)
    } catch (error) {
      setGeneratedHash(error instanceof Error ? error.message : tr('生成失败', 'Generation failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async () => {
    setBusy(true)
    try {
      setVerifyStatus(await verifyPasswordPbkdf2(password, verifyHash))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolShell
      title={tr('密码哈希生成与校验', 'Password Hash & Verify')}
      level="L2"
      description={tr(
        '基于 Web Crypto PBKDF2 生成带随机盐的密码哈希，并校验明文密码是否匹配。',
        'Generate salted password hashes via Web Crypto PBKDF2 and verify plain passwords in memory.',
      )}
      notes={tr(
        '- 默认使用 16 字节随机盐和 100,000 次迭代，输出 PHC 标准格式字符串。\n- 校验采用恒定时间字节比较，全程在本机内存中完成。',
        '- Uses a 16-byte random salt and 100,000 iterations by default, formatting output as PHC strings.\n- Verification compares bytes in constant time entirely locally.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('明文密码', 'Plain password')}</span>
          <input
            className="qb-tool-input qb-mono"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tr('输入要哈希或校验的明文密码', 'Enter password to hash or verify')}
          />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('摘要算法', 'Digest')}</span>
          <select className="qb-tool-input" value={digest} onChange={(e) => setDigest(e.target.value as 'SHA-256' | 'SHA-512')}>
            <option value="SHA-256">PBKDF2-HMAC-SHA256</option>
            <option value="SHA-512">PBKDF2-HMAC-SHA512</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('迭代次数 (1000–1000000)', 'Iterations (1000-1000000)')}</span>
          <input
            className="qb-tool-input"
            type="number"
            min={1000}
            max={1000000}
            step={10000}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
          />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('生成结果', 'Generated hash')}</span>
          <CodeBlock code={generatedHash || tr('// 点击下方「生成密码哈希」生成结果', '// Click "Generate hash" below')} language="txt" wrap copyable={Boolean(generatedHash)} />
        </div>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('待校验哈希字符串', 'Hash string to verify')}</span>
          <input
            className="qb-tool-input qb-mono"
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
            placeholder="$pbkdf2-sha256$i=100000$..."
          />
        </label>
      </div>
      <div className="qb-tool-actions">
        <button
          type="button"
          className="qb-tool-button qb-tool-button--primary"
          disabled={busy || !password}
          onClick={() => void handleGenerate()}
        >
          {tr('生成密码哈希', 'Generate hash')}
        </button>
        <button
          type="button"
          className="qb-tool-button"
          disabled={busy || !password || !verifyHash.trim()}
          onClick={() => void handleVerify()}
        >
          {tr('校验密码是否匹配', 'Verify password')}
        </button>
        {verifyStatus ? <Tag tone={verifyStatus.valid ? 'success' : 'danger'}>{verifyStatus.message}</Tag> : null}
      </div>
    </ToolShell>
  )
}
