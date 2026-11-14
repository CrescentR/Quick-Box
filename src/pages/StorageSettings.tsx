import { useEffect, useState } from 'react'
import { invokeCommand } from '../api/tauri-api'
import { libraryError } from '../api/library-api'
import { useT } from '../i18n'
import { FolderOpen } from 'lucide-react'

interface StorageLocation { path: string; defaultPath: string }
export default function StorageSettings() {
  const tr = useT()
  const [location, setLocation] = useState<StorageLocation>()
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const load = async () => {
    setBusy(true)
    try { const value = await invokeCommand<StorageLocation>('get_storage_location'); setLocation(value); setPath(value.path); setMessage('') }
    catch (cause) { setMessage(libraryError(cause)) }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])
  return <section className="qb-page-card">
    <h2 className="qb-page-card__title">{tr('数据存储位置', 'Data Storage Location')}</h2>
    {location?.path ? <>
      <p className="qb-storage-current">{tr('当前目录：', 'Current directory: ')}<span>{location.path}</span></p>
      <div className="qb-page-field"><label className="qb-page-label" htmlFor="storage-directory">{tr('新存储目录', 'New Storage Directory')}</label><div className="qb-storage-controls"><input id="storage-directory" className="qb-page-input" value={path} readOnly placeholder={tr('点击选择文件夹', 'Select a folder')} /><button className="qb-tool-button" disabled={busy} onClick={() => {
        setBusy(true); setMessage('')
        void invokeCommand<string | null>('pick_storage_directory').then((selected) => { if (selected) setPath(selected) }).catch((cause) => setMessage(libraryError(cause))).finally(() => setBusy(false))
      }}><FolderOpen size={14} />{tr('选择文件夹', 'Choose Folder')}</button><button className="qb-tool-button" disabled={busy || !path.trim() || path.trim() === location.path} onClick={() => {
        setBusy(true); setMessage(tr('正在迁移，请保持应用开启…', 'Migrating data, please keep QuickBox open…'))
        void invokeCommand<StorageLocation>('set_storage_location', { path }).then((value) => { setLocation(value); setPath(value.path); setMessage(tr('迁移完成，已使用新目录，原数据副本已保留。重启后缓存目录也会切换。', 'Migration complete. Now using the new directory (original files kept as a copy). Restart to switch WebView cache.')); window.dispatchEvent(new Event('quickbox:storage-changed')) }).catch((cause) => setMessage(libraryError(cause))).finally(() => setBusy(false))
      }}>{busy ? tr('迁移中…', 'Migrating…') : tr('迁移并使用', 'Migrate & Use')}</button></div></div>
      <p>{tr('默认保存在所选安装目录的 data 文件夹。迁移请选择可写的空文件夹，命令、文件及统一备份会一并复制。', 'Defaults to the data folder inside your installation directory. Select a writable empty directory to migrate databases, saved files, and backups together.')}</p>
    </> : location ? <p>{tr('浏览器预览使用浏览器本地存储；请在桌面应用中设置磁盘目录。', 'Browser preview uses browser local storage; configure disk storage in the desktop app.')}</p> : <button className="qb-tool-button" disabled={busy} onClick={() => void load()}>{busy ? tr('读取中…', 'Loading…') : tr('重试读取存储位置', 'Retry Loading Storage Location')}</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
