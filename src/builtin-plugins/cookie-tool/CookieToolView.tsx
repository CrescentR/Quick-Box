import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { CodeBlock, Detail, Tag } from '../../ui'
import { buildCookieHeader, parseCookieInput } from './cookie-utils'

const sampleInput = `Set-Cookie: sessionId=qb_a1b2; Path=/; Domain=localhost; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
Set-Cookie: theme=dark; Path=/; SameSite=Lax`

export default function CookieToolView() {
  const [input, setInput] = useState(sampleInput)
  const { copyText, clipboardToast } = useClipboardToast()

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: parseCookieInput(input) }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : '解析失败' }
    }
  }, [input])

  const output = parsed.ok
    ? JSON.stringify(
        {
          kind: parsed.value.kind,
          cookies: parsed.value.cookies,
          setCookies: parsed.value.setCookies,
          rebuiltCookieHeader: buildCookieHeader(
            parsed.value.kind === 'cookie'
              ? parsed.value.cookies
              : parsed.value.setCookies.map((item) => ({ name: item.name, value: item.value })),
          ),
        },
        null,
        2,
      )
    : parsed.message

  const rebuilt = parsed.ok
    ? buildCookieHeader(
        parsed.value.kind === 'cookie'
          ? parsed.value.cookies
          : parsed.value.setCookies.map((item) => ({ name: item.name, value: item.value })),
      )
    : ''

  return (
    <section className="qb-tool-view">
      <header className="qb-tool-view__header">
        <div className="qb-tool-view__header-copy">
          <div className="qb-tool-view__eyebrow">官方工具</div>
          <div className="qb-tool-view__title">Cookie 解析器</div>
          <div className="qb-tool-view__description">
            粘贴 Cookie 或 Set-Cookie 头，拆出名称、值、Path、HttpOnly、SameSite 等属性，并重建请求 Cookie。
          </div>
        </div>
        <div className="qb-tool-view__header-meta">
          <Tag tone="primary">内置</Tag>
          <Tag tone="default">{parsed.ok ? parsed.value.kind : '错误'}</Tag>
        </div>
      </header>

      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">Cookie / Set-Cookie</span>
          <textarea
            id="cookie-tool-input"
            name="cookie-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <div className="qb-tool-field">
          <span className="qb-tool-label">解析结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">重建 Cookie 请求头</span>
          <CodeBlock code={rebuilt || '// 没有可重建的键值'} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void copyText(output, 'Parsed cookie JSON')}>
          复制 JSON
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(rebuilt, 'Cookie header')} disabled={!rebuilt}>
          复制 Cookie 头
        </button>
      </div>

      <Detail
        title="使用说明"
        markdown="- 支持 `Cookie: a=1; b=2` 以及带属性的 `Set-Cookie`。\n- 多行 Set-Cookie 会逐条解析。\n- `Expires` 中的日期逗号不会被当成分隔符。\n- 重建结果只包含 name=value，适合贴回请求头。"
        metadata={[
          { label: '输入', value: 'Cookie / Set-Cookie' },
          { label: '属性', value: 'Domain · Path · SameSite · HttpOnly' },
          { label: '输出', value: 'JSON + Cookie 头' },
        ]}
      />
      {clipboardToast}
    </section>
  )
}
