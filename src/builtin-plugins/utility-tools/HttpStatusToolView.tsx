import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock, Tag } from '../../ui'

const httpStatusRows = [
  { code: 100, phrase: 'Continue', category: '1xx', zh: '客户端可以继续发送请求。', en: 'The client should continue with its request.' },
  { code: 101, phrase: 'Switching Protocols', category: '1xx', zh: '服务器同意切换协议。', en: 'The server agrees to switch protocols.' },
  { code: 200, phrase: 'OK', category: '2xx', zh: '请求成功。', en: 'The request succeeded.' },
  { code: 201, phrase: 'Created', category: '2xx', zh: '请求成功并创建了资源。', en: 'The request succeeded and created a resource.' },
  { code: 202, phrase: 'Accepted', category: '2xx', zh: '请求已接受，但处理尚未完成。', en: 'The request has been accepted for processing, not yet completed.' },
  { code: 204, phrase: 'No Content', category: '2xx', zh: '请求成功，响应体为空。', en: 'The request succeeded with an empty response body.' },
  { code: 301, phrase: 'Moved Permanently', category: '3xx', zh: '资源已永久移动到新地址。', en: 'The resource has permanently moved to a new URI.' },
  { code: 302, phrase: 'Found', category: '3xx', zh: '资源临时位于其他地址。', en: 'The resource is temporarily located at another URI.' },
  { code: 304, phrase: 'Not Modified', category: '3xx', zh: '缓存资源仍可使用。', en: 'The cached resource has not been modified.' },
  { code: 307, phrase: 'Temporary Redirect', category: '3xx', zh: '临时重定向，方法和请求体保持不变。', en: 'Temporary redirect preserving HTTP method and body.' },
  { code: 308, phrase: 'Permanent Redirect', category: '3xx', zh: '永久重定向，方法和请求体保持不变。', en: 'Permanent redirect preserving HTTP method and body.' },
  { code: 400, phrase: 'Bad Request', category: '4xx', zh: '请求语法或参数无效。', en: 'Invalid request syntax or parameters.' },
  { code: 401, phrase: 'Unauthorized', category: '4xx', zh: '缺少有效认证信息。', en: 'Missing or invalid authentication credentials.' },
  { code: 403, phrase: 'Forbidden', category: '4xx', zh: '服务器拒绝执行请求。', en: 'The server refuses to authorize the request.' },
  { code: 404, phrase: 'Not Found', category: '4xx', zh: '目标资源不存在。', en: 'The requested resource could not be found.' },
  { code: 405, phrase: 'Method Not Allowed', category: '4xx', zh: '资源不支持当前 HTTP 方法。', en: 'The HTTP method is not supported for this resource.' },
  { code: 409, phrase: 'Conflict', category: '4xx', zh: '请求与资源当前状态冲突。', en: 'The request conflicts with the current state of the resource.' },
  { code: 410, phrase: 'Gone', category: '4xx', zh: '资源曾经存在，但现在已不可用。', en: 'The resource is no longer available and will not return.' },
  { code: 415, phrase: 'Unsupported Media Type', category: '4xx', zh: '请求体媒体类型不被支持。', en: 'The request payload media type is not supported.' },
  { code: 422, phrase: 'Unprocessable Entity', category: '4xx', zh: '语法正确，但语义校验失败。', en: 'Syntax is valid, but semantic validation failed.' },
  { code: 429, phrase: 'Too Many Requests', category: '4xx', zh: '请求频率超过限制。', en: 'The client has sent too many requests in a given timeframe.' },
  { code: 500, phrase: 'Internal Server Error', category: '5xx', zh: '服务器内部错误。', en: 'An unexpected internal server error occurred.' },
  { code: 501, phrase: 'Not Implemented', category: '5xx', zh: '服务器不支持请求所需功能。', en: 'The server does not support the functionality required.' },
  { code: 502, phrase: 'Bad Gateway', category: '5xx', zh: '网关从上游收到无效响应。', en: 'The gateway received an invalid response from an upstream server.' },
  { code: 503, phrase: 'Service Unavailable', category: '5xx', zh: '服务暂时不可用。', en: 'The server is temporarily unavailable.' },
  { code: 504, phrase: 'Gateway Timeout', category: '5xx', zh: '网关等待上游响应超时。', en: 'The gateway timed out waiting for an upstream response.' },
] as const

export default function HttpStatusToolView() {
  const tr = useT()
  const locale = useLocale()
  const [query, setQuery] = useState('422')
  const rows = useMemo(
    () =>
      httpStatusRows.map((row) => ({
        code: row.code,
        phrase: row.phrase,
        category: row.category,
        description: locale === 'en-US' ? row.en : row.zh,
      })),
    [locale],
  )
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return rows
    return rows.filter((row, index) => {
      const raw = httpStatusRows[index]
      return [String(row.code), row.phrase, row.category, raw.zh, raw.en].some((value) => value.toLowerCase().includes(keyword))
    })
  }, [query, rows])
  const output = useMemo(() => JSON.stringify(filtered, null, 2), [filtered])

  return (
    <ToolShell
      title={tr('HTTP 状态码速查表', 'HTTP Status Codes')}
      level="L1"
      description={tr('按状态码、英文短语或说明快速查询常见 HTTP 响应含义。', 'Look up common HTTP status codes by code number, phrase, or description.')}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('搜索', 'Search')}</span>
          <input className="qb-tool-input qb-mono" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('匹配结果', 'Matches')}</span>
          <div className="qb-tool-template-list">
            {filtered.map((row) => (
              <section className="qb-tool-template" key={row.code}>
                <div className="qb-tool-template__head">
                  <div>
                    <div className="qb-tool-template__title">
                      {row.code} {row.phrase}
                    </div>
                    <div className="qb-tool-template__meta">{row.description}</div>
                  </div>
                  <Tag tone="default">{row.category}</Tag>
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">JSON</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
