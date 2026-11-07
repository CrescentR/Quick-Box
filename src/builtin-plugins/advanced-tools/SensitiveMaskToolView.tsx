import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { maskSensitive } from './sensitive-mask'

export default function SensitiveMaskToolView() {
  const [input, setInput] = useState('email=dev@quickbox.local\nphone=13812345678\napi_key=qbox_123456789')
  const output = useMemo(() => maskSensitive(input), [input])

  return (
    <ToolShell title="敏感信息脱敏" level="L2" description="识别邮箱、手机号、银行卡号和常见密钥字段，并生成脱敏文本。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">原始文本</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">脱敏结果</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
