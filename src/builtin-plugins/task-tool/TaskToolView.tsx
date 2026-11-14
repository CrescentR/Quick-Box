import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, Check, CheckCheck, ChevronDown, Download, Inbox, ListChecks, Pin, Plus, RefreshCw, Search, Settings2, Trash2, Undo2, Upload } from 'lucide-react'
import { taskApi } from '../../api/task-api'
import type { PluginViewProps } from '../../core/plugin/plugin-types'
import type { Overview, Tag, Task, TaskInput, TaskList, TaskTemplate, ViewKey } from '../../core/tasks/task-types'
import { localDate, parseNaturalTask, relativeDate } from '../../core/tasks/natural-date'
import { detectImportFormat, MAX_TASK_IMPORT_BYTES, parseImportContent, type ImportFormat } from '../../core/tasks/task-transfer'
import { duplicateFromTask, loadRecentTemplates, rememberTaskTemplate, templateToInput } from '../../core/tasks/task-templates'
import { lt, useLocale, useT, type ResolvedLocale } from '../../i18n'
import TaskEditor from './TaskEditor'
import './task-tool.css'

const PAGE_SIZE = 100
const views: Array<{ id: ViewKey; label: string; enLabel: string; icon: typeof Inbox }> = [
  { id: 'today', label: '今天', enLabel: 'Today', icon: CalendarDays },
  { id: 'inbox', label: '收集箱', enLabel: 'Inbox', icon: Inbox },
  { id: 'upcoming', label: '未来 30 天', enLabel: 'Next 30 days', icon: CalendarDays },
  { id: 'all', label: '全部未完', enLabel: 'All active', icon: ListChecks },
  { id: 'completed', label: '已完成', enLabel: 'Completed', icon: CheckCheck },
  { id: 'trash', label: '回收站', enLabel: 'Trash', icon: Trash2 },
]
const errorText = (cause: unknown, locale?: ResolvedLocale) =>
  cause instanceof Error
    ? cause.message
    : typeof cause === 'string'
      ? cause
      : cause && typeof cause === 'object' && 'message' in cause
        ? String(cause.message)
        : lt('操作失败，请重试。', 'Operation failed. Please try again.', locale)
const newInput = (view: ViewKey): TaskInput => ({ title: '', description: '', priority: 4, list_id: view.startsWith('list:') ? view.slice(5) : null, due_date: view === 'today' ? localDate() : null, due_time: null, reminder_minutes: null, recurrence: null, is_pinned: false, tag_ids: view.startsWith('tag:') ? [view.slice(4)] : [], subtasks: [] })
const taskToInput = (task: Task): TaskInput => ({ title: task.title, description: task.description, priority: task.priority, list_id: task.list_id, due_date: task.due_date, due_time: task.due_time, reminder_minutes: task.reminder_minutes, recurrence: task.recurrence, is_pinned: task.is_pinned, tag_ids: task.tags.map(tag => tag.id), subtasks: task.subtasks.map(({ id, title, completed, sort_order }) => ({ id, title, completed, sort_order })) })
type Confirm = { kind: 'delete' | 'purge' | 'list' | 'tag'; id: string; name: string }

