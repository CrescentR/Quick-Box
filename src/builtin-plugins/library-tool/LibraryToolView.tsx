import { useEffect, useRef, useState } from 'react'
import { File, Terminal, Plus, Upload } from 'lucide-react'
import { deleteLibraryItem, downloadLibraryFile, libraryError, loadLibrary, MAX_LIBRARY_FILE_SIZE, readLibraryFile, saveLibraryItem, type LibraryItem } from '../../api/library-api'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import { useLocale, useT } from '../../i18n'
import './library.css'

const blank = (): LibraryItem => ({ id: crypto.randomUUID(), kind: 'command', title: '', content: '', tags: '', fileName: null, size: null, updatedAt: new Date().toISOString() })
const sizeLabel = (size: number) => size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`

export default function LibraryToolView() {
  const tr = useT()
  const locale = useLocale()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [draft, setDraft] = useState<LibraryItem>(blank)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const { copyText, clipboardToast } = useClipboardToast()
  const refresh = async () => {
    setBusy(true)
    try { setItems(await loadLibrary()); setReady(true); setMessage('') }
    catch (cause) { setMessage(libraryError(cause)) }
    finally { setBusy(false) }
  }
  useEffect(() => { void refresh() }, [])
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (cause) { setMessage(libraryError(cause)) }
    finally { setBusy(false) }
  }
  const select = (item: LibraryItem) => { setDraft(item); setDirty(false); setDeleting(false); setMessage('') }
  const edit = (patch: Partial<LibraryItem>) => { setDraft({ ...draft, ...patch }); setDirty(true); setDeleting(false) }
  const matches = items.filter((item) => (filter === 'all' || item.kind === filter) && `${item.title} ${item.tags} ${item.content} ${item.fileName ?? ''}`.toLowerCase().includes(query.toLowerCase().trim()))
  const commandCount = items.filter((i) => i.kind === 'command').length
  const fileCount = items.filter((i) => i.kind === 'file').length

  return <section className="qb-tool-view qb-library">
    <div className="qb-library-heading"><div><h2>{tr('命令与文件', 'Commands & Files')}</h2><p>{tr(`随手记录，随时取用 · ${commandCount} 条命令 / ${fileCount} 个文件`, `Capture quickly, retrieve anytime · ${commandCount} commands / ${fileCount} files`)}</p></div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button" disabled={!ready || busy || dirty} onClick={() => select(blank())}><Plus size={14} />{tr('新建命令', 'New command')}</button>
        <button className="qb-tool-button" disabled={!ready || busy || dirty} onClick={() => fileInput.current?.click()}><Upload size={14} />{tr('保存文件', 'Save file')}</button>
        <input ref={fileInput} className="qb-library-file-input" aria-label={tr('选择保存的文件', 'Choose files to save')} type="file" multiple disabled={!ready || busy || dirty} onChange={(event) => {
          const files = Array.from(event.target.files ?? []); event.target.value = ''
          if (!files.length) return
          void perform(async () => {
            let count = 0
            for (const file of files) {
              try {
                if (file.size > MAX_LIBRARY_FILE_SIZE) throw new Error(tr(`「${file.name}」超过 20 MB`, `"${file.name}" exceeds 20 MB`))
                const item = { ...blank(), kind: 'file' as const, title: file.name, fileName: file.name, size: file.size }
                const next = await saveLibraryItem(item, Array.from(new Uint8Array(await file.arrayBuffer())))
                setItems(next); select(next.find((saved) => saved.id === item.id) ?? item); count++
              } catch (cause) {
                throw new Error(tr(`已保存 ${count} 个文件；${libraryError(cause)}。其余文件未保存。`, `Saved ${count} files; ${libraryError(cause)}. Remaining files were not saved.`))
              }
            }
            setMessage(tr(`已保存 ${count} 个文件副本，原文件移动或删除不影响这里的内容。`, `Saved ${count} file copies. Moving or deleting the originals will not affect these copies.`))
          })
        }} />
      </div>
    </div>
    <div className="qb-library-toolbar">
      <input className="qb-tool-input" aria-label={tr('搜索命令与文件', 'Search commands and files')} placeholder={tr('搜索标题、标签、命令或文件名…', 'Search title, tags, command, or filename...')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <select className="qb-tool-input" aria-label={tr('资料类型', 'Item type')} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">{tr('全部资料', 'All items')}</option><option value="command">{tr('命令', 'Commands')}</option><option value="file">{tr('文件', 'Files')}</option></select>
    </div>
    <div className="qb-library-layout">
      <div className="qb-library-list" aria-label={tr('资料列表', 'Item list')}>
        {matches.map((item) => <button className="qb-library-item" key={item.id} disabled={busy || dirty} data-active={draft.id === item.id} onClick={() => select(item)}>
          {item.kind === 'command' ? <Terminal size={16} /> : <File size={16} />}<span><strong>{item.title}</strong><small>{item.tags || (item.kind === 'file' ? sizeLabel(item.size ?? 0) : item.content)}</small></span>
        </button>)}
        {!matches.length && <p className="qb-library-empty">{!ready ? tr('正在读取资料…', 'Loading library...') : query || filter !== 'all' ? tr('没有匹配的资料', 'No matching items') : tr('还没有资料，先记录一条命令或保存一个文件。', 'No items yet. Record a command or save a file to start.')}</p>}
      </div>
      <div className="qb-library-editor">
        <div className="qb-library-editor-heading"><strong>{draft.kind === 'command' ? tr('命令记录', 'Command Entry') : tr('文件详情', 'File Details')}</strong><small>{items.some((item) => item.id === draft.id) ? tr(`更新于 ${new Date(draft.updatedAt).toLocaleString(locale)}`, `Updated ${new Date(draft.updatedAt).toLocaleString(locale)}`) : tr('新记录', 'New entry')}</small></div>
        <label className="qb-tool-field">{tr('标题', 'Title')}<input className="qb-tool-input" disabled={busy} maxLength={200} value={draft.title} onChange={(e) => edit({ title: e.target.value })} placeholder={tr('例如：查看占用端口的进程', 'e.g. Check process occupying a port')} /></label>
        <label className="qb-tool-field">{tr('标签', 'Tags')}<input className="qb-tool-input" disabled={busy} maxLength={500} value={draft.tags} onChange={(e) => edit({ tags: e.target.value })} placeholder={tr('例如：Linux、部署、常用', 'e.g. Linux, deploy, frequent')} /></label>
        {draft.kind === 'file' && <p className="qb-library-file-meta">{draft.fileName} · {sizeLabel(draft.size ?? 0)} · {tr('已保存独立副本', 'Saved standalone copy')}</p>}
        <label className="qb-tool-field">{draft.kind === 'command' ? tr('命令内容', 'Command Content') : tr('文件备注', 'File Notes')}<textarea className="qb-tool-textarea qb-mono" disabled={busy} maxLength={100000} value={draft.content} onChange={(e) => edit({ content: e.target.value })} placeholder={draft.kind === 'command' ? tr('输入命令或多行脚本…', 'Enter a command or multi-line script...') : tr('记录这个文件的用途…', 'Describe what this file is used for...')} /></label>
        <div className="qb-tool-actions">
          <button className="qb-tool-button" disabled={!ready || busy || !dirty || !draft.title.trim() || (draft.kind === 'command' && !draft.content.trim())} onClick={() => void perform(async () => { const next = await saveLibraryItem(draft); setItems(next); select(next.find((item) => item.id === draft.id)!); setMessage(tr('已保存。', 'Saved.')) })}>{draft.kind === 'command' ? tr('保存命令', 'Save command') : tr('保存资料', 'Save item')}</button>
          {draft.kind === 'command' ? <button className="qb-tool-button" disabled={!draft.content} onClick={() => void copyText(draft.content, tr('命令', 'Command'))}>{tr('复制命令', 'Copy command')}</button> : <button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { downloadLibraryFile(draft.fileName!, new Uint8Array(await readLibraryFile(draft.id))); setMessage(tr('文件已导出。', 'File exported.')) })}>{tr('导出文件', 'Export file')}</button>}
          {dirty && <button className="qb-tool-button" disabled={busy} onClick={() => select(items.find((item) => item.id === draft.id) ?? blank())}>{tr('放弃修改', 'Discard changes')}</button>}
          <button className="qb-tool-button" disabled={busy || !ready || !items.some((item) => item.id === draft.id)} onClick={() => setDeleting(true)}>{tr('删除', 'Delete')}</button>
        </div>
        {deleting && <div className="qb-library-confirm" role="alert"><p>{draft.kind === 'file' ? tr(`删除「${draft.title}」及其已保存副本？此操作无法撤销。`, `Delete "${draft.title}" and its saved copy? This cannot be undone.`) : tr(`删除「${draft.title}」？此操作无法撤销。`, `Delete "${draft.title}"? This cannot be undone.`)}</p><div className="qb-tool-actions"><button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { setItems(await deleteLibraryItem(draft.id)); select(blank()); setMessage(tr('已删除。', 'Deleted.')) })}>{tr('确认删除', 'Confirm delete')}</button><button className="qb-tool-button" disabled={busy} onClick={() => setDeleting(false)}>{tr('取消', 'Cancel')}</button></div></div>}
      </div>
    </div>
    <p className="qb-library-status" role="status">{message || (busy ? tr('正在处理…', 'Working...') : dirty ? tr('有未保存的修改，请保存或放弃后切换资料。', 'You have unsaved changes. Save or discard them before switching items.') : tr('文件最大 20 MB / 个。数据存储位置可在设置中更改；工作台 JSON 备份不包含此资料库。', 'Max 20 MB per file. Storage location can be changed in Settings; workspace JSON backups exclude this library.'))}</p>
    {!ready && !busy && <button className="qb-tool-button" onClick={() => void refresh()}>{tr('重试读取', 'Retry load')}</button>}
    {clipboardToast}
  </section>
}
