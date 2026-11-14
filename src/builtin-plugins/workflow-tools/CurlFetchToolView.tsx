import { useMemo, useState } from 'react'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { curlToFetch, fetchToCurl } from './curl-fetch'
import type { CurlFetchMode } from './curl-fetch'

export default function CurlFetchToolView() {
  const tr = useT()
  const locale = useLocale()
  const [mode, setMode] = useState<CurlFetchMode>('curl-to-fetch')
  const [input, setInput] = useState("curl 'https://api.quickbox.local/tools' -X POST -H 'Content-Type: application/json' --data-raw '{\"limit\":10}'")
  const output = useMemo(() => (mode === 'curl-to-fetch' ? curlToFetch(input, locale) : fetchToCurl(input, locale)), [input, locale, mode])

  return (
    <ToolShell
      title={tr('cURL 与 fetch 互转', 'cURL <-> fetch')}
      level="L3"
      description={tr(
        '把常见 cURL 命令转成 fetch 片段，也可以从 fetch 片段反向生成 cURL。',
        'Convert cURL commands into JavaScript fetch snippets and back.',
      )}
      notes={tr(
        '- 适合常见调试命令：URL、method、headers 和 body。\n- 复杂 shell 展开、文件上传、多段表单等场景会在后续版本继续增强。',
        '- Covers common debugging flags: URL, method, headers, and body.\n- Complex shell expansions and multipart form uploads are not expanded.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('转换方向', 'Direction')}</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as CurlFetchMode)}>
            <option value="curl-to-fetch">{'cURL -> fetch'}</option>
            <option value="fetch-to-curl">{'fetch -> cURL'}</option>
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('输入', 'Input')}</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('转换结果', 'Converted output')}</span>
          <CodeBlock code={output} language={mode === 'curl-to-fetch' ? 'ts' : 'bash'} showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
