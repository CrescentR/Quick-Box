import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { curlToFetch, fetchToCurl } from './curl-fetch'
import type { CurlFetchMode } from './curl-fetch'

export default function CurlFetchToolView() {
  const [mode, setMode] = useState<CurlFetchMode>('curl-to-fetch')
  const [input, setInput] = useState("curl 'https://api.quickbox.local/tools' -X POST -H 'Content-Type: application/json' --data-raw '{\"limit\":10}'")
  const output = useMemo(() => (mode === 'curl-to-fetch' ? curlToFetch(input) : fetchToCurl(input)), [input, mode])

  return (
    <ToolShell
      title="cURL 与 fetch 互转"
      level="L3"
      description="把常见 cURL 命令转成 fetch 片段，也可以从 fetch 片段反向生成 cURL。"
      notes="- 适合常见调试命令：URL、method、headers 和 body。\n- 复杂 shell 展开、文件上传、多段表单等场景会在后续版本继续增强。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">转换方向</span>
          <select className="qb-tool-input" value={mode} onChange={(event) => setMode(event.target.value as CurlFetchMode)}>
            <option value="curl-to-fetch">{'cURL -> fetch'}</option>
            <option value="fetch-to-curl">{'fetch -> cURL'}</option>
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">输入</span>
          <textarea className="qb-tool-textarea qb-mono" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">转换结果</span>
          <CodeBlock code={output} language={mode === 'curl-to-fetch' ? 'ts' : 'bash'} showLineNumbers copyable />
        </div>
      </div>
    </ToolShell>
  )
}
