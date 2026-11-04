import { ToolShell } from './ToolShell'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'

function words(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
}

function titleCase(value: string) {
  return words(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function TextCaseToolView() {
  const [input, setInput] = useState('quick_box text-case helper')
  const variants = useMemo(() => {
    const parts = words(input)
    const pascal = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('')
    const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1)
    return {
      小写: input.toLowerCase(),
      大写: input.toUpperCase(),
      标题格式: titleCase(input),
      小驼峰: camel,
      大驼峰: pascal,
      下划线: parts.map((part) => part.toLowerCase()).join('_'),
      短横线: parts.map((part) => part.toLowerCase()).join('-'),
    }
  }, [input])

  return (
    <ToolShell title="文本大小写转换" level="L1" description="为代码命名、文件名和粘贴文本快速生成常见大小写格式。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <input className="qb-tool-input qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        {Object.entries(variants).map(([label, value]) => (
          <div className="qb-tool-field" key={label}>
            <span className="qb-tool-label">{label}</span>
            <CodeBlock code={value} language="txt" wrap copyable />
          </div>
        ))}
      </div>
    </ToolShell>
  )
}
