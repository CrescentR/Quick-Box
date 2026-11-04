import { ToolShell } from './ToolShell'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'

function cleanSvg(input: string) {
  try {
    const parser = new DOMParser()
    const document = parser.parseFromString(input, 'image/svg+xml')
    const parserError = document.querySelector('parsererror')
    if (parserError) return { output: parserError.textContent || 'SVG 无效', removed: 0 }

    let removed = 0
    document.querySelectorAll('script, metadata').forEach((node) => {
      node.remove()
      removed += 1
    })
    document.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase()
        const value = attribute.value.toLowerCase()
        if (name.startsWith('on') || value.includes('javascript:') || name === 'data-name') {
          node.removeAttribute(attribute.name)
          removed += 1
        }
      })
    })

    const serialized = new XMLSerializer()
      .serializeToString(document.documentElement)
      .replace(/>\s+</g, '><')
      .trim()

    return { output: serialized, removed }
  } catch (error) {
    return { output: error instanceof Error ? error.message : '无法清理 SVG', removed: 0 }
  }
}

export default function SvgCleanerToolView() {
  const [input, setInput] = useState(
    '<svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><metadata>demo</metadata><rect data-name="box" width="120" height="80" fill="#111827"/><circle cx="60" cy="40" r="24" fill="#22c55e" onclick="alert(1)"/></svg>',
  )
  const result = useMemo(() => cleanSvg(input), [input])

  return (
    <ToolShell
      title="SVG 清理器"
      level="L3"
      description="清理本地 SVG 标记，移除高风险脚本、事件处理器、元数据和冗余属性。"
      notes="- 该工具只在本地运行，并使用浏览器 XML 解析器。\n- 它会移除明显不安全或冗余的标记，但不是面向不可信网页发布的完整安全净化器。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">SVG 输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">清理结果</span>
          <CodeBlock code={result.output} language="svg" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">统计</span>
          <CodeBlock code={JSON.stringify({ 移除项: result.removed, 字节数: result.output.length }, null, 2)} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
