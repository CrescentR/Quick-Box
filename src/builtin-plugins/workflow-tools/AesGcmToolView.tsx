import { useEffect, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { encryptAesGcm, decryptAesGcm } from './aes-gcm'
import type { AesMode } from './aes-gcm'

export default function AesGcmToolView() {
  const [mode, setMode] = useState<AesMode>('encrypt')
  const [input, setInput] = useState('QuickBox 本地加密示例')
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
        if (!cancelled) setOutput(error instanceof Error ? error.message : 'AES-GCM 处理失败')
      })

    return () => {
      cancelled = true
    }
  }, [input, mode, password])

  return (
    <ToolShell
      title="AES-GCM 加解密"
      level="L3"
      description="用浏览器 Web Crypto 在本地完成文本加密和解密，并输出可保存的 JSON 包。"
      notes="- 密钥由密码通过 PBKDF2-SHA256 派生，随机 salt 和 IV 会写入输出包。\n- 解密时请把加密输出完整粘贴到输入框，并使用同一个密码。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">模式</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as AesMode)}>
            <option value="encrypt">加密</option>
            <option value="decrypt">解密</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">密码</span>
          <input className="qb-tool-input qb-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'encrypt' ? '明文输入' : '加密包输入'}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{mode === 'encrypt' ? '加密输出' : '解密输出'}</span>
          <CodeBlock code={output || '// 等待输入'} language={mode === 'encrypt' ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
