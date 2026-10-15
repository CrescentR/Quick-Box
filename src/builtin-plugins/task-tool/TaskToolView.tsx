import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, Check, CheckCheck, ChevronDown, Download, Inbox, ListChecks, Pin, Plus, RefreshCw, Search, Settings2, Trash2, Undo2, Upload } from 'lucide-react'
import { taskApi } from '../../api/task-api'
import type { PluginViewProps } from '../../core/plugin/plugin-types'
import type { Overview, Tag, Task, TaskInput, TaskList, TaskTemplate, ViewKey } from '../../core/tasks/task-types'
import { localDate, parseNaturalTask, relativeDate } from '../../core/tasks/natural-date'
import { detectImportFormat, MAX_TASK_IMPORT_BYTES, parseImportContent, type ImportFormat } from '../../core/tasks/task-transfer'
import { duplicateFromTask, loadRecentTemplates, rememberTaskTemplate, templateToInput } from '../../core/tasks/task-templates'
import TaskEditor from './TaskEditor'
import './task-tool.css'

const PAGE_SIZE = 100
const views: Array<{ id: ViewKey; label: string; icon: typeof Inbox }> = [
  { id: 'today', label: '今天', icon: CalendarDays }, { id: 'inbox', label: '收集箱', icon: Inbox },
  { id: 'upcoming', label: '未来 30 天', icon: CalendarDays }, { id: 'all', label: '全部未完', icon: ListChecks },
  { id: 'completed', label: '已完成', icon: CheckCheck }, { id: 'trash', label: '回收站', icon: Trash2 },
]
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : (cause && typeof cause === 'object' && 'message' in cause) ? String(cause.message) : '操作失败，请重试。'
const newInput = (view: ViewKey): TaskInput => ({ title: '', description: '', priority: 4, list_id: view.startsWith('list:') ? view.slice(5) : null, due_date: view === 'today' ? localDate() : null, due_time: null, reminder_minutes: null, recurrence: null, is_pinned: false, tag_ids: view.startsWith('tag:') ? [view.slice(4)] : [], subtasks: [] })
const taskToInput = (task: Task): TaskInput => ({ title: task.title, description: task.description, priority: task.priority, list_id: task.list_id, due_date: task.due_date, due_time: task.due_time, reminder_minutes: task.reminder_minutes, recurrence: task.recurrence, is_pinned: task.is_pinned, tag_ids: task.tags.map(tag => tag.id), subtasks: task.subtasks.map(({ id, title, completed, sort_order }) => ({ id, title, completed, sort_order })) })
type Confirm = { kind: 'delete' | 'purge' | 'list' | 'tag'; id: string; name: string }

