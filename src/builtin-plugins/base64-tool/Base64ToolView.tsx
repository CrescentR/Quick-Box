import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Tag } from '../../ui'

function encodeBase64(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
}

function decodeBase64(value: string) {
  return decodeURIComponent(escape(atob(value)))
}

export default function Base64ToolView() {
  const [input, setInput] = useState('QuickBox')

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
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">Base64 编解码</div>
          <div className="qb-tool-view__description">
            快速编码或解码 Base64 文本，在同一个面板中同时查看输入、编码结果和解码结果。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">编码 / 解码</Tag>
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
          <span className="qb-tool-label">编码结果</span>
          <CodeBlock code={encoded || '// 无法编码'} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">解码结果</span>
          <CodeBlock code={decoded || '// 当前输入无法解码'} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(encoded)}
        >
          复制编码结果
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(decoded)}>
          复制解码结果
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 适合处理 UTF-8 文本内容。\n- 当前输入不是合法 Base64 时，解码区域会显示提示。\n- 适合在启动器内快速检查接口载荷或短文本。"
        metadata={[
          { label: '模式', value: 'Base64 编码 / 解码' },
          { label: '输入', value: 'UTF-8 文本' },
          { label: '剪贴板', value: '支持复制' },
        ]}
      />
    </section>
  )
}
