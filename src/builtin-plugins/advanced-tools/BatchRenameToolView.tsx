import { useMemo, useState } from 'react'
import { writeClipboardText } from '../../api/clipboard-api'
import { applyBatchRename, listDirectoryFiles } from '../../api/file-tools-api'
import type { DirectoryFileItem, RenameResultItem } from '../../api/file-tools-api'
import { useLocale, useT } from '../../i18n'
import { CodeBlock } from '../../ui'
import { ToolShell } from '../../core/tool/ToolShell'
import { previewRename } from './batch-rename'

export default function BatchRenameToolView() {
  const tr = useT()
  const locale = useLocale()
  const [directoryPath, setDirectoryPath] = useState('')
  const [files, setFiles] = useState<DirectoryFileItem[]>([])
  const [pattern, setPattern] = useState('IMG_\\d+')
  const [replacement, setReplacement] = useState('photo')
  const [start, setStart] = useState(1)
  const [separator, setSeparator] = useState('_')
  const [includeDate, setIncludeDate] = useState(false)
  const [dateText, setDateText] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [status, setStatus] = useState('')
  const [renameResult, setRenameResult] = useState<RenameResultItem[]>([])
  const [scannedDirectory, setScannedDirectory] = useState('')
  const [busy, setBusy] = useState(false)
  const result = useMemo(
    () => previewRename(files, pattern, replacement, start, separator, includeDate, dateText, locale),
    [dateText, files, includeDate, locale, pattern, replacement, separator, start],
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
      setStatus(tr(`已扫描 ${nextFiles.length} 个文件`, `Scanned ${nextFiles.length} file(s)`))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : tr('扫描目录失败', 'Failed to scan directory'))
    }
  }

  const applyRename = async () => {
    if (scannedDirectory !== directoryPath || busy) return
    setBusy(true)
    try {
      const nextResult = await applyBatchRename(directoryPath, operations)
      setRenameResult(nextResult)
      const okCount = nextResult.filter((item) => item.ok).length
      const failCount = nextResult.filter((item) => !item.ok).length
      setStatus(tr(`执行完成：成功 ${okCount} 个，失败 ${failCount} 个`, `Done: ${okCount} succeeded, ${failCount} failed`))
      const nextFiles = await listDirectoryFiles(directoryPath)
      setFiles(nextFiles)
    } catch (error) {
      setStatus(error && typeof error === 'object' && 'message' in error ? String(error.message) : tr('批量重命名失败', 'Batch rename failed'))
    } finally { setBusy(false) }
  }

  const statusText = status || tr('输入目录后点击扫描文件。', 'Enter a directory path and click Scan files.')

  return (
    <ToolShell
      title={tr('批量文件重命名', 'Batch File Rename')}
      level="L4"
      description={tr(
        '扫描目录文件，按正则替换、序号和日期规则预演并执行重命名。',
        'Scan a folder and preview or apply batch file renames with regex replacement, sequence numbers, and dates.',
      )}
      notes={tr(
        '- 点击执行前请先查看预演结果。\n- Rust 后端会阻止包含路径分隔符的目标文件名，并跳过已存在的目标文件。',
        '- Review the dry-run preview before applying changes.\n- The Rust backend blocks path separators in target names and skips existing collisions.',
      )}
    >
      <div className="qb-tool-grid">
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('目录路径', 'Directory path')}</span>
          <input className="qb-tool-input qb-mono" value={directoryPath} disabled={busy} onChange={(event) => { setDirectoryPath(event.target.value); setFiles([]); setScannedDirectory('') }} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('匹配正则', 'Match regex')}</span>
          <input className="qb-tool-input qb-mono" value={pattern} onChange={(event) => setPattern(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('替换为', 'Replace with')}</span>
          <input className="qb-tool-input qb-mono" value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('起始序号', 'Start index')}</span>
          <input className="qb-tool-input" type="number" min={0} value={start} onChange={(event) => setStart(Number(event.target.value))} />
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('分隔符', 'Separator')}</span>
          <input className="qb-tool-input qb-mono" value={separator} onChange={(event) => setSeparator(event.target.value)} />
        </label>
        <label className="qb-tool-checkbox">
          <input type="checkbox" checked={includeDate} onChange={(event) => setIncludeDate(event.target.checked)} />
          <span>{tr('加入日期', 'Include date')}</span>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">{tr('日期', 'Date')}</span>
          <input className="qb-tool-input" type="date" value={dateText} onChange={(event) => setDateText(event.target.value)} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">{tr('预演结果', 'Dry-run preview')}</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('检查报告', 'Validation report')}</span>
          <CodeBlock code={`${statusText}\n${result.report}`} language="txt" wrap copyable />
        </div>
        <div className="qb-tool-field">
          <span className="qb-tool-label">{tr('执行结果', 'Execution log')}</span>
          <CodeBlock code={renameResult.length ? JSON.stringify(renameResult, null, 2) : tr('// 尚未执行', '// Not executed yet')} language={renameResult.length ? 'json' : 'txt'} wrap copyable />
        </div>
      </div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button" type="button" onClick={() => void scanFiles()} disabled={!directoryPath.trim()}>
          {tr('扫描文件', 'Scan files')}
        </button>
        <button className="qb-tool-button qb-tool-button--primary" type="button" onClick={() => void writeClipboardText(output)}>
          {tr('复制预演结果', 'Copy preview')}
        </button>
        <button
          className="qb-tool-button"
          type="button"
          onClick={() => void applyRename()}
          disabled={busy || scannedDirectory !== directoryPath || !directoryPath.trim() || !operations.length || result.hasDuplicate}
        >
          {tr('执行重命名', 'Apply rename')}
        </button>
      </div>
    </ToolShell>
  )
}
