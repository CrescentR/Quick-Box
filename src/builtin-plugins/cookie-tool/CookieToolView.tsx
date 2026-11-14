import { useMemo, useState } from 'react'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { buildCookieHeader, parseCookieInput } from './cookie-utils'
import { ToolShell } from '../../core/tool/ToolShell'

const sampleInput = `Set-Cookie: sessionId=qb_a1b2; Path=/; Domain=localhost; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
Set-Cookie: theme=dark; Path=/; SameSite=Lax`

export default function CookieToolView() {
  const tr = useT()
  const [input, setInput] = useState(sampleInput)
  const { copyText, clipboardToast } = useClipboardToast()

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: parseCookieInput(input) }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : tr('解析失败', 'Parse failed') }
    }
  }, [input, tr])

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
    <ToolShell
      title={tr('Cookie 解析器', 'Cookie Parser')}
      description={tr(
        '粘贴 Cookie 或 Set-Cookie 头，拆出名称、值、Path、HttpOnly、SameSite 等属性，并重建请求 Cookie。',
        'Parse Cookie or Set-Cookie headers into fields (Path, Domain, HttpOnly, SameSite) and rebuild Cookie headers.',
      )}
      badge={parsed.ok ? parsed.value.kind : tr('错误', 'Error')}
    >

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
          <span className="qb-tool-label">{tr('解析结果', 'Parsed Output')}</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('重建 Cookie 请求头', 'Rebuilt Cookie Header')}</span>
          <CodeBlock code={rebuilt || tr('// 没有可重建的键值', '// No cookie pairs to rebuild')} language="txt" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void copyText(output, 'Parsed cookie JSON')}>
          {tr('复制 JSON', 'Copy JSON')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void copyText(rebuilt, 'Cookie header')} disabled={!rebuilt}>
          {tr('复制 Cookie 头', 'Copy Cookie Header')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Usage')}
        markdown={tr(
          '- 支持 `Cookie: a=1; b=2` 以及带属性的 `Set-Cookie`。\n- 多行 Set-Cookie 会逐条解析。\n- `Expires` 中的日期逗号不会被当成分隔符。\n- 重建结果只包含 name=value，适合贴回请求头。',
          '- Supports `Cookie: a=1; b=2` as well as `Set-Cookie` headers with attributes.\n- Multi-line `Set-Cookie` headers are parsed line by line.\n- Commas inside `Expires` dates are preserved properly.\n- Rebuilt header contains `name=value` pairs ready to paste into requests.',
        )}
        metadata={[
          { label: tr('输入', 'Input'), value: 'Cookie / Set-Cookie' },
          { label: tr('属性', 'Attributes'), value: 'Domain · Path · SameSite · HttpOnly' },
          { label: tr('输出', 'Output'), value: tr('JSON + Cookie 头', 'JSON + Cookie header') },
        ]}
      />
      {clipboardToast}
    </ToolShell>
  )
}
