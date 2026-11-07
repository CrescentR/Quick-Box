import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { CodeBlock, Tag } from '../../ui'

const httpStatusRows = [
  { code: 100, phrase: 'Continue', category: '1xx', description: '客户端可以继续发送请求。' },
  { code: 101, phrase: 'Switching Protocols', category: '1xx', description: '服务器同意切换协议。' },
  { code: 200, phrase: 'OK', category: '2xx', description: '请求成功。' },
  { code: 201, phrase: 'Created', category: '2xx', description: '请求成功并创建了资源。' },
  { code: 202, phrase: 'Accepted', category: '2xx', description: '请求已接受，但处理尚未完成。' },
  { code: 204, phrase: 'No Content', category: '2xx', description: '请求成功，响应体为空。' },
  { code: 301, phrase: 'Moved Permanently', category: '3xx', description: '资源已永久移动到新地址。' },
  { code: 302, phrase: 'Found', category: '3xx', description: '资源临时位于其他地址。' },
  { code: 304, phrase: 'Not Modified', category: '3xx', description: '缓存资源仍可使用。' },
  { code: 307, phrase: 'Temporary Redirect', category: '3xx', description: '临时重定向，方法和请求体保持不变。' },
  { code: 308, phrase: 'Permanent Redirect', category: '3xx', description: '永久重定向，方法和请求体保持不变。' },
  { code: 400, phrase: 'Bad Request', category: '4xx', description: '请求语法或参数无效。' },
  { code: 401, phrase: 'Unauthorized', category: '4xx', description: '缺少有效认证信息。' },
  { code: 403, phrase: 'Forbidden', category: '4xx', description: '服务器拒绝执行请求。' },
  { code: 404, phrase: 'Not Found', category: '4xx', description: '目标资源不存在。' },
  { code: 405, phrase: 'Method Not Allowed', category: '4xx', description: '资源不支持当前 HTTP 方法。' },
  { code: 409, phrase: 'Conflict', category: '4xx', description: '请求与资源当前状态冲突。' },
  { code: 410, phrase: 'Gone', category: '4xx', description: '资源曾经存在，但现在已不可用。' },
  { code: 415, phrase: 'Unsupported Media Type', category: '4xx', description: '请求体媒体类型不被支持。' },
  { code: 422, phrase: 'Unprocessable Entity', category: '4xx', description: '语法正确，但语义校验失败。' },
  { code: 429, phrase: 'Too Many Requests', category: '4xx', description: '请求频率超过限制。' },
  { code: 500, phrase: 'Internal Server Error', category: '5xx', description: '服务器内部错误。' },
  { code: 501, phrase: 'Not Implemented', category: '5xx', description: '服务器不支持请求所需功能。' },
  { code: 502, phrase: 'Bad Gateway', category: '5xx', description: '网关从上游收到无效响应。' },
  { code: 503, phrase: 'Service Unavailable', category: '5xx', description: '服务暂时不可用。' },
  { code: 504, phrase: 'Gateway Timeout', category: '5xx', description: '网关等待上游响应超时。' },
] as const

export default function HttpStatusToolView() {
  const [query, setQuery] = useState('422')
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return httpStatusRows
    return httpStatusRows.filter((row) =>
      [String(row.code), row.phrase, row.category, row.description].some((value) => value.toLowerCase().includes(keyword)),
    )
  }, [query])
  const output = useMemo(() => JSON.stringify(filtered, null, 2), [filtered])

  return (
    <ToolShell title="HTTP 状态码速查表" level="L1" description="按状态码、英文短语或说明快速查询常见 HTTP 响应含义。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">搜索</span>
          <input className="qb-tool-input qb-mono" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">匹配结果</span>
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
