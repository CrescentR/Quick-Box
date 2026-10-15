import { ArrowLeft, Copy, Plus, Save, Trash2, X } from 'lucide-react'
import type { Tag, Task, TaskInput, TaskList } from '../../core/tasks/task-types'

interface Props {
  task: Task | null
  input: TaskInput
  lists: TaskList[]
  tags: Tag[]
  busy: boolean
  dirty: boolean
  onChange: (input: TaskInput) => void
  onSave: () => void
  onDiscard: () => void
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggle: () => void
  onRestore: () => void
  onPurge: () => void
}

export default function TaskEditor({ task, input, lists, tags, busy, dirty, onChange, onSave, onDiscard, onClose, onDuplicate, onDelete, onToggle, onRestore, onPurge }: Props) {
  const trashed = !!task?.deleted_at
  const patch = (value: Partial<TaskInput>) => onChange({ ...input, ...value })
  const subtasks = input.subtasks ?? []
  const addSubtask = () => patch({ subtasks: [...subtasks, { id: crypto.randomUUID(), title: '', completed: false, sort_order: subtasks.length }] })
  return <section className="qb-task-editor" aria-label="任务编辑器">
    <div className="qb-task-editor-head">
      <button className="qb-task-icon-button" title="返回任务列表" aria-label="返回任务列表" disabled={busy || dirty} onClick={onClose}><ArrowLeft size={17} /></button>
      <div><h3>{trashed ? '回收站任务' : task ? '任务详情' : '新建任务'}</h3><p>{trashed ? '恢复后可继续编辑与安排' : task ? task.status === 'completed' ? '已完成 · 可以撤销完成' : '未完成' : '完善安排后保存任务'}</p></div>
      {!trashed && <button className="qb-tool-button qb-task-primary" disabled={busy || !dirty || !input.title.trim()} onClick={onSave}><Save size={14} />保存任务</button>}
    </div>
    {dirty && <div className="qb-task-draft-notice" role="status"><span>有未保存的修改，保存或放弃后可切换。</span><button className="qb-task-text-button" disabled={busy} onClick={onDiscard}>放弃修改</button></div>}
    <fieldset className="qb-task-editor-fields" disabled={busy || trashed}>
      <label className="qb-tool-field">任务标题<input className="qb-tool-input" autoFocus maxLength={500} value={input.title} onChange={e => patch({ title: e.target.value })} placeholder="要做什么？" /></label>
      <label className="qb-tool-field">任务描述<textarea className="qb-tool-textarea" maxLength={100000} value={input.description ?? ''} onChange={e => patch({ description: e.target.value })} placeholder="补充说明、链接或执行步骤…" /></label>
      <div className="qb-task-fields-grid">
        <label className="qb-tool-field">所属列表<select className="qb-tool-input" value={input.list_id ?? ''} onChange={e => patch({ list_id: e.target.value || null })}><option value="">收集箱</option>{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
        <label className="qb-tool-field">优先级<select className="qb-tool-input" value={input.priority ?? 4} onChange={e => patch({ priority: Number(e.target.value) })}><option value="1">P1 · 重要</option><option value="2">P2 · 较高</option><option value="3">P3 · 普通</option><option value="4">P4 · 不紧急</option></select></label>
        <label className="qb-tool-field">截止日期<input className="qb-tool-input" type="date" value={input.due_date ?? ''} onChange={e => patch(e.target.value ? { due_date: e.target.value } : { due_date: null, due_time: null, recurrence: null, reminder_minutes: null })} /></label>
        <label className="qb-tool-field">截止时间<input className="qb-tool-input" type="time" disabled={!input.due_date} value={input.due_time ?? ''} onChange={e => patch({ due_time: e.target.value || null, ...(!e.target.value ? { reminder_minutes: null } : {}) })} /></label>
        <label className="qb-tool-field">重复规则<select className="qb-tool-input" disabled={!input.due_date} value={input.recurrence ?? ''} onChange={e => patch({ recurrence: e.target.value || null })}><option value="">不重复</option><option value="daily">每天</option><option value="weekdays">工作日</option><option value="weekly">每周</option><option value="monthly">每月</option><option value="yearly">每年</option></select></label>
        <label className="qb-tool-field">到期提醒<select className="qb-tool-input" disabled={!input.due_date || !input.due_time} value={input.reminder_minutes ?? ''} onChange={e => patch({ reminder_minutes: e.target.value === '' ? null : Number(e.target.value) })}><option value="">不提醒</option><option value="0">到期时</option><option value="5">提前 5 分钟</option><option value="10">提前 10 分钟</option><option value="15">提前 15 分钟</option><option value="30">提前 30 分钟</option><option value="60">提前 1 小时</option><option value="1440">提前 1 天</option></select></label>
      </div>
      <p className="qb-task-help">提醒需设置日期和时间并保持 QuickBox 运行；完成重复任务后，会按规则生成下一次待办。</p>
      <label className="qb-task-check"><input type="checkbox" checked={!!input.is_pinned} onChange={e => patch({ is_pinned: e.target.checked })} />置顶此任务</label>
      {!!tags.length && <div className="qb-task-tag-field"><span>任务标签</span><div className="qb-task-tags">{tags.map(tag => <label className="qb-task-tag-option" key={tag.id} data-active={input.tag_ids?.includes(tag.id) || undefined}><input type="checkbox" checked={input.tag_ids?.includes(tag.id) ?? false} onChange={e => patch({ tag_ids: e.target.checked ? [...(input.tag_ids ?? []), tag.id] : input.tag_ids?.filter(id => id !== tag.id) })} />{tag.name}</label>)}</div></div>}
      <div className="qb-task-subtasks">
        <div className="qb-task-section-head"><strong>子任务 <small>{subtasks.filter(sub => sub.completed).length}/{subtasks.length}</small></strong><button type="button" className="qb-task-text-button" onClick={addSubtask}><Plus size={13} />添加子任务</button></div>
        {subtasks.map((sub, index) => <div className="qb-task-subtask" key={sub.id}><input type="checkbox" aria-label={`完成子任务 ${index + 1}`} checked={sub.completed} onChange={e => patch({ subtasks: subtasks.map(item => item.id === sub.id ? { ...item, completed: e.target.checked } : item) })} /><input className="qb-tool-input" aria-label={`子任务 ${index + 1}`} maxLength={500} value={sub.title} onChange={e => patch({ subtasks: subtasks.map(item => item.id === sub.id ? { ...item, title: e.target.value } : item) })} placeholder="下一步做什么？" /><button type="button" className="qb-task-icon-button" aria-label={`移除子任务 ${index + 1}`} onClick={() => patch({ subtasks: subtasks.filter(item => item.id !== sub.id) })}><X size={14} /></button></div>)}
      </div>
    </fieldset>
    <div className="qb-task-editor-footer">
      <div className="qb-tool-actions">{task && !trashed && <><button className="qb-tool-button" disabled={busy || dirty} onClick={onToggle}>{task.status === 'completed' ? '撤销完成' : '标记完成'}</button><button className="qb-tool-button" disabled={busy || dirty} onClick={onDuplicate}><Copy size={13} />复制任务</button></>}{trashed && <button className="qb-tool-button" disabled={busy} onClick={onRestore}>恢复任务</button>}{!dirty && <button className="qb-tool-button" disabled={busy} onClick={onClose}>返回列表</button>}</div>
      {task && <button className="qb-task-text-button qb-task-danger" disabled={busy || dirty} onClick={trashed ? onPurge : onDelete}><Trash2 size={13} />{trashed ? '永久删除' : '移入回收站'}</button>}
    </div>
  </section>
}
