import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { applyBatchRename, listDirectoryFiles } from '../../api/file-tools-api'
import type { DirectoryFileItem, RenameResultItem } from '../../api/file-tools-api'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { previewRename } from './batch-rename'

export default function BatchRenameToolView() {
  const [directoryPath, setDirectoryPath] = useState('')
  const [files, setFiles] = useState<DirectoryFileItem[]>([])
  const [pattern, setPattern] = useState('IMG_\\d+')
  const [replacement, setReplacement] = useState('毕业照')
  const [start, setStart] = useState(1)
  const [separator, setSeparator] = useState('_')
  const [includeDate, setIncludeDate] = useState(false)
  const [dateText, setDateText] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [status, setStatus] = useState('输入目录后点击扫描文件。')
  const [renameResult, setRenameResult] = useState<RenameResultItem[]>([])
  const [scannedDirectory, setScannedDirectory] = useState('')
  const [busy, setBusy] = useState(false)
  const result = useMemo(
    () => previewRename(files, pattern, replacement, start, separator, includeDate, dateText),
    [dateText, files, includeDate, pattern, replacement, separator, start],
  )
  const operations = useMemo(
    () => result.rows.filter((row) => !row.unchanged).map(({ old_name, new_name }) => ({ old_name, new_name })),
    [result.rows],
  )
  const output = JSON.stringify(result.rows, null, 2)

  const scanFiles = async () => {
    try {
      const nextFiles = await listDirectoryFiles(directoryPath)
      setFiles(nextFiles)
      setScannedDirectory(directoryPath)
      setRenameResult([])
      setStatus(`已扫描 ${nextFiles.length} 个文件`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '扫描目录失败')
    }
  }

  const applyRename = async () => {
    if (scannedDirectory !== directoryPath || busy) return
    setBusy(true)
    try {
      const nextResult = await applyBatchRename(directoryPath, operations)
      setRenameResult(nextResult)
      setStatus(`执行完成：成功 ${nextResult.filter((item) => item.ok).length} 个，失败 ${nextResult.filter((item) => !item.ok).length} 个`)
      const nextFiles = await listDirectoryFiles(directoryPath)
      setFiles(nextFiles)
    } catch (error) {
      setStatus(error && typeof error === 'object' && 'message' in error ? String(error.message) : '批量重命名失败')
    } finally { setBusy(false) }
  }

  return (
    <ToolShell
      title="批量文件重命名"
      level="L4"
      description="扫描目录文件，按正则替换、序号和日期规则预演并执行重命名。"
      notes="- 点击执行前请先查看预演结果。\n- Rust 后端会阻止包含路径分隔符的目标文件名，并跳过已存在的目标文件。"
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">目录路径</span>
          <input className="qb-tool-input qb-mono" value={directoryPath} disabled={busy} onChange={(event) => { setDirectoryPath(event.target.value); setFiles([]); setScannedDirectory('') }} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">匹配正则</span>
          <input className="qb-tool-input qb-mono" value={pattern} onChange={(event) => setPattern(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">替换为</span>
          <input className="qb-tool-input qb-mono" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">起始序号</span>
          <input className="qb-tool-input" type="number" min={0} value={start} onChange={(event) => setStart(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">分隔符</span>
          <input className="qb-tool-input qb-mono" value={separator} onChange={(event) => setSeparator(event.target.value)} />
        </label>
        <label className="qb-tool-checkbox">
          <input type="checkbox" checked={includeDate} onChange={(event) => setIncludeDate(event.target.checked)} />
          <span>加入日期</span>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">日期</span>
          <input className="qb-tool-input" type="date" value={dateText} onChange={(event) => setDateText(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">预演结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">检查报告</span>
          <CodeBlock code={`${status}\n${result.report}`} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">执行结果</span>
          <CodeBlock code={renameResult.length ? JSON.stringify(renameResult, null, 2) : '// 尚未执行'} language={renameResult.length ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button" type="button" onClick={() => void scanFiles()} disabled={!directoryPath.trim()}>
          扫描文件
        </button>
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)}>
          复制预演结果
        </button>
        <button
          className="qb-tool-button"
          type="button"
          onClick={() => void applyRename()}
          disabled={busy || scannedDirectory !== directoryPath || !directoryPath.trim() || !operations.length || result.report.includes('存在重复目标文件')}
        >
          执行重命名
        </button>
      </div>
    </ToolShell>
  )
}