export default function TaskToolView({ params }: PluginViewProps) {
  const tr = useT()
  const locale = useLocale()
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
  const matchedView = views.find(item => item.id === view)
  const viewTitle = query.trim()
    ? tr('搜索结果', 'Search Results')
    : (matchedView ? (locale === 'en-US' ? matchedView.enLabel : matchedView.label) : null)
      ?? (view.startsWith('list:') ? lists.find(list => list.id === view.slice(5))?.name : tags.find(tag => tag.id === view.slice(4))?.name)
      ?? tr('任务列表', 'Task List')

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
    // requestId 是请求序号而不是 DOM 引用，清理时递增用于作废过期请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { active = false; requestId.current++; window.clearTimeout(timer) }
  }, [refresh, query])
  useEffect(() => { void loadRecentTemplates().then(setTemplates).catch(() => {}) }, [])
  useEffect(() => {
    const taskId = typeof params?.taskId === 'string' ? params.taskId : ''
    const key = `${taskId}:${String(params?.requestId ?? '')}`
    if (!taskId || openedReminder.current === key) return
    if (dirty) { setError(tr('请先保存或放弃当前修改，再打开提醒中的任务。', 'Save or discard your current edits before opening the reminded task.')); return }
    if (busy || confirm) return
    let active = true
    void taskApi.get(taskId).then(task => {
      if (!active) return
      openedReminder.current = key
      if (!task) { setError(tr('此任务已不存在，可能已经被永久删除。', 'This task no longer exists and may have been permanently deleted.')); return }
      const input = taskToInput(task)
      setView(task.deleted_at ? 'trash' : task.status === 'completed' ? 'completed' : 'all'); setQuery(''); setConfirm(null)
      setEditor({ task, input, original: JSON.stringify(input) }); setError('')
    }).catch(cause => { if (active) setError(errorText(cause, locale)) })
    return () => { active = false }
  }, [params?.taskId, params?.requestId, dirty, busy, confirm, locale, tr])

  const perform = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await action() } catch (cause) { setError(errorText(cause, locale)) }
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
    catch { setMessage(tr('任务已保存；最近创建模板更新失败，可稍后重试。', 'Task saved, but failed to update recent templates. Try again later.')) }
  }
  const saveEditor = () => {
    if (!editor || !editor.input.title.trim()) return
    const current = editor
    void perform(async () => {
      const task = current.task ? await taskApi.update(current.task.id, current.input) : await taskApi.create(current.input)
      const input = taskToInput(task)
      // 先确认保存成功；后续列表刷新失败时不能让用户重复创建同一个任务。
      setEditor({ task, input, original: JSON.stringify(input) }); setMessage(tr('任务已保存。', 'Task saved.'))
      await remember(current.input); await refresh()
    })
  }
  const quickCreate = () => {
    if (!parsed.title.trim() || locked) return
    const input = { ...newInput(view), ...parsed, due_date: parsed.due_date || (view === 'today' ? localDate() : null) }
    void perform(async () => {
      await taskApi.create(input); setQuick(''); setMessage(tr('任务已创建。', 'Task created.')); await remember(input); await refresh()
    })
  }
  const toggle = (task: Task) => {
    const wasCompleted = task.status === 'completed'
    void perform(async () => {
      await taskApi.toggle(task.id); setEditor(null)
      setMessage(
        wasCompleted
          ? tr('已撤销完成。', 'Marked as pending.')
          : task.recurrence
            ? tr('已完成，重复任务已安排。', 'Completed; next recurrence scheduled.')
            : tr('任务已完成。', 'Task completed.'),
      )
      await refresh()
    })
  }
  const move = (index: number, direction: -1 | 1) => {
    const other = tasks[index + direction], task = tasks[index]
    if (!other || task.is_pinned !== other.is_pinned) return
    const ids = tasks.map(item => item.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    void perform(async () => { await taskApi.reorder(ids, task.id, other.priority); await refresh(); setMessage(tr('任务顺序已调整。', 'Task order updated.')) })
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
      await refresh(); setMessage(current.kind === 'delete' ? tr('任务已移入回收站。', 'Moved task to trash.') : tr('已删除。', 'Deleted.'))
    })
  }
  const importFile = async (file: File) => {
    if (file.size > MAX_TASK_IMPORT_BYTES) { setError(tr('导入文件不能超过 8 MB，请拆分后重试。', 'Import file cannot exceed 8 MB. Split it and try again.')); return }
    await perform(async () => {
      const detected = detectImportFormat(file.name)
      if (!detected) throw new Error(tr('请选择 JSON、CSV 或 Markdown（.md）文件。', 'Please choose a JSON, CSV, or Markdown (.md) file.'))
      const result = await taskApi.importTasks(parseImportContent(await file.text(), detected))
      const errSep = locale === 'en-US' ? '; ' : '；'
      setMessage(
        tr(
          `导入完成：新增 ${result.imported} 项，跳过 ${result.skipped} 项。${result.errors.length ? ` ${result.errors.slice(0, 5).join(errSep)}${result.errors.length > 5 ? '…' : ''}` : ''}`,
          `Import complete: ${result.imported} added, ${result.skipped} skipped.${result.errors.length ? ` ${result.errors.slice(0, 5).join(errSep)}${result.errors.length > 5 ? '...' : ''}` : ''}`,
        ),
      )
      await refresh()
    })
  }
  const exportFile = () => void perform(async () => {
    const content = await taskApi.export(format)
    const ext = format === 'markdown' ? 'md' : format
    const blob = new Blob([format === 'csv' ? `\uFEFF${content}` : content], { type: format === 'json' ? 'application/json;charset=utf-8' : format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `${tr('QuickBox-任务', 'QuickBox-Tasks')}-${localDate()}.${ext}`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage(tr('已导出全部未删除的任务。', 'Exported all active tasks.'))
  })

  return <section className="qb-tool-view qb-task" aria-label={tr('任务管理', 'Task Manager')}>
    <header className="qb-task-heading">
      <div>
        <span className="qb-task-eyebrow">{tr('TASKS / 任务工作台', 'TASKS / WORKSPACE')}</span>
        <h2>{tr('把接下来要做的事，安排好。', 'Plan what matters next.')}</h2>
        <p>
          <strong>{overview.pending_today}</strong> {tr('项今天待办', 'due today')}
          {overview.overdue > 0 && <> · <span className="qb-task-overdue">{tr(`${overview.overdue} 项逾期`, `${overview.overdue} overdue`)}</span></>}
          {' · '}
          {tr(`今天已完成 ${overview.completed_today} 项`, `${overview.completed_today} completed today`)}
        </p>
      </div>
      <button className="qb-tool-button qb-task-primary" disabled={!ready || locked} onClick={() => openEditor(null)}>
        <Plus size={14} />{tr('新建任务', 'New task')}
      </button>
    </header>
    <nav className="qb-task-views" aria-label={tr('任务视图', 'Task views')}>
      {views.map(({ id, label, enLabel, icon: Icon }) => (
        <button key={id} disabled={locked} className="qb-task-chip" data-active={!query.trim() && view === id || undefined} onClick={() => changeView(id)}>
          <Icon size={13} />{locale === 'en-US' ? enLabel : label}
        </button>
      ))}
    </nav>
    <div className="qb-task-filters">
      <div className="qb-task-search">
        <Search size={14} />
        <input aria-label={tr('搜索任务', 'Search tasks')} value={query} disabled={locked} onChange={e => { setQuery(e.target.value); setEditor(null); setConfirm(null) }} placeholder={tr('搜索标题、描述、列表或标签…', 'Search title, description, list, or tag...')} />
      </div>
      <select className="qb-tool-input" aria-label={tr('筛选列表或标签', 'Filter list or tag')} disabled={locked} value={view.startsWith('list:') || view.startsWith('tag:') ? view : ''} onChange={e => changeView(e.target.value ? e.target.value as ViewKey : 'all')}>
        <option value="">{tr('列表 / 标签', 'Lists / Tags')}</option>
        <optgroup label={tr('列表', 'Lists')}>{lists.map(list => <option value={`list:${list.id}`} key={list.id}>{list.name}</option>)}</optgroup>
        <optgroup label={tr('标签', 'Tags')}>{tags.map(tag => <option value={`tag:${tag.id}`} key={tag.id}>#{tag.name}</option>)}</optgroup>
      </select>
      <button className="qb-task-icon-button" aria-label={tr('管理列表和标签', 'Manage lists and tags')} title={tr('管理列表和标签', 'Manage lists and tags')} data-active={management || undefined} disabled={locked} onClick={() => setManagement(!management)}><Settings2 size={16} /></button>
      <button className="qb-task-icon-button" aria-label={tr('导入和导出', 'Import & Export')} title={tr('导入和导出', 'Import & Export')} data-active={transfer || undefined} disabled={locked} onClick={() => setTransfer(!transfer)}><Upload size={16} /></button>
    </div>
    {management && !editor && <section className="qb-task-panel" aria-label={tr('列表与标签管理', 'Manage lists & tags')}>
      <div className="qb-task-section-head"><h3>{tr('列表与标签', 'Lists & Tags')}</h3><span>{tr('分类管理，不会删除任务', 'Deleting a list or tag keeps tasks intact')}</span></div>
      <div className="qb-task-management-grid">
        <div>
          <form onSubmit={e => { e.preventDefault(); if (!newList.trim()) return; void perform(async () => { await taskApi.createList(newList.trim()); setNewList(''); await refresh(); setMessage(tr('列表已创建。', 'List created.')) }) }}>
            <input className="qb-tool-input" aria-label={tr('新列表名称', 'New list name')} maxLength={80} value={newList} disabled={busy} placeholder={tr('新列表名称', 'New list name')} onChange={e => setNewList(e.target.value)} />
            <button className="qb-tool-button" disabled={busy || !newList.trim()}>{tr('创建列表', 'Create list')}</button>
          </form>
          <div className="qb-task-managed-items">
            {lists.map(list => <span key={list.id}>{list.name}<button className="qb-task-icon-button" disabled={busy} aria-label={tr(`删除列表 ${list.name}`, `Delete list ${list.name}`)} onClick={() => setConfirm({ kind: 'list', id: list.id, name: list.name })}><Trash2 size={12} /></button></span>)}
            {!lists.length && <p className="qb-task-help">{tr('用列表区分工作与生活。', 'Use lists to separate work and personal tasks.')}</p>}
          </div>
        </div>
        <div>
          <form onSubmit={e => { e.preventDefault(); if (!newTag.trim()) return; void perform(async () => { await taskApi.createTag(newTag.trim()); setNewTag(''); await refresh(); setMessage(tr('标签已创建。', 'Tag created.')) }) }}>
            <input className="qb-tool-input" aria-label={tr('新标签名称', 'New tag name')} maxLength={80} value={newTag} disabled={busy} placeholder={tr('新标签名称', 'New tag name')} onChange={e => setNewTag(e.target.value)} />
            <button className="qb-tool-button" disabled={busy || !newTag.trim()}>{tr('创建标签', 'Create tag')}</button>
          </form>
          <div className="qb-task-managed-items">
            {tags.map(tag => <span key={tag.id}>#{tag.name}<button className="qb-task-icon-button" disabled={busy} aria-label={tr(`删除标签 ${tag.name}`, `Delete tag ${tag.name}`)} onClick={() => setConfirm({ kind: 'tag', id: tag.id, name: tag.name })}><Trash2 size={12} /></button></span>)}
            {!tags.length && <p className="qb-task-help">{tr('在编辑器中为任务勾选标签。', 'Attach tags to tasks in the editor.')}</p>}
          </div>
        </div>
      </div>
    </section>}
    {transfer && !editor && <section className="qb-task-panel" aria-label={tr('任务导入导出', 'Import & Export tasks')}>
      <div className="qb-task-section-head"><h3>{tr('导入与导出', 'Import & Export')}</h3><span>JSON / CSV / Markdown</span></div>
      <p className="qb-task-help">{tr('兼容原 Task 导出的 JSON；JSON 可保留列表、标签、子任务和提醒等信息，CSV / Markdown 仅支持各自文件包含的字段。导入会新增任务，不会覆盖现有数据。单文件最大 8 MB。', 'Supports legacy Task JSON exports preserving lists, tags, subtasks, and reminders. CSV / Markdown import the fields present in those formats. Imports add tasks without overwriting existing data. Max 8 MB per file.')}</p>
      <div className="qb-tool-actions">
        <button className="qb-tool-button" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={13} />{tr('选择导入文件', 'Import file')}</button>
        <select className="qb-tool-input qb-task-format" aria-label={tr('导出格式', 'Export format')} disabled={busy} value={format} onChange={e => setFormat(e.target.value as ImportFormat)}>
          <option value="json">{tr('JSON（完整数据）', 'JSON (full data)')}</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
        <button className="qb-tool-button" disabled={busy || !ready} onClick={exportFile}><Download size={13} />{tr('导出全部任务', 'Export all tasks')}</button>
      </div>
      <input ref={fileInput} type="file" accept=".json,.csv,.md,.markdown,application/json,text/csv,text/markdown" className="qb-task-file-input" aria-label={tr('导入任务文件', 'Import task file')} disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importFile(file) }} />
    </section>}
    {confirm && <div className="qb-task-confirm" role="alertdialog" aria-label={tr('删除确认', 'Confirm delete')}>
      <strong>
        {confirm.kind === 'purge'
          ? tr('永久删除任务？', 'Permanently delete task?')
          : confirm.kind === 'delete'
            ? tr('将任务移入回收站？', 'Move task to trash?')
            : confirm.kind === 'list'
              ? tr('删除列表？', 'Delete list?')
              : tr('删除标签？', 'Delete tag?')}
      </strong>
      <p>
        {tr(`「${confirm.name}」`, `"${confirm.name}" `)}
        {confirm.kind === 'purge'
          ? tr('将无法恢复。', 'cannot be recovered.')
          : confirm.kind === 'delete'
            ? tr('可在回收站恢复，或手动永久删除。', 'can be restored from Trash or purged later.')
            : confirm.kind === 'list'
              ? tr('中的任务会移回收集箱。', 'tasks will be moved back to Inbox.')
              : tr('会从关联任务中移除，任务本身保留。', 'will be removed from tasks; the tasks themselves are kept.')}
      </p>
      <div className="qb-tool-actions">
        <button className="qb-tool-button qb-task-danger" disabled={busy} onClick={confirmAction}>{confirm.kind === 'purge' ? tr('确认永久删除', 'Delete permanently') : tr('确认删除', 'Confirm delete')}</button>
        <button className="qb-tool-button" disabled={busy} onClick={() => setConfirm(null)}>{tr('取消', 'Cancel')}</button>
      </div>
    </div>}
    {error && <div className="qb-task-error" role="alert">{error}</div>}
    <p className="qb-task-status" role="status">{busy ? tr('正在处理…', 'Working...') : message || (dirty ? tr('编辑内容尚未保存。', 'You have unsaved changes.') : '')}</p>
    {editor ? <TaskEditor
      task={editor.task}
      input={editor.input}
      lists={lists}
      tags={tags}
      busy={busy || !!confirm}
      dirty={dirty}
      onChange={input => setEditor({ ...editor, input })}
      onSave={saveEditor}
      onDiscard={() => {
        if (editor.task) { const input = taskToInput(editor.task); setEditor({ ...editor, input, original: JSON.stringify(input) }) }
        else setEditor(null)
        setError(''); setMessage(tr('已放弃未保存的修改。', 'Discarded unsaved changes.'))
      }}
      onClose={() => setEditor(null)}
      onDuplicate={() => openEditor(null, duplicateFromTask(editor.task!), true)}
      onDelete={() => setConfirm({ kind: 'delete', id: editor.task!.id, name: editor.task!.title })}
      onToggle={() => toggle(editor.task!)}
      onRestore={() => void perform(async () => { await taskApi.restore(editor.task!.id); setEditor(null); await refresh(); setMessage(tr('任务已恢复。', 'Task restored.')) })}
      onPurge={() => setConfirm({ kind: 'purge', id: editor.task!.id, name: editor.task!.title })}
    /> : <>
      {view !== 'trash' && view !== 'completed' && !query.trim() && <div className="qb-task-create">
        <form onSubmit={e => { e.preventDefault(); quickCreate() }}>
          <Plus size={16} />
          <input aria-label={tr('快速添加任务', 'Quick add task')} disabled={!ready || busy} maxLength={500} value={quick} onChange={e => setQuick(e.target.value)} placeholder={tr('快速添加，例如：明天下午三点开会', 'Quick add, e.g. 明天下午三点开会 or meeting 15:00')} />
          <button className="qb-tool-button" disabled={!ready || busy || !parsed.title.trim()}>{tr('添加', 'Add')}</button>
        </form>
        {quick.trim() && <p className="qb-task-parse">{parsed.title || tr('请输入任务内容', 'Enter a task title')}<span>{relativeDate(parsed.due_date || (view === 'today' ? localDate() : null), new Date(), locale) || tr('无日期', 'No date')}{parsed.due_time ? ` ${parsed.due_time}` : ''}</span></p>}
        {!!templates.length && <details className="qb-task-templates"><summary><ChevronDown size={12} />{tr('最近创建模板', 'Recent templates')} <span>{templates.length}</span></summary><div>{templates.map(template => <button className="qb-task-chip" disabled={busy} key={template.id} onClick={() => openEditor(null, templateToInput(template), true)}>{template.title}</button>)}</div></details>}
      </div>}
      <div className="qb-task-section-head qb-task-list-heading">
        <h3>{viewTitle} <small>{tasks.length}{hasMore ? '+' : ''}</small></h3>
        <button className="qb-task-text-button" disabled={busy || loading} onClick={() => { setLoading(true); void refresh().catch(cause => setError(errorText(cause, locale))).finally(() => setLoading(false)) }}><RefreshCw size={12} />{tr('刷新', 'Refresh')}</button>
      </div>
      <div className="qb-task-list" aria-label={tr('任务列表', 'Task list')} aria-busy={loading || busy}>
        {tasks.map((task, index) => <article className="qb-task-row" key={task.id} data-completed={task.status === 'completed' || undefined}>
          <button className="qb-task-complete" data-completed={task.status === 'completed' || undefined} disabled={busy || !!task.deleted_at} aria-label={`${task.status === 'completed' ? tr('撤销完成', 'Undo complete') : tr('完成', 'Complete')} ${task.title}`} onClick={() => toggle(task)}>{task.status === 'completed' && <Check size={13} />}</button>
          <button className="qb-task-row-content" disabled={busy || !!task.deleted_at} onClick={() => openEditor(task)}>
            <span className="qb-task-row-title">{task.is_pinned && <Pin size={12} />}<strong>{task.title}</strong><i className="qb-task-priority" data-priority={task.priority}>P{task.priority}</i></span>
            <span className="qb-task-row-meta">
              {task.due_date && <time className={task.status !== 'completed' && task.due_date < localDate() ? 'qb-task-overdue' : ''}>{relativeDate(task.due_date, new Date(), locale)}{task.due_time ? ` ${task.due_time}` : ''}{task.recurrence ? tr(' · 重复', ' · Recurring') : ''}</time>}
              {task.list_name && <span>{task.list_name}</span>}
              {task.tags.slice(0, 2).map(tag => <span key={tag.id}>#{tag.name}</span>)}
              {!!task.subtasks.length && <span>{tr(`${task.subtasks.filter(sub => sub.completed).length}/${task.subtasks.length} 子任务`, `${task.subtasks.filter(sub => sub.completed).length}/${task.subtasks.length} subtasks`)}</span>}
              {!task.due_date && !task.list_name && !task.tags.length && !task.subtasks.length && <span>{tr('收集箱 · 无日期', 'Inbox · No date')}</span>}
            </span>
          </button>
          <div className="qb-task-row-actions">
            {task.deleted_at ? <>
              <button className="qb-task-icon-button" title={tr('恢复任务', 'Restore task')} aria-label={tr(`恢复 ${task.title}`, `Restore ${task.title}`)} disabled={busy} onClick={() => void perform(async () => { await taskApi.restore(task.id); await refresh(); setMessage(tr('任务已恢复。', 'Task restored.')) })}><Undo2 size={14} /></button>
              <button className="qb-task-icon-button qb-task-danger" title={tr('永久删除', 'Delete permanently')} aria-label={tr(`永久删除 ${task.title}`, `Delete permanently ${task.title}`)} disabled={busy} onClick={() => setConfirm({ kind: 'purge', id: task.id, name: task.title })}><Trash2 size={14} /></button>
            </> : <>
              {task.status !== 'completed' && !query.trim() && <>
                <button className="qb-task-icon-button qb-task-order" aria-label={tr(`上移 ${task.title}`, `Move up ${task.title}`)} title={tr('上移任务', 'Move up')} disabled={busy || index === 0 || tasks[index - 1]?.is_pinned !== task.is_pinned} onClick={() => move(index, -1)}><ArrowUp size={13} /></button>
                <button className="qb-task-icon-button qb-task-order" aria-label={tr(`下移 ${task.title}`, `Move down ${task.title}`)} title={tr('下移任务', 'Move down')} disabled={busy || index === tasks.length - 1 || tasks[index + 1]?.is_pinned !== task.is_pinned} onClick={() => move(index, 1)}><ArrowDown size={13} /></button>
              </>}
              <button className="qb-task-icon-button" title={tr('移入回收站', 'Move to trash')} aria-label={tr(`删除 ${task.title}`, `Delete ${task.title}`)} disabled={busy} onClick={() => setConfirm({ kind: 'delete', id: task.id, name: task.title })}><Trash2 size={14} /></button>
            </>}
          </div>
        </article>)}
      </div>
      {!tasks.length && <div className="qb-task-empty">
        <ListChecks size={28} />
        <strong>
          {loading
            ? tr('正在读取任务…', 'Loading tasks...')
            : !ready
              ? tr('暂时无法读取任务', 'Unable to load tasks')
              : query.trim()
                ? tr('没有匹配的任务', 'No matching tasks')
                : view === 'trash'
                  ? tr('回收站是空的', 'Trash is empty')
                  : view === 'completed'
                    ? tr('完成的任务会收纳在这里', 'Completed tasks appear here')
                    : tr('这里没有待办，给自己安排下一步。', 'Nothing pending here — plan your next step.')}
        </strong>
        <p>
          {!ready && !loading
            ? tr('请点击刷新重试，现有数据会保留。', 'Click Refresh to retry; your existing data is preserved.')
            : view === 'today'
              ? tr('今天包含逾期任务；没有日期的任务可在收集箱找到。', 'Today includes overdue tasks; undated tasks live in Inbox.')
              : view === 'trash'
                ? tr('删除的任务可恢复；永久删除后无法恢复。', 'Deleted tasks can be restored; permanently deleted tasks cannot.')
                : tr('使用上方视图、列表或搜索查找任务。', 'Use the views, lists, or search bar above to filter tasks.')}
        </p>
      </div>}
      {hasMore && <button className="qb-tool-button qb-task-load-more" disabled={busy || loading} onClick={() => void perform(async () => { const next = await taskApi.query({ view: query.trim() ? 'search' : view, search: query.trim() || undefined, limit: PAGE_SIZE, offset: tasks.length }); setTasks(previous => [...previous, ...next]); setHasMore(next.length === PAGE_SIZE) })}>{tr('加载更多任务', 'Load more tasks')}</button>}
      {!!tasks.length && <p className="qb-task-help qb-task-list-note">{view === 'trash' ? tr('永久删除不可撤销，请先确认是否还需要这些任务。', 'Permanent deletion cannot be undone.') : tr('置顶优先，其次按优先级排序；上下移动可调整顺序及相邻优先级。点击任务查看完整安排。', 'Pinned first, then sorted by priority. Move tasks up or down to reorder and adjust adjacent priority.')}</p>}
    </>}
  </section>
}
