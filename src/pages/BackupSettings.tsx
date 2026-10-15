import { useEffect, useState } from 'react'
import { FileArchive, FolderOpen, Plus, RefreshCw } from 'lucide-react'
import { invokeCommand } from '../api/tauri-api'
import { libraryError } from '../api/library-api'

export interface BackupFile { id: string; name: string; size: number; createdAt: number }
const formatSize = (size: number) => size < 1024 ? `${size} B` : size < 1024 ** 2 ? `${(size / 1024).toFixed(1)} KB` : size < 1024 ** 3 ? `${(size / 1024 ** 2).toFixed(1)} MB` : `${(size / 1024 ** 3).toFixed(2)} GB`

export default function BackupSettings() {
  const [files, setFiles] = useState<BackupFile[]>([])
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<BackupFile>()
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (cause) { setMessage(libraryError(cause)) }
    finally { setBusy(false) }
  }
  const refresh = async () => { setFiles(await invokeCommand<BackupFile[]>('load_backups')); setReady(true) }
  useEffect(() => {
    const reload = () => { void perform(refresh) }
    reload(); window.addEventListener('quickbox:storage-changed', reload)
    return () => window.removeEventListener('quickbox:storage-changed', reload)
  }, [])
  const visible = files.filter((file) => file.name.toLowerCase().includes(query.toLowerCase().trim()))
  return <section className="qb-page-card">
    <div className="qb-backup-heading"><h2 className="qb-page-card__title">统一备份管理</h2><span>{files.length} 个文件 · {formatSize(files.reduce((sum, file) => sum + file.size, 0))}</span></div>
    <p>支持 ZIP、SQL、图片、文档等任意格式。文件原样复制到数据目录下的 backups 文件夹，同名文件分别保留。</p>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={busy || !ready} onClick={() => void perform(async () => {
        const next = await invokeCommand<BackupFile[]>('add_backup_files')
        const added = Math.max(0, next.length - files.length); setFiles(next)
        if (added) setMessage(`已保存 ${added} 个备份副本。`)
      })}><Plus size={14} />添加备份文件</button>
      <button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { await invokeCommand('open_backup_directory') })}><FolderOpen size={14} />打开备份文件夹</button>
      <button className="qb-tool-button" disabled={busy} onClick={() => void perform(refresh)}><RefreshCw size={13} />刷新列表</button>
    </div>
    {!!files.length && <input className="qb-page-input" aria-label="搜索备份文件" placeholder="按文件名搜索备份…" value={query} onChange={(event) => setQuery(event.target.value)} />}
    <div className="qb-backup-list" aria-label="备份文件列表">
      {visible.map((file) => <div className="qb-backup-row" key={file.id}>
        <FileArchive size={16} />
        <div className="qb-backup-row__copy"><strong title={file.name}>{file.name}</strong><span>{formatSize(file.size)} · {new Date(file.createdAt).toLocaleString()}</span></div>
        <button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { const destination = await invokeCommand<string | null>('export_backup_file', { id: file.id }); if (destination) setMessage(`已导出至 ${destination}`) })}>导出</button>
        <button className="qb-tool-button" disabled={busy} onClick={() => setDeleting(file)}>删除</button>
      </div>)}
      {ready && !visible.length && <p className="qb-backup-empty">{files.length ? '没有匹配的备份文件。' : '暂无备份，点击“添加备份文件”选择一个或多个文件。'}</p>}
    </div>
    {deleting && <div className="qb-backup-confirm" role="alert"><p>确认删除备份「{deleting.name}」？此操作无法撤销。</p><div className="qb-tool-actions"><button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { setFiles(await invokeCommand<BackupFile[]>('delete_backup_file', { id: deleting.id })); setDeleting(undefined); setMessage('备份副本已删除。') })}>确认删除备份</button><button className="qb-tool-button" disabled={busy} onClick={() => setDeleting(undefined)}>取消</button></div></div>}
    {(busy || message) && <p role="status">{busy ? '正在处理，请稍候…' : message}</p>}
  </section>
}
