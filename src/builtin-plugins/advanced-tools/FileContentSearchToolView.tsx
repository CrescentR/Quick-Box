import { useEffect, useRef, useState } from 'react'
import { cancelFileSearch, fileSearchProgress, searchFileContents, type FileSearchReport } from '../../api/file-tools-api'
import { CodeBlock } from '../../ui'
import { useToolOption } from '../../core/tool/use-tool-option'

export default function FileContentSearchToolView() {
  const [root, setRoot] = useState('')
  const [query, setQuery] = useState('TODO')
  const [patterns, setPatterns] = useState('*.ts\n*.rs\n*.java')
  const [excluded, setExcluded] = useToolOption<string>('fileSearch.excluded', 'node_modules\n.git\ntarget\ndist')
  const [maxResults, setMaxResults] = useState(100)
  const [report, setReport] = useState<FileSearchReport>()
  const [status, setStatus] = useState('输入目录与搜索内容。单文件最多读取 2 MB，跳过符号链接与非 UTF-8 文本。')
  const [busy, setBusy] = useState(false)
  const job = useRef<string>()
  useEffect(() => () => { if (job.current) void cancelFileSearch(job.current).catch(() => {}) }, [])
  const run = async () => {
    const id = crypto.randomUUID(); job.current = id
    setBusy(true); setReport(undefined); setStatus('正在搜索…')
    const timer = window.setInterval(() => {
      void fileSearchProgress(id).then((progress) => {
        if (job.current === id && progress) setStatus(`已检查 ${progress.scanned} 个文件，跳过 ${progress.skipped} 项…`)
      }).catch(() => {})
    }, 400)
    try {
      const split = (value: string) => value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean)
      const next = await searchFileContents(root, query, split(patterns), maxResults, id, split(excluded))
      if (job.current === id) { setReport(next); setStatus(`${next.cancelled ? '已取消' : '搜索完成'}：${next.results.length} 条结果，检查 ${next.scanned} 个文件，跳过 ${next.skipped} 项。${next.truncated ? '达到结果、文件或目录深度限制，请缩小范围。' : ''}`) }
    } catch (error) { if (job.current === id) setStatus(error && typeof error === 'object' && 'message' in error ? String(error.message) : '搜索失败') }
    finally { window.clearInterval(timer); if (job.current === id) { job.current = undefined; setBusy(false) } }
  }
  return <section className="qb-tool-view">
    <h2>文件内容搜索</h2>
    <div className="qb-tool-grid">
      <label className="qb-tool-field qb-tool-field--full">根目录<input className="qb-tool-input" disabled={busy} value={root} onChange={(e) => setRoot(e.target.value)} /></label>
      <label className="qb-tool-field">搜索文本<input className="qb-tool-input" disabled={busy} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="qb-tool-field">最多结果<input className="qb-tool-input" disabled={busy} type="number" min={1} max={1000} value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} /></label>
      <label className="qb-tool-field">文件通配符，每行一个<textarea className="qb-tool-textarea" disabled={busy} value={patterns} onChange={(e) => setPatterns(e.target.value)} /></label>
      <label className="qb-tool-field">排除目录名（自动保存）<textarea className="qb-tool-textarea" disabled={busy} value={excluded} onChange={(e) => setExcluded(e.target.value)} /></label>
    </div>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={busy || !root.trim() || !query.trim() || !Number.isInteger(maxResults)} onClick={() => void run()}>搜索</button>
      <button className="qb-tool-button" disabled={!busy} onClick={() => { if (job.current) void cancelFileSearch(job.current).catch(() => setStatus('取消请求失败，请重试')) }}>取消搜索</button>
    </div>
    <p role="status">{status}</p>
    {report && <CodeBlock code={JSON.stringify(report.results, null, 2)} language="json" copyable wrap />}
  </section>
}
