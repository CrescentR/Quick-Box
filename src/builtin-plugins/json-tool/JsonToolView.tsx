import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Tag } from '../../ui'

export default function JsonToolView() {
  const [input, setInput] = useState('{\n  "name": "QuickBox",\n  "mode": "design-system"\n}')

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input), null, 2)
    } catch (error) {
      return error instanceof Error ? error.message : 'JSON 无效'
    }
  }, [input])

  const minified = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input))
    } catch {
      return ''
    }
  }, [input])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">JSON 工具</div>
          <div className="qb-tool-view__description">
            在统一的 QuickBox 工具面板中格式化、校验和压缩 JSON，输入与结果保持清晰分区。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">格式化</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入</span>
          <textarea
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">格式化结果</span>
          <CodeBlock code={formatted} language="json" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">压缩结果</span>
          <CodeBlock code={minified || '// JSON 无效'} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(formatted)}
        >
          复制格式化结果
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(minified)}>
          复制压缩结果
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 支持任意合法 JSON 对象或数组。\n- 输入无效时，会在格式化区域直接显示错误信息。\n- 结果区保持等宽字体，方便开发调试和复制。"
        metadata={[
          { label: '模式', value: '格式化 / 校验 / 压缩' },
          { label: '输出', value: 'JSON 文本' },
          { label: '操作', value: '支持复制到剪贴板' },
        ]}
      />
    </section>
  )
}
