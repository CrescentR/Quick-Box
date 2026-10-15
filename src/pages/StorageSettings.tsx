import { useEffect, useState } from 'react'
import { invokeCommand } from '../api/tauri-api'
import { libraryError } from '../api/library-api'
import { FolderOpen } from 'lucide-react'

interface StorageLocation { path: string; defaultPath: string }
export default function StorageSettings() {
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
    <h2 className="qb-page-card__title">数据存储位置</h2>
    {location?.path ? <>
      <p className="qb-storage-current">当前目录：<span>{location.path}</span></p>
      <div className="qb-page-field"><label className="qb-page-label" htmlFor="storage-directory">新存储目录</label><div className="qb-storage-controls"><input id="storage-directory" className="qb-page-input" value={path} readOnly placeholder="点击选择文件夹" /><button className="qb-tool-button" disabled={busy} onClick={() => {
        setBusy(true); setMessage('')
        void invokeCommand<string | null>('pick_storage_directory').then((selected) => { if (selected) setPath(selected) }).catch((cause) => setMessage(libraryError(cause))).finally(() => setBusy(false))
      }}><FolderOpen size={14} />选择文件夹</button><button className="qb-tool-button" disabled={busy || !path.trim() || path.trim() === location.path} onClick={() => {
        setBusy(true); setMessage('正在迁移，请保持应用开启…')
        void invokeCommand<StorageLocation>('set_storage_location', { path }).then((value) => { setLocation(value); setPath(value.path); setMessage('迁移完成，已使用新目录，原数据副本已保留。重启后缓存目录也会切换。'); window.dispatchEvent(new Event('quickbox:storage-changed')) }).catch((cause) => setMessage(libraryError(cause))).finally(() => setBusy(false))
      }}>{busy ? '迁移中…' : '迁移并使用'}</button></div></div>
      <p>默认保存在所选安装目录的 data 文件夹。迁移请选择可写的空文件夹，命令、文件及统一备份会一并复制。</p>
    </> : location ? <p>浏览器预览使用浏览器本地存储；请在桌面应用中设置磁盘目录。</p> : <button className="qb-tool-button" disabled={busy} onClick={() => void load()}>{busy ? '读取中…' : '重试读取存储位置'}</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
