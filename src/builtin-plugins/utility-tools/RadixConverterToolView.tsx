import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'

function parseBigIntWithRadix(value: string, radix: number) {
  const normalized = value.trim().replace(/_/g, '')
  if (!normalized) return null
  const patterns: Record<number, RegExp> = {
    2: /^[+-]?[01]+$/,
    8: /^[+-]?[0-7]+$/,
    10: /^[+-]?\d+$/,
    16: /^[+-]?(?:0x)?[0-9a-fA-F]+$/,
  }
  if (!patterns[radix].test(normalized)) return null
  const sign = normalized.startsWith('-') ? -1n : 1n
  const unsigned = normalized.replace(/^[+-]/, '').replace(/^0x/i, '')
  let result = 0n
  for (const char of unsigned) {
    const digit = Number.parseInt(char, radix)
    result = result * BigInt(radix) + BigInt(digit)
  }
  return sign * result
}

function formatRadix(value: bigint | null) {
  if (value === null) {
    return {
      binary: '',
      octal: '',
      decimal: '',
      hexadecimal: '',
      report: '输入内容与所选进制不匹配',
    }
  }

  const sign = value < 0n ? '-' : ''
  const absValue = value < 0n ? -value : value
  return {
    binary: `${sign}${absValue.toString(2)}`,
    octal: `${sign}${absValue.toString(8)}`,
    decimal: value.toString(10),
    hexadecimal: `${sign}${absValue.toString(16).toUpperCase()}`,
    report: '转换成功',
  }
}

export default function RadixConverterToolView() {
  const [radix, setRadix] = useState(10)
  const [input, setInput] = useState('255')
  const output = useMemo(() => formatRadix(parseBigIntWithRadix(input, radix)), [input, radix])

  return (
    <ToolShell title="进制/基数转换器" level="L1" description="在二进制、八进制、十进制和十六进制之间转换整数。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入进制</span>
          <select className="qb-tool-input" value={radix} onChange={(event) => setRadix(Number(event.target.value))}>
            <option value={2}>二进制</option>
            <option value={8}>八进制</option>
            <option value={10}>十进制</option>
            <option value={16}>十六进制</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">数值</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">二进制</span>
          <CodeBlock code={output.binary || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">八进制</span>
          <CodeBlock code={output.octal || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">十进制</span>
          <CodeBlock code={output.decimal || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">十六进制</span>
          <CodeBlock code={output.hexadecimal || output.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
