import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { scorePassword } from './password-strength'

export default function PasswordStrengthToolView() {
  const [password, setPassword] = useState('QuickBox@2026')
  const report = useMemo(() => scorePassword(password), [password])

  return (
    <ToolShell title="密码强度检测" level="L2" description="从长度、字符类型和重复模式快速评估密码强度。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">密码</span>
          <input className="qb-tool-input qb-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">检测结果</span>
          <CodeBlock code={report} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
