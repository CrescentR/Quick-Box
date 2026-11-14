import { useEffect, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { encryptAesGcm, decryptAesGcm } from './aes-gcm'
import type { AesMode } from './aes-gcm'

export default function AesGcmToolView() {
  const tr = useT()
  const locale = useLocale()
  const [mode, setMode] = useState<AesMode>('encrypt')
  const [input, setInput] = useState('QuickBox local encryption demo')
  const [password, setPassword] = useState('quickbox-password')
  const [output, setOutput] = useState('')

  useEffect(() => {
    let cancelled = false
    const task = mode === 'encrypt' ? encryptAesGcm(input, password) : decryptAesGcm(input, password)

    task
      .then((value) => {
        if (!cancelled) setOutput(value)
      })
      .catch((error) => {
        if (!cancelled) setOutput(error instanceof Error ? error.message : (locale === 'en-US' ? 'AES-GCM operation failed' : 'AES-GCM 处理失败'))
      })

    return () => {
      cancelled = true
    }
  }, [input, locale, mode, password])

  return (
    <ToolShell
      title={tr('AES-GCM 加解密', 'AES-GCM Encrypt / Decrypt')}
      level="L3"
      description={tr(
        '用浏览器 Web Crypto 在本地完成文本加密和解密，并输出可保存的 JSON 包。',
        'Encrypt and decrypt text locally via Web Crypto API, packaged as portable JSON.',
      )}
      notes={tr(
        '- 密钥由密码通过 PBKDF2-SHA256 派生，随机 salt 和 IV 会写入输出包。\n- 解密时请把加密输出完整粘贴到输入框，并使用同一个密码。',
        '- Keys are derived from your password via PBKDF2-SHA256 with random salt and IV.\n- Paste the full encrypted JSON payload and matching password to decrypt.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('模式', 'Mode')}</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as AesMode)}>
            <option value="encrypt">{tr('加密', 'Encrypt')}</option>
            <option value="decrypt">{tr('解密', 'Decrypt')}</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('密码', 'Password')}</span>
          <input className="qb-tool-input qb-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'encrypt' ? tr('明文输入', 'Plaintext input') : tr('加密包输入', 'Encrypted JSON input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'encrypt' ? tr('加密输出', 'Encrypted output') : tr('解密输出', 'Decrypted output')}</span>
          <CodeBlock code={output || tr('// 等待输入', '// Waiting for input')} language={mode === 'encrypt' ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
