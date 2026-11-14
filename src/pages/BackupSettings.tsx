import { useEffect, useState } from 'react'
import { FileArchive, FolderOpen, Plus, RefreshCw } from 'lucide-react'
import { invokeCommand } from '../api/tauri-api'
import { libraryError } from '../api/library-api'
import { useLocale, useT } from '../i18n'

export interface BackupFile { id: string; name: string; size: number; createdAt: number }
const formatSize = (size: number) => size < 1024 ? `${size} B` : size < 1024 ** 2 ? `${(size / 1024).toFixed(1)} KB` : size < 1024 ** 3 ? `${(size / 1024 ** 2).toFixed(1)} MB` : `${(size / 1024 ** 3).toFixed(2)} GB`

export default function BackupSettings() {
  const tr = useT()
  const locale = useLocale()
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
    <div className="qb-backup-heading"><h2 className="qb-page-card__title">{tr('统一备份管理', 'Unified Backups')}</h2><span>{tr(`${files.length} 个文件`, `${files.length} files`)} · {formatSize(files.reduce((sum, file) => sum + file.size, 0))}</span></div>
    <p>{tr('支持 ZIP、SQL、图片、文档等任意格式。文件原样复制到数据目录下的 backups 文件夹，同名文件分别保留。', 'Supports ZIP, SQL, images, documents, and any other file type. Copies are stored verbatim in the data directory’s backups folder with unique entries for duplicate filenames.')}</p>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={busy || !ready} onClick={() => void perform(async () => {
        const next = await invokeCommand<BackupFile[]>('add_backup_files')
        const added = Math.max(0, next.length - files.length); setFiles(next)
        if (added) setMessage(tr(`已保存 ${added} 个备份副本。`, `Saved ${added} backup copy(ies).`))
      })}><Plus size={14} />{tr('添加备份文件', 'Add Backup Files')}</button>
      <button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { await invokeCommand('open_backup_directory') })}><FolderOpen size={14} />{tr('打开备份文件夹', 'Open Backup Folder')}</button>
      <button className="qb-tool-button" disabled={busy} onClick={() => void perform(refresh)}><RefreshCw size={13} />{tr('刷新列表', 'Refresh')}</button>
    </div>
    {!!files.length && <input className="qb-page-input" aria-label={tr('搜索备份文件', 'Search backup files')} placeholder={tr('按文件名搜索备份…', 'Search backups by filename…')} value={query} onChange={(event) => setQuery(event.target.value)} />}
    <div className="qb-backup-list" aria-label={tr('备份文件列表', 'Backup files list')}>
      {visible.map((file) => <div className="qb-backup-row" key={file.id}>
        <FileArchive size={16} />
        <div className="qb-backup-row__copy"><strong title={file.name}>{file.name}</strong><span>{formatSize(file.size)} · {new Date(file.createdAt).toLocaleString(locale)}</span></div>
        <button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { const destination = await invokeCommand<string | null>('export_backup_file', { id: file.id }); if (destination) setMessage(tr(`已导出至 ${destination}`, `Exported to ${destination}`)) })}>{tr('导出', 'Export')}</button>
        <button className="qb-tool-button" disabled={busy} onClick={() => setDeleting(file)}>{tr('删除', 'Delete')}</button>
      </div>)}
      {ready && !visible.length && <p className="qb-backup-empty">{files.length ? tr('没有匹配的备份文件。', 'No matching backup files.') : tr('暂无备份，点击“添加备份文件”选择一个或多个文件。', 'No backups yet. Click “Add Backup Files” to select one or more files.')}</p>}
    </div>
    {deleting && <div className="qb-backup-confirm" role="alert"><p>{tr(`确认删除备份「${deleting.name}」？此操作无法撤销。`, `Delete backup "${deleting.name}"? This cannot be undone.`)}</p><div className="qb-tool-actions"><button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { setFiles(await invokeCommand<BackupFile[]>('delete_backup_file', { id: deleting.id })); setDeleting(undefined); setMessage(tr('备份副本已删除。', 'Backup deleted.')) })}>{tr('确认删除备份', 'Confirm Delete')}</button><button className="qb-tool-button" disabled={busy} onClick={() => setDeleting(undefined)}>{tr('取消', 'Cancel')}</button></div></div>}
    {(busy || message) && <p role="status">{busy ? tr('正在处理，请稍候…', 'Processing, please wait…') : message}</p>}
  </section>
}
