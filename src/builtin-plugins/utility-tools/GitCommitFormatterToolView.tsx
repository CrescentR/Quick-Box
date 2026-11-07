import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock } from '../../ui'

type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore' | 'revert'

const commitTypes: CommitType[] = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']

function buildCommitMessage(type: CommitType, scope: string, subject: string, breaking: boolean, body: string) {
  const normalizedScope = scope.trim()
  const normalizedSubject = subject.trim()
  const header = `${type}${normalizedScope ? `(${normalizedScope})` : ''}${breaking ? '!' : ''}: ${normalizedSubject || 'update quickbox'}`
  return [header, body.trim()].filter(Boolean).join('\n\n')
}

export default function GitCommitFormatterToolView() {
  const [type, setType] = useState<CommitType>('feat')
  const [scope, setScope] = useState('tools')
  const [subject, setSubject] = useState('add text diff view')
  const [body, setBody] = useState('')
  const [breaking, setBreaking] = useState(false)
  const message = useMemo(() => buildCommitMessage(type, scope, subject, breaking, body), [body, breaking, scope, subject, type])

  return (
    <ToolShell
      title="Git 标准 Commit 生成器"
      level="L1"
      description="按 Angular Conventional Commits 结构生成可复制的提交信息。"
      notes="- Header 格式为 `type(scope): subject`。\n- 勾选 breaking change 后会生成 `type(scope)!: subject`。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Type</span>
          <select className="qb-tool-input" value={type} onChange={(event) => setType(event.target.value as CommitType)}>
            {commitTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">Scope</span>
          <input className="qb-tool-input qb-mono" value={scope} onChange={(event) => setScope(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Subject</span>
          <input className="qb-tool-input" value={subject} onChange={(event) => setSubject(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Body，可留空</span>
          <textarea className="qb-tool-textarea qb-mono" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <label className="qb-tool-checkbox">
          <input type="checkbox" checked={breaking} onChange={(event) => setBreaking(event.target.checked)} />
          <span>Breaking change</span>
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">Commit Message</span>
          <CodeBlock code={message} language="git" wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(message)}>
          复制 Commit
        </button>
      </div>
    </ToolShell>
  )
}
