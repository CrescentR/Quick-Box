import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { scorePassword } from './password-strength'

export default function PasswordStrengthToolView() {
  const tr = useT()
  const locale = useLocale()
  const [password, setPassword] = useState('QuickBox@2026')
  const report = useMemo(() => scorePassword(password, locale), [locale, password])

  return (
    <ToolShell
      title={tr('密码强度检测', 'Password Strength Checker')}
      level="L2"
      description={tr(
        '从长度、字符类型和重复模式快速评估密码强度。',
        'Evaluate password strength across length, character classes, and repeated patterns.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('密码', 'Password')}</span>
          <input className="qb-tool-input qb-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('检测结果', 'Report')}</span>
          <CodeBlock code={report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
