import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { CodeBlock, Detail, Tag } from '../../ui'

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return error instanceof Error ? error.message : '无法解码当前内容'
  }
}

function parseUrl(value: string) {
  try {
    const url = new URL(value)
    return JSON.stringify(
      {
        href: url.href,
        origin: url.origin,
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        params: Array.from(url.searchParams.entries()).map(([key, paramValue]) => ({
          key,
          value: paramValue,
        })),
      },
      null,
      2,
    )
  } catch {
    return '// 输入不是完整 URL，仍可使用编码和解码结果'
  }
}

export default function UrlToolView() {
  const [input, setInput] = useState('https://quickbox.local/search?q=dev%20tools&sort=recent')
  const encoded = useMemo(() => encodeURIComponent(input), [input])
  const decoded = useMemo(() => safeDecode(input), [input])
  const parsed = useMemo(() => parseUrl(input), [input])

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">URL 工具</div>
          <div className="qb-tool-view__description">
            快速处理 URL 编码、解码和 query 参数解析，适合调试接口地址和跳转链接。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">URL / URI</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea
            id="url-tool-input"
            name="url-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">编码结果</span>
          <CodeBlock code={encoded} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field">
          <span className="qb-tool-label">解码结果</span>
          <CodeBlock code={decoded} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">URL 解析</span>
          <CodeBlock code={parsed} language="json" wrap copyable />
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
        markdown="- 编码使用 `encodeURIComponent`，适合 query value 或路径片段。\n- 解码使用 `decodeURIComponent`，遇到非法转义会显示错误。\n- 输入完整 URL 时会解析协议、域名、路径和 query 参数。"
        metadata={[
          { label: '模式', value: '编码 / 解码 / URL 解析' },
          { label: '输入', value: 'URL 或任意文本' },
          { label: '剪贴板', value: '支持复制' },
        ]}
      />
    </section>
  )
}
