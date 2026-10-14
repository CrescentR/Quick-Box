import { useState } from 'react'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { Snippet } from '../../core/workspace/workspace-data'
import { useClipboardToast } from '../../hooks/useClipboardToast'

const blank = (): Snippet => ({ id: crypto.randomUUID(), title: '', content: '', language: 'text', tags: '', updatedAt: new Date().toISOString() })
export default function SnippetToolView() {
  const { data, ready, saving, error, update } = useWorkspaceStore()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Snippet>(blank)
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const { copyText, clipboardToast } = useClipboardToast()
  const edit = (patch: Partial<Snippet>) => { setDraft({ ...draft, ...patch }); setDirty(true); setDeleting(false) }
  const items = data.snippets.filter((item) => `${item.title} ${item.tags} ${item.content}`.toLowerCase().includes(query.toLowerCase()))
  const save = async () => {
    try {
      await update((current) => ({ ...current, snippets: [...current.snippets.filter((item) => item.id !== draft.id), { ...draft, updatedAt: new Date().toISOString() }] }))
      setDirty(false); setMessage('片段已保存。')
    } catch { setMessage('片段未保存，请检查内容或重试。') }
  }
  return <section className="qb-tool-view">
    <h2>本地代码片段</h2>
    <p>保存常用代码和模板，按标题、标签或内容搜索。内容仅保存在本机，并会包含在工作台备份中。</p>
    <label className="qb-tool-field">搜索片段<input className="qb-tool-input" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={dirty || saving} onClick={() => { setDraft(blank()); setDeleting(false) }}>新建片段</button>
      {dirty && <button className="qb-tool-button" onClick={() => { setDraft(data.snippets.find((item) => item.id === draft.id) ?? blank()); setDirty(false) }}>放弃未保存修改</button>}
    </div>
    <div className="qb-snippet-list">
      {items.map((item) => <button className="qb-tool-button" key={item.id} disabled={dirty || saving} onClick={() => { setDraft(item); setDeleting(false) }}>{item.title} · {item.language}</button>)}
      {!items.length && <p>没有匹配的片段。</p>}
    </div>
    <div className="qb-tool-grid">
      <label className="qb-tool-field">标题<input className="qb-tool-input" maxLength={200} value={draft.title} onChange={(event) => edit({ title: event.target.value })} /></label>
      <label className="qb-tool-field">语言<input className="qb-tool-input" maxLength={50} value={draft.language} onChange={(event) => edit({ language: event.target.value })} /></label>
      <label className="qb-tool-field qb-tool-field--full">标签<input className="qb-tool-input" maxLength={500} value={draft.tags} onChange={(event) => edit({ tags: event.target.value })} /></label>
      <label className="qb-tool-field qb-tool-field--full">内容<textarea className="qb-tool-textarea qb-mono" maxLength={100000} value={draft.content} onChange={(event) => edit({ content: event.target.value })} /></label>
    </div>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={!ready || saving || !draft.title.trim()} onClick={() => void save()}>保存片段</button>
      <button className="qb-tool-button" onClick={() => void copyText(draft.content, '代码片段')}>复制内容</button>
      <button className="qb-tool-button" disabled={!ready || saving || !data.snippets.some((item) => item.id === draft.id)} onClick={() => setDeleting(true)}>删除片段</button>
      {deleting && <button className="qb-tool-button" disabled={saving} onClick={() => {
        void update((current) => ({ ...current, snippets: current.snippets.filter((item) => item.id !== draft.id) })).then(() => { setDraft(blank()); setDirty(false); setDeleting(false); setMessage('片段已删除。') }).catch(() => setMessage('删除失败，原片段已保留。'))
      }}>确认删除「{draft.title}」</button>}
    </div>
    <p role="status">{error || message || (dirty ? '有未保存的修改，请先保存或放弃修改再选择其他片段。' : '')}</p>
    {clipboardToast}
  </section>
}