export default function TaskToolView({ params }: PluginViewProps) {
  const [view, setView] = useState<ViewKey>(typeof params?.taskId === 'string' ? 'all' : 'today')
  const [query, setQuery] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [overview, setOverview] = useState<Overview>({ pending_today: 0, completed_today: 0, overdue: 0 })
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [quick, setQuick] = useState('')
  const [editor, setEditor] = useState<{ task: Task | null; input: TaskInput; original: string } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [management, setManagement] = useState(false)
  const [transfer, setTransfer] = useState(false)
  const [newList, setNewList] = useState('')
  const [newTag, setNewTag] = useState('')
  const [format, setFormat] = useState<ImportFormat>('json')
  const fileInput = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const openedReminder = useRef('')
  const dirty = !!editor && JSON.stringify(editor.input) !== editor.original
  const locked = busy || dirty || !!confirm
  const parsed = useMemo(() => parseNaturalTask(quick), [quick])
  const viewTitle = query.trim() ? '搜索结果' : views.find(item => item.id === view)?.label ?? (view.startsWith('list:') ? lists.find(list => list.id === view.slice(5))?.name : tags.find(tag => tag.id === view.slice(4))?.name) ?? '任务列表'

  const refresh = useCallback(async () => {
    const token = ++requestId.current
    const [items, nextLists, nextTags, stats] = await Promise.all([
      taskApi.query({ view: query.trim() ? 'search' : view, search: query.trim() || undefined, limit: PAGE_SIZE, offset: 0 }),
      taskApi.lists(), taskApi.tags(), taskApi.overview(),
    ])
    if (token !== requestId.current) return
    setTasks(items); setLists(nextLists); setTags(nextTags); setOverview(stats); setHasMore(items.length === PAGE_SIZE); setReady(true)
  }, [view, query])

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      void refresh().catch(cause => { if (active) setError(errorText(cause)) }).finally(() => { if (active) setLoading(false) })
    }, query.trim() ? 180 : 0)
    return () => { active = false; requestId.current++; window.clearTimeout(timer) }
  }, [refresh])
  useEffect(() => { void loadRecentTemplates().then(setTemplates).catch(() => {}) }, [])
  useEffect(() => {
    const taskId = typeof params?.taskId === 'string' ? params.taskId : ''
    const key = `${taskId}:${String(params?.requestId ?? '')}`
    if (!taskId || openedReminder.current === key) return
    if (dirty) { setError('请先保存或放弃当前修改，再打开提醒中的任务。'); return }
    if (busy || confirm) return
    let active = true
    void taskApi.get(taskId).then(task => {
      if (!active) return
      openedReminder.current = key
      if (!task) { setError('此任务已不存在，可能已经被永久删除。'); return }
      const input = taskToInput(task)
      setView(task.deleted_at ? 'trash' : task.status === 'completed' ? 'completed' : 'all'); setQuery(''); setConfirm(null)
      setEditor({ task, input, original: JSON.stringify(input) }); setError('')
    }).catch(cause => { if (active) setError(errorText(cause)) })
    return () => { active = false }
  }, [params?.taskId, params?.requestId, dirty, busy, confirm])

  const perform = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await action() } catch (cause) { setError(errorText(cause)) }
    finally { setBusy(false) }
  }
  const openEditor = (task: Task | null, input = task ? taskToInput(task) : newInput(view), forceDirty = false) => {
    if (locked) return
    const currentInput = { ...input, list_id: lists.some(list => list.id === input.list_id) ? input.list_id : null, tag_ids: (input.tag_ids ?? []).filter(id => tags.some(tag => tag.id === id)) }
    setConfirm(null); setError(''); setMessage(''); setEditor({ task, input: currentInput, original: forceDirty ? '' : JSON.stringify(currentInput) })
  }
  const changeView = (next: ViewKey) => { if (!locked) { setView(next); setQuery(''); setEditor(null); setConfirm(null); setMessage(''); setError('') } }
  const remember = async (input: TaskInput) => {
    try { await rememberTaskTemplate(input); setTemplates(await loadRecentTemplates()) }
    catch { setMessage('任务已保存；最近创建模板更新失败，可稍后重试。') }
  }
  const saveEditor = () => {
    if (!editor || !editor.input.title.trim()) return
    const current = editor
    void perform(async () => {
      const task = current.task ? await taskApi.update(current.task.id, current.input) : await taskApi.create(current.input)
      const input = taskToInput(task)
      // 先确认保存成功；后续列表刷新失败时不能让用户重复创建同一个任务。
      setEditor({ task, input, original: JSON.stringify(input) }); setMessage('任务已保存。')
      await remember(current.input); await refresh()
    })
  }
  const quickCreate = () => {
    if (!parsed.title.trim() || locked) return
    const input = { ...newInput(view), ...parsed, due_date: parsed.due_date || (view === 'today' ? localDate() : null) }
    void perform(async () => {
      await taskApi.create(input); setQuick(''); setMessage('任务已创建。'); await remember(input); await refresh()
    })
  }
  const toggle = (task: Task) => {
    const wasCompleted = task.status === 'completed'
    void perform(async () => {
      await taskApi.toggle(task.id); setEditor(null); setMessage(wasCompleted ? '已撤销完成。' : task.recurrence ? '已完成，重复任务已安排。' : '任务已完成。'); await refresh()
    })
  }
  const move = (index: number, direction: -1 | 1) => {
    const other = tasks[index + direction], task = tasks[index]
    if (!other || task.is_pinned !== other.is_pinned) return
    const ids = tasks.map(item => item.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    void perform(async () => { await taskApi.reorder(ids, task.id, other.priority); await refresh(); setMessage('任务顺序已调整。') })
  }
  const confirmAction = () => {
    if (!confirm) return
    const current = confirm
    void perform(async () => {
      if (current.kind === 'delete') await taskApi.delete(current.id)
      if (current.kind === 'purge') await taskApi.purge(current.id)
      if (current.kind === 'list') await taskApi.deleteList(current.id)
      if (current.kind === 'tag') await taskApi.deleteTag(current.id)
      setConfirm(null); setEditor(null)
      if (view === `list:${current.id}` || view === `tag:${current.id}`) setView('all')
      await refresh(); setMessage(current.kind === 'delete' ? '任务已移入回收站。' : '已删除。')
    })
  }
  const importFile = async (file: File) => {
    if (file.size > MAX_TASK_IMPORT_BYTES) { setError('导入文件不能超过 8 MB，请拆分后重试。'); return }
    await perform(async () => {
      const detected = detectImportFormat(file.name)
      if (!detected) throw new Error('请选择 JSON、CSV 或 Markdown（.md）文件。')
      const result = await taskApi.importTasks(parseImportContent(await file.text(), detected))
      setMessage(`导入完成：新增 ${result.imported} 项，跳过 ${result.skipped} 项。${result.errors.length ? ` ${result.errors.slice(0, 5).join('；')}${result.errors.length > 5 ? '…' : ''}` : ''}`)
      await refresh()
    })
  }
  const exportFile = () => void perform(async () => {
    const content = await taskApi.export(format)
    const ext = format === 'markdown' ? 'md' : format
    const blob = new Blob([format === 'csv' ? `\uFEFF${content}` : content], { type: format === 'json' ? 'application/json;charset=utf-8' : format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `QuickBox-任务-${localDate()}.${ext}`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('已导出全部未删除的任务。')
  })

  return <section className="qb-tool-view qb-task" aria-label="任务管理">
    <header className="qb-task-heading"><div><span className="qb-task-eyebrow">TASKS / 任务工作台</span><h2>把接下来要做的事，安排好。</h2><p><strong>{overview.pending_today}</strong> 项今天待办{overview.overdue > 0 && <> · <span className="qb-task-overdue">{overview.overdue} 项逾期</span></>} · 今天已完成 {overview.completed_today} 项</p></div><button className="qb-tool-button qb-task-primary" disabled={!ready || locked} onClick={() => openEditor(null)}><Plus size={14} />新建任务</button></header>
    <nav className="qb-task-views" aria-label="任务视图">{views.map(({ id, label, icon: Icon }) => <button key={id} disabled={locked} className="qb-task-chip" data-active={!query.trim() && view === id || undefined} onClick={() => changeView(id)}><Icon size={13} />{label}</button>)}</nav>
    <div className="qb-task-filters"><div className="qb-task-search"><Search size={14} /><input aria-label="搜索任务" value={query} disabled={locked} onChange={e => { setQuery(e.target.value); setEditor(null); setConfirm(null) }} placeholder="搜索标题、描述、列表或标签…" /></div><select className="qb-tool-input" aria-label="筛选列表或标签" disabled={locked} value={view.startsWith('list:') || view.startsWith('tag:') ? view : ''} onChange={e => changeView(e.target.value ? e.target.value as ViewKey : 'all')}><option value="">列表 / 标签</option><optgroup label="列表">{lists.map(list => <option value={`list:${list.id}`} key={list.id}>{list.name}</option>)}</optgroup><optgroup label="标签">{tags.map(tag => <option value={`tag:${tag.id}`} key={tag.id}>#{tag.name}</option>)}</optgroup></select><button className="qb-task-icon-button" aria-label="管理列表和标签" title="管理列表和标签" data-active={management || undefined} disabled={locked} onClick={() => setManagement(!management)}><Settings2 size={16} /></button><button className="qb-task-icon-button" aria-label="导入和导出" title="导入和导出" data-active={transfer || undefined} disabled={locked} onClick={() => setTransfer(!transfer)}><Upload size={16} /></button></div>
    {management && !editor && <section className="qb-task-panel" aria-label="列表与标签管理"><div className="qb-task-section-head"><h3>列表与标签</h3><span>分类管理，不会删除任务</span></div><div className="qb-task-management-grid"><div><form onSubmit={e => { e.preventDefault(); if (!newList.trim()) return; void perform(async () => { await taskApi.createList(newList.trim()); setNewList(''); await refresh(); setMessage('列表已创建。') }) }}><input className="qb-tool-input" aria-label="新列表名称" maxLength={80} value={newList} disabled={busy} placeholder="新列表名称" onChange={e => setNewList(e.target.value)} /><button className="qb-tool-button" disabled={busy || !newList.trim()}>创建列表</button></form><div className="qb-task-managed-items">{lists.map(list => <span key={list.id}>{list.name}<button className="qb-task-icon-button" disabled={busy} aria-label={`删除列表 ${list.name}`} onClick={() => setConfirm({ kind: 'list', id: list.id, name: list.name })}><Trash2 size={12} /></button></span>)}{!lists.length && <p className="qb-task-help">用列表区分工作与生活。</p>}</div></div><div><form onSubmit={e => { e.preventDefault(); if (!newTag.trim()) return; void perform(async () => { await taskApi.createTag(newTag.trim()); setNewTag(''); await refresh(); setMessage('标签已创建。') }) }}><input className="qb-tool-input" aria-label="新标签名称" maxLength={80} value={newTag} disabled={busy} placeholder="新标签名称" onChange={e => setNewTag(e.target.value)} /><button className="qb-tool-button" disabled={busy || !newTag.trim()}>创建标签</button></form><div className="qb-task-managed-items">{tags.map(tag => <span key={tag.id}>#{tag.name}<button className="qb-task-icon-button" disabled={busy} aria-label={`删除标签 ${tag.name}`} onClick={() => setConfirm({ kind: 'tag', id: tag.id, name: tag.name })}><Trash2 size={12} /></button></span>)}{!tags.length && <p className="qb-task-help">在编辑器中为任务勾选标签。</p>}</div></div></div></section>}
    {transfer && !editor && <section className="qb-task-panel" aria-label="任务导入导出"><div className="qb-task-section-head"><h3>导入与导出</h3><span>JSON / CSV / Markdown</span></div><p className="qb-task-help">兼容原 Task 导出的 JSON；JSON 可保留列表、标签、子任务和提醒等信息，CSV / Markdown 仅支持各自文件包含的字段。导入会新增任务，不会覆盖现有数据。单文件最大 8 MB。</p><div className="qb-tool-actions"><button className="qb-tool-button" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={13} />选择导入文件</button><select className="qb-tool-input qb-task-format" aria-label="导出格式" disabled={busy} value={format} onChange={e => setFormat(e.target.value as ImportFormat)}><option value="json">JSON（完整数据）</option><option value="csv">CSV</option><option value="markdown">Markdown</option></select><button className="qb-tool-button" disabled={busy || !ready} onClick={exportFile}><Download size={13} />导出全部任务</button></div><input ref={fileInput} type="file" accept=".json,.csv,.md,.markdown,application/json,text/csv,text/markdown" className="qb-task-file-input" aria-label="导入任务文件" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importFile(file) }} /></section>}
    {confirm && <div className="qb-task-confirm" role="alertdialog" aria-label="删除确认"><strong>{confirm.kind === 'purge' ? '永久删除任务？' : confirm.kind === 'delete' ? '将任务移入回收站？' : `删除${confirm.kind === 'list' ? '列表' : '标签'}？`}</strong><p>「{confirm.name}」{confirm.kind === 'purge' ? '将无法恢复。' : confirm.kind === 'delete' ? '可在回收站恢复，或手动永久删除。' : confirm.kind === 'list' ? '中的任务会移回收集箱。' : '会从关联任务中移除，任务本身保留。'}</p><div className="qb-tool-actions"><button className="qb-tool-button qb-task-danger" disabled={busy} onClick={confirmAction}>{confirm.kind === 'purge' ? '确认永久删除' : '确认删除'}</button><button className="qb-tool-button" disabled={busy} onClick={() => setConfirm(null)}>取消</button></div></div>}
    {error && <div className="qb-task-error" role="alert">{error}</div>}
    <p className="qb-task-status" role="status">{busy ? '正在处理…' : message || (dirty ? '编辑内容尚未保存。' : '')}</p>
    {editor ? <TaskEditor task={editor.task} input={editor.input} lists={lists} tags={tags} busy={busy || !!confirm} dirty={dirty} onChange={input => setEditor({ ...editor, input })} onSave={saveEditor} onDiscard={() => { if (editor.task) { const input = taskToInput(editor.task); setEditor({ ...editor, input, original: JSON.stringify(input) }) } else setEditor(null); setError(''); setMessage('已放弃未保存的修改。') }} onClose={() => setEditor(null)} onDuplicate={() => openEditor(null, duplicateFromTask(editor.task!), true)} onDelete={() => setConfirm({ kind: 'delete', id: editor.task!.id, name: editor.task!.title })} onToggle={() => toggle(editor.task!)} onRestore={() => void perform(async () => { await taskApi.restore(editor.task!.id); setEditor(null); await refresh(); setMessage('任务已恢复。') })} onPurge={() => setConfirm({ kind: 'purge', id: editor.task!.id, name: editor.task!.title })} /> : <>
      {view !== 'trash' && view !== 'completed' && !query.trim() && <div className="qb-task-create"><form onSubmit={e => { e.preventDefault(); quickCreate() }}><Plus size={16} /><input aria-label="快速添加任务" disabled={!ready || busy} maxLength={500} value={quick} onChange={e => setQuick(e.target.value)} placeholder="快速添加，例如：明天下午三点开会" /><button className="qb-tool-button" disabled={!ready || busy || !parsed.title.trim()}>添加</button></form>{quick.trim() && <p className="qb-task-parse">{parsed.title || '请输入任务内容'}<span>{relativeDate(parsed.due_date || (view === 'today' ? localDate() : null)) || '无日期'}{parsed.due_time ? ` ${parsed.due_time}` : ''}</span></p>}{!!templates.length && <details className="qb-task-templates"><summary><ChevronDown size={12} />最近创建模板 <span>{templates.length}</span></summary><div>{templates.map(template => <button className="qb-task-chip" disabled={busy} key={template.id} onClick={() => openEditor(null, templateToInput(template), true)}>{template.title}</button>)}</div></details>}</div>}
      <div className="qb-task-section-head qb-task-list-heading"><h3>{viewTitle} <small>{tasks.length}{hasMore ? '+' : ''}</small></h3><button className="qb-task-text-button" disabled={busy || loading} onClick={() => { setLoading(true); void refresh().catch(cause => setError(errorText(cause))).finally(() => setLoading(false)) }}><RefreshCw size={12} />刷新</button></div>
      <div className="qb-task-list" aria-label="任务列表" aria-busy={loading || busy}>{tasks.map((task, index) => <article className="qb-task-row" key={task.id} data-completed={task.status === 'completed' || undefined}><button className="qb-task-complete" data-completed={task.status === 'completed' || undefined} disabled={busy || !!task.deleted_at} aria-label={`${task.status === 'completed' ? '撤销完成' : '完成'} ${task.title}`} onClick={() => toggle(task)}>{task.status === 'completed' && <Check size={13} />}</button><button className="qb-task-row-content" disabled={busy || !!task.deleted_at} onClick={() => openEditor(task)}><span className="qb-task-row-title">{task.is_pinned && <Pin size={12} />}<strong>{task.title}</strong><i className="qb-task-priority" data-priority={task.priority}>P{task.priority}</i></span><span className="qb-task-row-meta">{task.due_date && <time className={task.status !== 'completed' && task.due_date < localDate() ? 'qb-task-overdue' : ''}>{relativeDate(task.due_date)}{task.due_time ? ` ${task.due_time}` : ''}{task.recurrence ? ' · 重复' : ''}</time>}{task.list_name && <span>{task.list_name}</span>}{task.tags.slice(0, 2).map(tag => <span key={tag.id}>#{tag.name}</span>)}{!!task.subtasks.length && <span>{task.subtasks.filter(sub => sub.completed).length}/{task.subtasks.length} 子任务</span>}{!task.due_date && !task.list_name && !task.tags.length && !task.subtasks.length && <span>收集箱 · 无日期</span>}</span></button><div className="qb-task-row-actions">{task.deleted_at ? <><button className="qb-task-icon-button" title="恢复任务" aria-label={`恢复 ${task.title}`} disabled={busy} onClick={() => void perform(async () => { await taskApi.restore(task.id); await refresh(); setMessage('任务已恢复。') })}><Undo2 size={14} /></button><button className="qb-task-icon-button qb-task-danger" title="永久删除" aria-label={`永久删除 ${task.title}`} disabled={busy} onClick={() => setConfirm({ kind: 'purge', id: task.id, name: task.title })}><Trash2 size={14} /></button></> : <>{task.status !== 'completed' && !query.trim() && <><button className="qb-task-icon-button qb-task-order" aria-label={`上移 ${task.title}`} title="上移任务" disabled={busy || index === 0 || tasks[index - 1]?.is_pinned !== task.is_pinned} onClick={() => move(index, -1)}><ArrowUp size={13} /></button><button className="qb-task-icon-button qb-task-order" aria-label={`下移 ${task.title}`} title="下移任务" disabled={busy || index === tasks.length - 1 || tasks[index + 1]?.is_pinned !== task.is_pinned} onClick={() => move(index, 1)}><ArrowDown size={13} /></button></>}<button className="qb-task-icon-button" title="移入回收站" aria-label={`删除 ${task.title}`} disabled={busy} onClick={() => setConfirm({ kind: 'delete', id: task.id, name: task.title })}><Trash2 size={14} /></button></>}</div></article>)}</div>
      {!tasks.length && <div className="qb-task-empty"><ListChecks size={28} /><strong>{loading ? '正在读取任务…' : !ready ? '暂时无法读取任务' : query.trim() ? '没有匹配的任务' : view === 'trash' ? '回收站是空的' : view === 'completed' ? '完成的任务会收纳在这里' : '这里没有待办，给自己安排下一步。'}</strong><p>{!ready && !loading ? '请点击刷新重试，现有数据会保留。' : view === 'today' ? '今天包含逾期任务；没有日期的任务可在收集箱找到。' : view === 'trash' ? '删除的任务可恢复；永久删除后无法恢复。' : '使用上方视图、列表或搜索查找任务。'}</p></div>}
      {hasMore && <button className="qb-tool-button qb-task-load-more" disabled={busy || loading} onClick={() => void perform(async () => { const next = await taskApi.query({ view: query.trim() ? 'search' : view, search: query.trim() || undefined, limit: PAGE_SIZE, offset: tasks.length }); setTasks(previous => [...previous, ...next]); setHasMore(next.length === PAGE_SIZE) })}>加载更多任务</button>}
      {!!tasks.length && <p className="qb-task-help qb-task-list-note">{view === 'trash' ? '永久删除不可撤销，请先确认是否还需要这些任务。' : '置顶优先，其次按优先级排序；上下移动可调整顺序及相邻优先级。点击任务查看完整安排。'}</p>}
    </>}
  </section>
}
