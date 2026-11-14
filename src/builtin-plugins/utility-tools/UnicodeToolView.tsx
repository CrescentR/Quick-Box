import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'

function decodeUnicodeEscapes(value: string) {
  return value.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, codePoint, codeUnit) => {
    const hex = codePoint || codeUnit
    return String.fromCodePoint(Number.parseInt(hex, 16))
  })
}

function encodeUnicodeEscapes(value: string) {
  return Array.from(value)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0
      return code <= 0x7f ? char : code <= 0xffff ? `\\u${code.toString(16).padStart(4, '0')}` : `\\u{${code.toString(16)}}`
    })
    .join('')
}

export default function UnicodeToolView() {
  const tr = useT()
  const [input, setInput] = useState('QuickBox -> \\u5de5\\u5177\\u7bb1')
  const encoded = useMemo(() => encodeUnicodeEscapes(input), [input])
  const decoded = useMemo(() => decodeUnicodeEscapes(input), [input])

  return (
    <ToolShell
      title={tr('Unicode 编码转换', 'Unicode Escape Encoder / Decoder')}
      level="L1"
      description={tr('将文本转换为 Unicode 转义，也可以把转义字符串还原成可读文本。', 'Encode text into Unicode escape sequences or decode escaped strings back into readable characters.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('编码结果', 'Encoded')}</span>
          <CodeBlock code={encoded} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('解码结果', 'Decoded')}</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
