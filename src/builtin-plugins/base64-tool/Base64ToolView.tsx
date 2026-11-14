import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function encodeBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value))
}

function decodeBase64(value: string) {
  return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(value))
}

export default function Base64ToolView() {
  const tr = useT()
  const [input, setInput] = useState('QuickBox')
  const { copyText, clipboardToast } = useClipboardToast()

  const encoded = useMemo(() => {
    try {
      return encodeBase64(input)
    } catch {
      return ''
    }
  }, [input])

  const decoded = useMemo(() => {
    try {
      return decodeBase64(input)
    } catch {
      return ''
    }
  }, [input])

  return (
    <ToolShell
      title={tr('Base64 编解码', 'Base64 Codec')}
      description={tr(
        '快速编码或解码 Base64 文本，在同一个面板中同时查看输入、编码结果和解码结果。',
        'Encode or decode Base64 text with live input, encoded, and decoded panels.',
      )}
      badge={tr('编码 / 解码', 'Encode / Decode')}
    >

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea
            id="base64-tool-input"
            name="base64-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('编码结果', 'Encoded')}</span>
          <CodeBlock code={encoded || tr('// 无法编码', '// Unable to encode')} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('解码结果', 'Decoded')}</span>
          <CodeBlock code={decoded || tr('// 当前输入无法解码', '// Input is not valid Base64 UTF-8')} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void copyText(encoded, 'Encoded Base64 result')}
        >
          {tr('复制编码结果', 'Copy Encoded')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(decoded, 'Decoded Base64 result')}>
          {tr('复制解码结果', 'Copy Decoded')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          '- 适合处理 UTF-8 文本内容。\n- 当前输入不是合法 Base64 时，解码区域会显示提示。\n- 适合在启动器内快速检查接口载荷或短文本。',
          '- Encodes and decodes UTF-8 text cleanly.\n- Shows a notice in the decoded panel when the input is not valid Base64.\n- Handy for inspecting API payloads or short tokens right inside the launcher.',
        )}
        metadata={[
          { label: tr('模式', 'Mode'), value: tr('Base64 编码 / 解码', 'Base64 Encode / Decode') },
          { label: tr('输入', 'Input'), value: tr('UTF-8 文本', 'UTF-8 Text') },
          { label: tr('剪贴板', 'Clipboard'), value: tr('支持复制', 'Copy ready') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
