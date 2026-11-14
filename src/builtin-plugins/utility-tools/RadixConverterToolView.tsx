import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
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

function formatRadix(value: bigint | null, locale: ResolvedLocale) {
  if (value === null) {
    return {
      binary: '',
      octal: '',
      decimal: '',
      hexadecimal: '',
      report: lt('输入内容与所选进制不匹配', 'Input does not match the selected base', locale),
    }
  }

  const sign = value < 0n ? '-' : ''
  const absValue = value < 0n ? -value : value
  return {
    binary: `${sign}${absValue.toString(2)}`,
    octal: `${sign}${absValue.toString(8)}`,
    decimal: value.toString(10),
    hexadecimal: `${sign}${absValue.toString(16).toUpperCase()}`,
    report: lt('转换成功', 'Converted', locale),
  }
}

export default function RadixConverterToolView() {
  const tr = useT()
  const locale = useLocale()
  const [radix, setRadix] = useState(10)
  const [input, setInput] = useState('255')
  const output = useMemo(() => formatRadix(parseBigIntWithRadix(input, radix), locale), [input, locale, radix])

  return (
    <ToolShell
      title={tr('进制/基数转换器', 'Radix / Base Converter')}
      level="L1"
      description={tr('在二进制、八进制、十进制和十六进制之间转换整数。', 'Convert integers between binary, octal, decimal, and hexadecimal.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('输入进制', 'Input Base')}</span>
          <select className="qb-tool-input" value={radix} onChange={(event) => setRadix(Number(event.target.value))}>
            <option value={2}>{tr('二进制', 'Binary')}</option>
            <option value={8}>{tr('八进制', 'Octal')}</option>
            <option value={10}>{tr('十进制', 'Decimal')}</option>
            <option value={16}>{tr('十六进制', 'Hexadecimal')}</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('数值', 'Value')}</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('二进制', 'Binary')}</span>
          <CodeBlock code={output.binary || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('八进制', 'Octal')}</span>
          <CodeBlock code={output.octal || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('十进制', 'Decimal')}</span>
          <CodeBlock code={output.decimal || output.report} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('十六进制', 'Hexadecimal')}</span>
          <CodeBlock code={output.hexadecimal || output.report} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
