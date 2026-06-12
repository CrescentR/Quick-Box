import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Tag } from '../../ui'
import {
  chmodPresets,
  createDefaultPermissions,
  parseOctalMode,
  parseSymbolicMode,
  permissionsToCommand,
  permissionsToOctal,
  permissionsToSymbolic,
  updatePermission,
  type ChmodBit,
  type ChmodPermissions,
  type ChmodSubject,
} from './chmod-utils'

const subjects: Array<{ key: ChmodSubject; label: string }> = [
  { key: 'owner', label: 'Owner（所有者）' },
  { key: 'group', label: 'Group（用户组）' },
  { key: 'other', label: 'Public（其他用户）' },
]

const bits: Array<{ key: ChmodBit; label: string; weight: number }> = [
  { key: 'read', label: 'Read (r)', weight: 4 },
  { key: 'write', label: 'Write (w)', weight: 2 },
  { key: 'execute', label: 'Execute (x)', weight: 1 },
]

export default function ChmodCalculatorToolView() {
  const [permissions, setPermissions] = useState<ChmodPermissions>(createDefaultPermissions)
  const [octalInput, setOctalInput] = useState('755')
  const [symbolicInput, setSymbolicInput] = useState('rwxr-xr-x')
  const [targetPath, setTargetPath] = useState('{{file}}')
  const [inputError, setInputError] = useState('')

  const octalMode = useMemo(() => permissionsToOctal(permissions), [permissions])
  const symbolicMode = useMemo(() => permissionsToSymbolic(permissions), [permissions])
  const chmodCommand = useMemo(() => permissionsToCommand(permissions, targetPath.trim() || '{{file}}'), [permissions, targetPath])

  const syncFromPermissions = (nextPermissions: ChmodPermissions) => {
    setPermissions(nextPermissions)
    setOctalInput(permissionsToOctal(nextPermissions))
    setSymbolicInput(permissionsToSymbolic(nextPermissions))
    setInputError('')
  }

  const handlePermissionToggle = (subject: ChmodSubject, bit: ChmodBit, enabled: boolean) => {
    syncFromPermissions(updatePermission(permissions, subject, bit, enabled))
  }

  const handleOctalInput = (value: string) => {
    setOctalInput(value)
    const parsed = parseOctalMode(value)
    if (!parsed) {
      setInputError(value.trim() ? '请输入 3 位八进制数字（0-7）' : '')
      return
    }

    setPermissions(parsed)
    setSymbolicInput(permissionsToSymbolic(parsed))
    setInputError('')
  }

  const handleSymbolicInput = (value: string) => {
    setSymbolicInput(value)
    const parsed = parseSymbolicMode(value)
    if (!parsed) {
      setInputError(value.trim() ? '请输入 9 位符号权限，例如 rwxr-xr-x' : '')
      return
    }

    setPermissions(parsed)
    setOctalInput(permissionsToOctal(parsed))
    setInputError('')
  }

  const applyPreset = (mode: string) => {
    const parsed = parseOctalMode(mode)
    if (!parsed) return
    syncFromPermissions(parsed)
  }

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">Linux 权限计算器</div>
          <div className="qb-tool-view__description">
            通过勾选 Owner / Group / Public 的 Read、Write、Execute，实时生成八进制权限与 chmod 命令。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{octalMode}</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">权限矩阵</span>
          <div className="qb-tool-options">
            <div className="qb-chmod-matrix">
              <div className="qb-chmod-matrix__header">
                <span />
                {bits.map((bit) => (
                  <span key={bit.key} className="qb-chmod-matrix__head-cell">
                    {bit.label}
                    <em>{bit.weight}</em>
                  </span>
                ))}
              </div>
              {subjects.map((subject) => (
                <div key={subject.key} className="qb-chmod-matrix__row">
                  <span className="qb-chmod-matrix__row-label">{subject.label}</span>
                  {bits.map((bit) => (
                    <label key={`${subject.key}-${bit.key}`} className="qb-tool-checkbox qb-chmod-matrix__cell">
                      <input
                        type="checkbox"
                        checked={permissions[subject.key][bit.key]}
                        onChange={(event) => handlePermissionToggle(subject.key, bit.key, event.target.checked)}
                      />
                      <span>{permissions[subject.key][bit.key] ? '1' : '0'}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <label className="qb-tool-field">
          <span className="qb-tool-label">八进制模式</span>
          <input
            id="chmod-octal-input"
            name="chmod-octal-input"
            className="qb-tool-input qb-mono"
            inputMode="numeric"
            value={octalInput}
            onChange={(event) => handleOctalInput(event.target.value)}
          />
        </label>

        <label className="qb-tool-field">
          <span className="qb-tool-label">符号模式</span>
          <input
            id="chmod-symbolic-input"
            name="chmod-symbolic-input"
            className="qb-tool-input qb-mono"
            value={symbolicInput}
            onChange={(event) => handleSymbolicInput(event.target.value)}
          />
        </label>

        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">目标路径</span>
          <input
            id="chmod-target-input"
            name="chmod-target-input"
            className="qb-tool-input qb-mono"
            placeholder="{{file}}"
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
          />
        </label>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">常用预设</span>
          <div className="qb-tool-options">
            {chmodPresets.map((preset) => (
              <button
                key={preset.mode}
                className={octalMode === preset.mode ? 'qb-tool-button qb-tool-button--primary' : 'qb-tool-button'}
                type="button"
                title={preset.description}
                onClick={() => applyPreset(preset.mode)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="qb-tool-field">
          <span className="qb-tool-label">当前结果</span>
          <div className="qb-tool-options">
            <Tag tone="primary">八进制 {octalMode}</Tag>
            <Tag tone="default">符号 {symbolicMode}</Tag>
            {inputError ? <Tag tone="danger">{inputError}</Tag> : null}
          </div>
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">chmod 命令</span>
          <CodeBlock code={chmodCommand} language="bash" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(chmodCommand)}>
          复制 chmod 命令
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(octalMode)}>
          复制八进制
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(symbolicMode)}>
          复制符号模式
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown={`- **Owner / Group / Public** 分别对应权限三元组的三个数字。\n- 勾选权限会实时更新八进制与符号模式，也可反向编辑输入框。\n- 位权：Read=4，Write=2，Execute=1，例如 rwx = 4+2+1 = 7。\n- 常见组合：目录 \`755\`、普通文件 \`644\`、私密文件 \`600\`。`}
        metadata={[
          { label: '双向同步', value: '勾选框 / 八进制 / 符号模式' },
          { label: '输出', value: 'chmod 命令' },
          { label: '示例', value: 'chmod 755 {{file}}' },
        ]}
      />
    </section>
  )
}
