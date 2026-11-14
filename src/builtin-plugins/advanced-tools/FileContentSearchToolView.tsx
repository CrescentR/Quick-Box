import { useEffect, useRef, useState } from 'react'
import { cancelFileSearch, fileSearchProgress, searchFileContents, type FileSearchReport } from '../../api/file-tools-api'
import { useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { useToolOption } from '../../core/tool/use-tool-option'

export default function FileContentSearchToolView() {
  const tr = useT()
  const [root, setRoot] = useState('')
  const [query, setQuery] = useState('')
  const [patterns, setPatterns] = useState('*.ts\n*.rs\n*.java')
  const [excluded, setExcluded] = useToolOption<string>('fileSearch.excluded', 'node_modules\n.git\ntarget\ndist')
  const [maxResults, setMaxResults] = useState(100)
  const [report, setReport] = useState<FileSearchReport>()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const job = useRef<string>()

  useEffect(() => () => {
    if (job.current) void cancelFileSearch(job.current).catch(() => {})
  }, [])

  const run = async () => {
    const id = crypto.randomUUID()
    job.current = id
    setBusy(true)
    setReport(undefined)
    setStatus(tr('正在搜索…', 'Searching...'))
    const timer = window.setInterval(() => {
      void fileSearchProgress(id)
        .then((progress) => {
          if (job.current === id && progress) {
            setStatus(tr(`已检查 ${progress.scanned} 个文件，跳过 ${progress.skipped} 项…`, `Scanned ${progress.scanned} files, skipped ${progress.skipped}...`))
          }
        })
        .catch(() => {})
    }, 400)
    try {
      const split = (value: string) => value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean)
      const next = await searchFileContents(root, query, split(patterns), maxResults, id, split(excluded))
      if (job.current === id) {
        setReport(next)
        const stateLabel = next.cancelled ? tr('已取消', 'Cancelled') : tr('搜索完成', 'Search complete')
        const truncNote = next.truncated ? tr('达到结果、文件或目录深度限制，请缩小范围。', 'Hit result, file, or depth limit; narrow your scope.') : ''
        setStatus(
          tr(
            `${stateLabel}：${next.results.length} 条结果，检查 ${next.scanned} 个文件，跳过 ${next.skipped} 项。${truncNote}`,
            `${stateLabel}: ${next.results.length} match(es), scanned ${next.scanned} file(s), skipped ${next.skipped}.${truncNote ? ` ${truncNote}` : ''}`,
          ),
        )
      }
    } catch (error) {
      if (job.current === id) {
        setStatus(error && typeof error === 'object' && 'message' in error ? String(error.message) : tr('搜索失败', 'Search failed'))
      }
    } finally {
      window.clearInterval(timer)
      if (job.current === id) {
        job.current = undefined
        setBusy(false)
      }
    }
  }

  return (
    <ToolShell
      title={tr('文件内容搜索', 'File Content Search')}
      level="L4"
      description={tr(
        '递归搜索目录中的文本内容并返回匹配文件路径与行号。',
        'Recursively search text files in a folder and return matching file paths and line numbers.',
      )}
      notes={tr(
        '- 单文件最多读取 2 MB，跳过符号链接与非 UTF-8 文本。\n- 排除目录名会自动保存在本机预设中，支持中途取消。',
        '- Reads files up to 2 MB and skips symlinks and non-UTF-8 files.\n- Excluded directories are saved locally and searches can be cancelled mid-run.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('根目录', 'Root directory')}</span>
          <input className="qb-tool-input qb-mono" disabled={busy} value={root} onChange={(e) => setRoot(e.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('搜索文本', 'Search text')}</span>
          <input className="qb-tool-input" disabled={busy} placeholder={tr('例如 TODO', 'e.g. TODO')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('最多结果', 'Max results')}</span>
          <input
            className="qb-tool-input"
            disabled={busy}
            type="number"
            min={1}
            max={1000}
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
          />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('文件通配符，每行一个', 'File globs (one per line)')}</span>
          <textarea className="qb-tool-textarea qb-mono" disabled={busy} value={patterns} onChange={(e) => setPatterns(e.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('排除目录名（自动保存）', 'Excluded directories (auto-saved)')}</span>
          <textarea className="qb-tool-textarea qb-mono" disabled={busy} value={excluded} onChange={(e) => setExcluded(e.target.value)} />
        </label>
      </div>
      <div className="qb-tool-actions">
        <button
          type="button"
          className="qb-tool-button qb-tool-button--primary"
          disabled={busy || !root.trim() || !query.trim() || !Number.isInteger(maxResults)}
          onClick={() => void run()}
        >
          {tr('搜索', 'Search')}
        </button>
        <button
          type="button"
          className="qb-tool-button"
          disabled={!busy}
          onClick={() => {
            if (job.current) void cancelFileSearch(job.current).catch(() => setStatus(tr('取消请求失败，请重试', 'Cancel request failed; try again')))
          }}
        >
          {tr('取消搜索', 'Cancel search')}
        </button>
      </div>
      <p role="status">{status || tr('输入目录与搜索内容。单文件最多读取 2 MB，跳过符号链接与非 UTF-8 文本。', 'Enter a folder and search query. Reads files up to 2 MB; skips symlinks and non-UTF-8 files.')}</p>
      {report && <CodeBlock code={JSON.stringify(report.results, null, 2)} language="json" copyable wrap />}
    </ToolShell>
  )
}
