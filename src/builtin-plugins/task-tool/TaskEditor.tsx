import { ArrowLeft, Copy, Plus, Save, Trash2, X } from 'lucide-react'
import type { Tag, Task, TaskInput, TaskList } from '../../core/tasks/task-types'
import { useT } from '../../i18n'

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
  const tr = useT()
  const trashed = !!task?.deleted_at
  const patch = (value: Partial<TaskInput>) => onChange({ ...input, ...value })
  const subtasks = input.subtasks ?? []
  const addSubtask = () => patch({ subtasks: [...subtasks, { id: crypto.randomUUID(), title: '', completed: false, sort_order: subtasks.length }] })
  return <section className="qb-task-editor" aria-label={tr('任务编辑器', 'Task Editor')}>
    <div className="qb-task-editor-head">
      <button className="qb-task-icon-button" title={tr('返回任务列表', 'Back to task list')} aria-label={tr('返回任务列表', 'Back to task list')} disabled={busy || dirty} onClick={onClose}><ArrowLeft size={17} /></button>
      <div>
        <h3>{trashed ? tr('回收站任务', 'Trashed Task') : task ? tr('任务详情', 'Task Details') : tr('新建任务', 'New Task')}</h3>
        <p>{trashed ? tr('恢复后可继续编辑与安排', 'Restore to edit and reschedule') : task ? task.status === 'completed' ? tr('已完成 · 可以撤销完成', 'Completed · Can mark pending') : tr('未完成', 'Pending') : tr('完善安排后保存任务', 'Fill in details and save')}</p>
      </div>
      {!trashed && <button className="qb-tool-button qb-task-primary" disabled={busy || !dirty || !input.title.trim()} onClick={onSave}><Save size={14} />{tr('保存任务', 'Save task')}</button>}
    </div>
    {dirty && <div className="qb-task-draft-notice" role="status"><span>{tr('有未保存的修改，保存或放弃后可切换。', 'You have unsaved changes. Save or discard to leave.')}</span><button className="qb-task-text-button" disabled={busy} onClick={onDiscard}>{tr('放弃修改', 'Discard changes')}</button></div>}
    <fieldset className="qb-task-editor-fields" disabled={busy || trashed}>
      <label className="qb-tool-field">{tr('任务标题', 'Title')}<input className="qb-tool-input" autoFocus maxLength={500} value={input.title} onChange={e => patch({ title: e.target.value })} placeholder={tr('要做什么？', 'What needs to be done?')} /></label>
      <label className="qb-tool-field">{tr('任务描述', 'Description')}<textarea className="qb-tool-textarea" maxLength={100000} value={input.description ?? ''} onChange={e => patch({ description: e.target.value })} placeholder={tr('补充说明、链接或执行步骤…', 'Notes, links, or steps...')} /></label>
      <div className="qb-task-fields-grid">
        <label className="qb-tool-field">{tr('所属列表', 'List')}<select className="qb-tool-input" value={input.list_id ?? ''} onChange={e => patch({ list_id: e.target.value || null })}><option value="">{tr('收集箱', 'Inbox')}</option>{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
        <label className="qb-tool-field">{tr('优先级', 'Priority')}<select className="qb-tool-input" value={input.priority ?? 4} onChange={e => patch({ priority: Number(e.target.value) })}><option value="1">{tr('P1 · 重要', 'P1 · High')}</option><option value="2">{tr('P2 · 较高', 'P2 · Medium')}</option><option value="3">{tr('P3 · 普通', 'P3 · Normal')}</option><option value="4">{tr('P4 · 不紧急', 'P4 · Low')}</option></select></label>
        <label className="qb-tool-field">{tr('截止日期', 'Due date')}<input className="qb-tool-input" type="date" value={input.due_date ?? ''} onChange={e => patch(e.target.value ? { due_date: e.target.value } : { due_date: null, due_time: null, recurrence: null, reminder_minutes: null })} /></label>
        <label className="qb-tool-field">{tr('截止时间', 'Due time')}<input className="qb-tool-input" type="time" disabled={!input.due_date} value={input.due_time ?? ''} onChange={e => patch({ due_time: e.target.value || null, ...(!e.target.value ? { reminder_minutes: null } : {}) })} /></label>
        <label className="qb-tool-field">{tr('重复规则', 'Repeat')}<select className="qb-tool-input" disabled={!input.due_date} value={input.recurrence ?? ''} onChange={e => patch({ recurrence: e.target.value || null })}><option value="">{tr('不重复', 'Never')}</option><option value="daily">{tr('每天', 'Daily')}</option><option value="weekdays">{tr('工作日', 'Weekdays')}</option><option value="weekly">{tr('每周', 'Weekly')}</option><option value="monthly">{tr('每月', 'Monthly')}</option><option value="yearly">{tr('每年', 'Yearly')}</option></select></label>
        <label className="qb-tool-field">{tr('到期提醒', 'Reminder')}<select className="qb-tool-input" disabled={!input.due_date || !input.due_time} value={input.reminder_minutes ?? ''} onChange={e => patch({ reminder_minutes: e.target.value === '' ? null : Number(e.target.value) })}><option value="">{tr('不提醒', 'None')}</option><option value="0">{tr('到期时', 'At due time')}</option><option value="5">{tr('提前 5 分钟', '5 min before')}</option><option value="10">{tr('提前 10 分钟', '10 min before')}</option><option value="15">{tr('提前 15 分钟', '15 min before')}</option><option value="30">{tr('提前 30 分钟', '30 min before')}</option><option value="60">{tr('提前 1 小时', '1 hour before')}</option><option value="1440">{tr('提前 1 天', '1 day before')}</option></select></label>
      </div>
      <p className="qb-task-help">{tr('提醒需设置日期和时间并保持 QuickBox 运行；完成重复任务后，会按规则生成下一次待办。', 'Reminders require a due date and time with QuickBox running; completing a recurring task schedules the next occurrence.')}</p>
      <label className="qb-task-check"><input type="checkbox" checked={!!input.is_pinned} onChange={e => patch({ is_pinned: e.target.checked })} />{tr('置顶此任务', 'Pin this task')}</label>
      {!!tags.length && <div className="qb-task-tag-field"><span>{tr('任务标签', 'Tags')}</span><div className="qb-task-tags">{tags.map(tag => <label className="qb-task-tag-option" key={tag.id} data-active={input.tag_ids?.includes(tag.id) || undefined}><input type="checkbox" checked={input.tag_ids?.includes(tag.id) ?? false} onChange={e => patch({ tag_ids: e.target.checked ? [...(input.tag_ids ?? []), tag.id] : input.tag_ids?.filter(id => id !== tag.id) })} />{tag.name}</label>)}</div></div>}
      <div className="qb-task-subtasks">
        <div className="qb-task-section-head"><strong>{tr('子任务', 'Subtasks')} <small>{subtasks.filter(sub => sub.completed).length}/{subtasks.length}</small></strong><button type="button" className="qb-task-text-button" onClick={addSubtask}><Plus size={13} />{tr('添加子任务', 'Add subtask')}</button></div>
        {subtasks.map((sub, index) => <div className="qb-task-subtask" key={sub.id}><input type="checkbox" aria-label={tr(`完成子任务 ${index + 1}`, `Complete subtask ${index + 1}`)} checked={sub.completed} onChange={e => patch({ subtasks: subtasks.map(item => item.id === sub.id ? { ...item, completed: e.target.checked } : item) })} /><input className="qb-tool-input" aria-label={tr(`子任务 ${index + 1}`, `Subtask ${index + 1}`)} maxLength={500} value={sub.title} onChange={e => patch({ subtasks: subtasks.map(item => item.id === sub.id ? { ...item, title: e.target.value } : item) })} placeholder={tr('下一步做什么？', 'Next step?')} /><button type="button" className="qb-task-icon-button" aria-label={tr(`移除子任务 ${index + 1}`, `Remove subtask ${index + 1}`)} onClick={() => patch({ subtasks: subtasks.filter(item => item.id !== sub.id) })}><X size={14} /></button></div>)}
      </div>
    </fieldset>
    <div className="qb-task-editor-footer">
      <div className="qb-tool-actions">
        {task && !trashed && <>
          <button className="qb-tool-button" disabled={busy || dirty} onClick={onToggle}>{task.status === 'completed' ? tr('撤销完成', 'Mark pending') : tr('标记完成', 'Complete')}</button>
          <button className="qb-tool-button" disabled={busy || dirty} onClick={onDuplicate}><Copy size={13} />{tr('复制任务', 'Duplicate')}</button>
        </>}
        {trashed && <button className="qb-tool-button" disabled={busy} onClick={onRestore}>{tr('恢复任务', 'Restore task')}</button>}
        {!dirty && <button className="qb-tool-button" disabled={busy} onClick={onClose}>{tr('返回列表', 'Back to list')}</button>}
      </div>
      {task && <button className="qb-task-text-button qb-task-danger" disabled={busy || dirty} onClick={trashed ? onPurge : onDelete}><Trash2 size={13} />{trashed ? tr('永久删除', 'Delete permanently') : tr('移入回收站', 'Move to trash')}</button>}
    </div>
  </section>
}
