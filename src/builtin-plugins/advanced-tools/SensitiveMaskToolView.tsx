import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { maskSensitive } from './sensitive-mask'

export default function SensitiveMaskToolView() {
  const tr = useT()
  const [input, setInput] = useState('email=dev@quickbox.local\nphone=13812345678\napi_key=qbox_123456789')
  const output = useMemo(() => maskSensitive(input), [input])

  return (
    <ToolShell
      title={tr('敏感信息脱敏', 'Sensitive Data Masker')}
      level="L2"
      description={tr(
        '识别邮箱、手机号、银行卡号和常见密钥字段，并生成脱敏文本。',
        'Detect and redact emails, phone numbers, card numbers, and common API secret fields.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('原始文本', 'Raw text')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('脱敏结果', 'Masked output')}</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
