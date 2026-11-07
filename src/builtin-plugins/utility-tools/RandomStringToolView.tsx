import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock } from '../../ui'

function generateRandomString(length: number, charset: string) {
  if (!charset) return ''
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => charset[value % charset.length]).join('')
}

export default function RandomStringToolView() {
  const [length, setLength] = useState(32)
  const [charset, setCharset] = useState('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
  const output = useMemo(() => generateRandomString(Math.max(1, Math.min(512, length)), charset), [charset, length])

  return (
    <ToolShell title="随机字符串生成器" level="L1" description="按自定义字符集生成随机令牌、短 ID 和测试用字符串。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">长度</span>
          <input className="qb-tool-input" type="number" min={1} max={512} value={length} onChange={(event) => setLength(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">字符集</span>
          <input className="qb-tool-input qb-mono" value={charset} onChange={(event) => setCharset(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输出</span>
          <CodeBlock code={output || '// 字符集为空'} language="txt" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)} disabled={!output}>
          复制输出
        </button>
      </div>
    </ToolShell>
  )
}
