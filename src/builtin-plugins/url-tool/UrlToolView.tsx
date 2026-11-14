import { useToolInput } from '../../core/tool/tool-context'
import { useMemo } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { lt, useLocale, useT } from '../../i18n'
import { CodeBlock, Detail } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'

function safeDecode(value: string, locale: 'zh-CN' | 'en-US') {
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return error instanceof Error ? error.message : lt('无法解码当前内容', 'Unable to decode input', locale)
  }
}

function parseUrl(value: string, locale: 'zh-CN' | 'en-US') {
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
    return lt(
      '// 输入不是完整 URL，仍可使用编码和解码结果',
      '// Not a full URL; encoded and decoded results are still available',
      locale,
    )
  }
}

export default function UrlToolView() {
  const tr = useT()
  const locale = useLocale()
  const [input, setInput] = useToolInput('https://quickbox.local/search?q=dev%20tools&sort=recent')
  const encoded = useMemo(() => encodeURIComponent(input), [input])
  const decoded = useMemo(() => safeDecode(input, locale), [input, locale])
  const canDecode = useMemo(() => { try { decodeURIComponent(input); return true } catch { return false } }, [input])
  const parsed = useMemo(() => parseUrl(input, locale), [input, locale])

  return (
    <ToolShell
      title={tr('URL 工具', 'URL Encoder & Parser')}
      description={tr(
        '快速处理 URL 编码、解码和 query 参数解析，适合调试接口地址和跳转链接。',
        'Encode, decode, and inspect query parameters in URLs.',
      )}
      badge="URL / URI"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea
            id="url-tool-input"
            name="url-tool-input"
            className="qb-tool-textarea qb-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('编码结果', 'Encoded')}</span>
          <CodeBlock code={encoded} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('解码结果', 'Decoded')}</span>
          <CodeBlock resultType={canDecode ? 'url' : undefined} code={decoded} language="txt" wrap copyable />
        </div>

        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('URL 解析', 'URL breakdown')}</span>
          <CodeBlock code={parsed} language="json" wrap copyable />
        </div>
      </div>

      <div className="qb-tool-actions">
        <button
          className="qb-tool-button qb-tool-button--primary"
          type="button"
          onClick={() => void writeClipboardText(encoded)}
        >
          {tr('复制编码结果', 'Copy encoded')}
        </button>
        <button className="qb-tool-button" type="button" onClick={() => void writeClipboardText(decoded)}>
          {tr('复制解码结果', 'Copy decoded')}
        </button>
      </div>

      <Detail
        title={tr('使用说明', 'Guide')}
        markdown={tr(
          '- 编码使用 `encodeURIComponent`，适合 query value 或路径片段。\n- 解码使用 `decodeURIComponent`，遇到非法转义会显示错误。\n- 输入完整 URL 时会解析协议、域名、路径和 query 参数。',
          '- Encodes using `encodeURIComponent`, suitable for query values or path segments.\n- Decodes using `decodeURIComponent` and reports malformed escape sequences.\n- Parses protocol, host, pathname, and query params when given a full URL.',
        )}
        metadata={[
          { label: tr('模式', 'Mode'), value: tr('编码 / 解码 / URL 解析', 'Encode / Decode / Parse') },
          { label: tr('输入', 'Input'), value: tr('URL 或任意文本', 'URL or arbitrary text') },
          { label: tr('剪贴板', 'Clipboard'), value: tr('支持复制', 'Copy supported') },
        ]}
      />
    </ToolShell>
  )
}
