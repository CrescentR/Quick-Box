import { useEffect, useRef, useState } from 'react'
import { File, Terminal, Plus, Upload } from 'lucide-react'
import { deleteLibraryItem, downloadLibraryFile, libraryError, loadLibrary, MAX_LIBRARY_FILE_SIZE, readLibraryFile, saveLibraryItem, type LibraryItem } from '../../api/library-api'
import { useClipboardToast } from '../../hooks/useClipboardToast'
import './library.css'

const blank = (): LibraryItem => ({ id: crypto.randomUUID(), kind: 'command', title: '', content: '', tags: '', fileName: null, size: null, updatedAt: new Date().toISOString() })
const sizeLabel = (size: number) => size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`

export default function LibraryToolView() {
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

  return <section className="qb-tool-view qb-library">
    <div className="qb-library-heading"><div><h2>命令与文件</h2><p>随手记录，随时取用 · {items.filter((i) => i.kind === 'command').length} 条命令 / {items.filter((i) => i.kind === 'file').length} 个文件</p></div>
      <div className="qb-tool-actions">
        <button className="qb-tool-button" disabled={!ready || busy || dirty} onClick={() => select(blank())}><Plus size={14} />新建命令</button>
        <button className="qb-tool-button" disabled={!ready || busy || dirty} onClick={() => fileInput.current?.click()}><Upload size={14} />保存文件</button>
        <input ref={fileInput} className="qb-library-file-input" aria-label="选择保存的文件" type="file" multiple disabled={!ready || busy || dirty} onChange={(event) => {
          const files = Array.from(event.target.files ?? []); event.target.value = ''
          if (!files.length) return
          void perform(async () => {
            let count = 0
            for (const file of files) {
              try {
                if (file.size > MAX_LIBRARY_FILE_SIZE) throw new Error(`「${file.name}」超过 20 MB`)
                const item = { ...blank(), kind: 'file' as const, title: file.name, fileName: file.name, size: file.size }
                const next = await saveLibraryItem(item, Array.from(new Uint8Array(await file.arrayBuffer())))
                setItems(next); select(next.find((saved) => saved.id === item.id) ?? item); count++
              } catch (cause) { throw new Error(`已保存 ${count} 个文件；${libraryError(cause)}。其余文件未保存。`) }
            }
            setMessage(`已保存 ${count} 个文件副本，原文件移动或删除不影响这里的内容。`)
          })
        }} />
      </div>
    </div>
    <div className="qb-library-toolbar">
      <input className="qb-tool-input" aria-label="搜索命令与文件" placeholder="搜索标题、标签、命令或文件名…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select className="qb-tool-input" aria-label="资料类型" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">全部资料</option><option value="command">命令</option><option value="file">文件</option></select>
    </div>
    <div className="qb-library-layout">
      <div className="qb-library-list" aria-label="资料列表">
        {matches.map((item) => <button className="qb-library-item" key={item.id} disabled={busy || dirty} data-active={draft.id === item.id} onClick={() => select(item)}>
          {item.kind === 'command' ? <Terminal size={16} /> : <File size={16} />}<span><strong>{item.title}</strong><small>{item.tags || (item.kind === 'file' ? sizeLabel(item.size ?? 0) : item.content)}</small></span>
        </button>)}
        {!matches.length && <p className="qb-library-empty">{!ready ? '正在读取资料…' : query || filter !== 'all' ? '没有匹配的资料' : '还没有资料，先记录一条命令或保存一个文件。'}</p>}
      </div>
      <div className="qb-library-editor">
        <div className="qb-library-editor-heading"><strong>{draft.kind === 'command' ? '命令记录' : '文件详情'}</strong><small>{items.some((item) => item.id === draft.id) ? `更新于 ${new Date(draft.updatedAt).toLocaleString()}` : '新记录'}</small></div>
        <label className="qb-tool-field">标题<input className="qb-tool-input" disabled={busy} maxLength={200} value={draft.title} onChange={(e) => edit({ title: e.target.value })} placeholder="例如：查看占用端口的进程" /></label>
        <label className="qb-tool-field">标签<input className="qb-tool-input" disabled={busy} maxLength={500} value={draft.tags} onChange={(e) => edit({ tags: e.target.value })} placeholder="例如：Linux、部署、常用" /></label>
        {draft.kind === 'file' && <p className="qb-library-file-meta">{draft.fileName} · {sizeLabel(draft.size ?? 0)} · 已保存独立副本</p>}
        <label className="qb-tool-field">{draft.kind === 'command' ? '命令内容' : '文件备注'}<textarea className="qb-tool-textarea qb-mono" disabled={busy} maxLength={100000} value={draft.content} onChange={(e) => edit({ content: e.target.value })} placeholder={draft.kind === 'command' ? '输入命令或多行脚本…' : '记录这个文件的用途…'} /></label>
        <div className="qb-tool-actions">
          <button className="qb-tool-button" disabled={!ready || busy || !dirty || !draft.title.trim() || (draft.kind === 'command' && !draft.content.trim())} onClick={() => void perform(async () => { const next = await saveLibraryItem(draft); setItems(next); select(next.find((item) => item.id === draft.id)!); setMessage('已保存。') })}>保存{draft.kind === 'command' ? '命令' : '资料'}</button>
          {draft.kind === 'command' ? <button className="qb-tool-button" disabled={!draft.content} onClick={() => void copyText(draft.content, '命令')}>复制命令</button> : <button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { downloadLibraryFile(draft.fileName!, new Uint8Array(await readLibraryFile(draft.id))); setMessage('文件已导出。') })}>导出文件</button>}
          {dirty && <button className="qb-tool-button" disabled={busy} onClick={() => select(items.find((item) => item.id === draft.id) ?? blank())}>放弃修改</button>}
          <button className="qb-tool-button" disabled={busy || !ready || !items.some((item) => item.id === draft.id)} onClick={() => setDeleting(true)}>删除</button>
        </div>
        {deleting && <div className="qb-library-confirm" role="alert"><p>删除「{draft.title}」{draft.kind === 'file' ? '及其已保存副本' : ''}？此操作无法撤销。</p><div className="qb-tool-actions"><button className="qb-tool-button" disabled={busy} onClick={() => void perform(async () => { setItems(await deleteLibraryItem(draft.id)); select(blank()); setMessage('已删除。') })}>确认删除</button><button className="qb-tool-button" disabled={busy} onClick={() => setDeleting(false)}>取消</button></div></div>}
      </div>
    </div>
    <p className="qb-library-status" role="status">{message || (busy ? '正在处理…' : dirty ? '有未保存的修改，请保存或放弃后切换资料。' : '文件最大 20 MB / 个。数据存储位置可在设置中更改；工作台 JSON 备份不包含此资料库。')}</p>
    {!ready && !busy && <button className="qb-tool-button" onClick={() => void refresh()}>重试读取</button>}
    {clipboardToast}
  </section>
}
