import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { lt, useLocale, useT } from '../../i18n'
import type { ResolvedLocale } from '../../i18n'
import { CodeBlock } from '../../ui'

function cleanSvg(input: string, locale: ResolvedLocale) {
  try {
    const parser = new DOMParser()
    const document = parser.parseFromString(input, 'image/svg+xml')
    const parserError = document.querySelector('parsererror')
    if (parserError) return { output: parserError.textContent || lt('SVG 无效', 'Invalid SVG', locale), removed: 0 }

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
    return { output: error instanceof Error ? error.message : lt('无法清理 SVG', 'Failed to clean SVG', locale), removed: 0 }
  }
}

export default function SvgCleanerToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useState(
    '<svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><metadata>demo</metadata><rect data-name="box" width="120" height="80" fill="#111827"/><circle cx="60" cy="40" r="24" fill="#22c55e" onclick="alert(1)"/></svg>',
  )
  const result = useMemo(() => cleanSvg(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('SVG 清理器', 'SVG Cleaner')}
      level="L3"
      description={tr('清理本地 SVG 标记，移除高风险脚本、事件处理器、元数据和冗余属性。', 'Clean SVG markup locally by stripping scripts, event handlers, metadata, and redundant attributes.')}
      notes={tr(
        '- 该工具只在本地运行，并使用浏览器 XML 解析器。\n- 它会移除明显不安全或冗余的标记，但不是面向不可信网页发布的完整安全净化器。',
        '- Runs locally using the browser XML parser.\n- Strips common unsafe or redundant tags/attributes, not a full HTML sanitizer for untrusted public hosting.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('SVG 输入', 'SVG Input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('清理结果', 'Cleaned Output')}</span>
          <CodeBlock code={result.output} language="svg" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('统计', 'Stats')}</span>
          <CodeBlock
            code={JSON.stringify(
              locale === 'en-US'
                ? { removed: result.removed, bytes: result.output.length }
                : { 移除项: result.removed, 字节数: result.output.length },
              null,
              2,
            )}
            language="json"
            wrap
            copyable
          />
        </div>
      </div>
    </ToolShell>
  )
}
