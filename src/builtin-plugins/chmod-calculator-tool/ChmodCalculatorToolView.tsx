import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { useT } from '../../i18n'
import { CodeBlock, Detail, Tag } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
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

const bits: Array<{ key: ChmodBit; label: string; weight: number }> = [
  { key: 'read', label: 'Read (r)', weight: 4 },
  { key: 'write', label: 'Write (w)', weight: 2 },
  { key: 'execute', label: 'Execute (x)', weight: 1 },
]

export default function ChmodCalculatorToolView() {
  const tr = useT()
  const [permissions, setPermissions] = useState<ChmodPermissions>(createDefaultPermissions)
  const [octalInput, setOctalInput] = useState('755')
  const [symbolicInput, setSymbolicInput] = useState('rwxr-xr-x')
  const [targetPath, setTargetPath] = useState('{{file}}')
  const [inputError, setInputError] = useState('')

  const subjects: Array<{ key: ChmodSubject; label: string }> = [
    { key: 'owner', label: tr('Owner（所有者）', 'Owner') },
    { key: 'group', label: tr('Group（用户组）', 'Group') },
    { key: 'other', label: tr('Public（其他用户）', 'Public (Others)') },
  ]

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
      setInputError(value.trim() ? tr('请输入 3 位八进制数字（0-7）', 'Enter 3 octal digits (0-7)') : '')
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
      setInputError(value.trim() ? tr('请输入 9 位符号权限，例如 rwxr-xr-x', 'Enter a 9-char symbolic mode like rwxr-xr-x') : '')
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
    <ToolShell
      title={tr('Linux 权限计算器', 'Linux Chmod Calculator')}
      description={tr(
        '通过勾选 Owner / Group / Public 的 Read、Write、Execute，实时生成八进制权限与 chmod 命令。',
        'Toggle Read, Write, and Execute flags to compute octal modes and chmod commands in real time.',
      )}
      badge={octalMode}
    >

      <div className="qb-tool-grid">
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('权限矩阵', 'Permission Matrix')}</span>
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
          <span className="qb-tool-label">{tr('八进制模式', 'Octal Mode')}</span>
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
          <span className="qb-tool-label">{tr('符号模式', 'Symbolic Mode')}</span>
          <input
            id="chmod-symbolic-input"
            name="chmod-symbolic-input"
            className="qb-tool-input qb-mono"
            value={symbolicInput}
            onChange={(event) => handleSymbolicInput(event.target.value)}
          />
        </label>

        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('目标路径', 'Target Path')}</span>
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
          <span className="qb-tool-label">{tr('常用预设', 'Presets')}</span>
          <div className="qb-tool-options">
            {chmodPresets.map((preset) => (
              <button
                key={preset.mode}
                className={octalMode === preset.mode ? 'qb-tool-button qb-tool-button--primary' : 'qb-tool-button'}
                type="button"
                title={tr(preset.description, preset.enDescription)}
                onClick={() => applyPreset(preset.mode)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('当前结果', 'Current Mode')}</span>
          <div className="qb-tool-options">
            <Tag tone="primary">{tr('八进制', 'Octal')} {octalMode}</Tag>
            <Tag tone="default">{tr('符号', 'Symbolic')} {symbolicMode}</Tag>
            {inputError ? <Tag tone="danger">{inputError}</Tag> : null}
          </div>
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('chmod 命令', 'chmod Command')}</span>
          <CodeBlock code={chmodCommand} language="bash" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(chmodCommand)}>
          {tr('复制 chmod 命令', 'Copy chmod Command')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(octalMode)}>
          {tr('复制八进制', 'Copy Octal')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(symbolicMode)}>
          {tr('复制符号模式', 'Copy Symbolic')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          `- **Owner / Group / Public** 分别对应权限三元组的三个数字。\n- 勾选权限会实时更新八进制与符号模式，也可反向编辑输入框。\n- 位权：Read=4，Write=2，Execute=1，例如 rwx = 4+2+1 = 7。\n- 常见组合：目录 \`755\`、普通文件 \`644\`、私密文件 \`600\`。`,
          `- **Owner / Group / Public** correspond to the three digits of an octal mode.\n- Checkboxes, octal input, and symbolic input stay synchronized.\n- Bit weights: Read=4, Write=2, Execute=1 (e.g. rwx = 7).\n- Common modes: directories \`755\`, regular files \`644\`, private keys \`600\`.`,
        )}
        metadata={[
          { label: tr('双向同步', 'Two-way Sync'), value: tr('勾选框 / 八进制 / 符号模式', 'Checkboxes / Octal / Symbolic') },
          { label: tr('输出', 'Output'), value: tr('chmod 命令', 'chmod command') },
          { label: tr('示例', 'Example'), value: 'chmod 755 {{file}}' },
        ]}
      />
    </ToolShell>
  )
}
