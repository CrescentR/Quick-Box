import { ToolShell } from './ToolShell'
import { useToolContext } from '../../core/tool/tool-context'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'

function buildQuery(baseUrl: string, rawParams: string) {
  const search = new URLSearchParams()
  rawParams
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separator = line.includes('=') ? '=' : ':'
      const [key, ...valueParts] = line.split(separator)
      if (key.trim()) search.append(key.trim(), valueParts.join(separator).trim())
    })

  const query = search.toString()
  if (!baseUrl.trim()) return query ? `?${query}` : ''
  const [address, ...hash] = baseUrl.split('#')
  return `${address}${query ? `${address.includes('?') ? '&' : '?'}${query}` : ''}${hash.length ? `#${hash.join('#')}` : ''}`
}

export default function QueryBuilderToolView() {
  const { input: incoming } = useToolContext()
  const initialUrl = (() => { try { return incoming ? new URL(incoming.text) : null } catch { return null } })()
  const [baseUrl, setBaseUrl] = useState(initialUrl ? `${initialUrl.origin}${initialUrl.pathname}${initialUrl.hash}` : 'https://api.quickbox.local/search')
  const [params, setParams] = useState(initialUrl ? Array.from(initialUrl.searchParams).map(([key, value]) => `${key}=${value}`).join('\n') : 'q=桌面工具\nsort=recent\npage=1')
  const output = useMemo(() => buildQuery(baseUrl, params), [baseUrl, params])

  return (
    <ToolShell title="Query 参数构建器" level="L1" description="把简单的键值行转换为已编码的 URL query 字符串。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">基础 URL</span>
          <input className="qb-tool-input qb-mono" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">参数</span>
          <textarea className="qb-tool-textarea qb-mono" value={params} onChange={(event) => setParams(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">URL</span>
          <CodeBlock code={output} language="txt" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
