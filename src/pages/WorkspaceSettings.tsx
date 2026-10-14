import { useState } from 'react'
import { useWorkspaceStore } from '../stores/workspace-store'
import { createBackup, mergeWorkspace, readBackup, type WorkspaceData } from '../core/workspace/workspace-data'
import { clearToolDrafts } from '../core/tool/tool-context'

export default function WorkspaceSettings() {
  const { data, ready, saving, error, update, hydrate } = useWorkspaceStore()
  const [pending, setPending] = useState<WorkspaceData>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (cause) { setMessage(cause instanceof Error ? cause.message : '操作失败，原数据已保留') }
    finally { setBusy(false) }
  }
  const conflicts = pending?.snippets.filter((item) => data.snippets.some((current) => current.id === item.id)) ?? []
  return <section className="qb-page-card">
    <h2 className="qb-page-card__title">个人工作台</h2>
    <p>常用工具、工具预设与代码片段保存在本机。备份不包含剪贴板历史和工具草稿；请勿在片段中保存密钥。</p>
    <label className="qb-page-toggle">
      <span>呼出时推荐剪贴板工具（仅识别，不记录历史）</span>
      <input type="checkbox" disabled={!ready || saving || busy} checked={data.clipboardSuggestions} onChange={(event) => {
        const checked = event.target.checked
        void perform(() => update((current) => ({ ...current, clipboardSuggestions: checked })))
      }} />
    </label>
    <div className="qb-tool-actions">
      <button className="qb-tool-button" disabled={!ready || saving || busy} onClick={() => void perform(async () => {
        const text = await createBackup(data)
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `QuickBox-workspace-${new Date().toISOString().slice(0, 10)}.json`; anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setMessage('工作台备份已导出。')
      })}>导出工作台备份</button>
      <label className="qb-tool-button">选择备份文件
        <input aria-label="选择备份文件" type="file" accept=".json,application/json" disabled={!ready || saving || busy} onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = ''; setPending(undefined)
          if (file) void perform(async () => { if (file.size > 4_000_000) throw new Error('备份文件过大'); setPending(await readBackup(await file.text())) })
        }} />
      </label>
      <button className="qb-tool-button" onClick={() => { clearToolDrafts(); setMessage('已清除内存草稿；当前打开工具中的内容会在继续编辑时重新生成草稿。') }}>清除内存草稿</button>
      {!ready && <button className="qb-tool-button" disabled={busy} onClick={() => void perform(hydrate)}>重试读取</button>}
    </div>
    {pending && <div className="qb-workspace-import" role="region" aria-label="备份导入预览">
      <h3>导入预览</h3>
      <p>{pending.snippets.length} 条片段、{pending.quickCommandIds.length} 个常用工具、{Object.keys(pending.presets).length} 个预设。</p>
      <p>同 ID 片段冲突 {conflicts.length} 条{conflicts.length ? `：${conflicts.map((item) => item.title).join('、')}` : ''}。合并时使用备份中的冲突片段和预设，保留其他现有数据；替换会移除备份中没有的工作台内容。</p>
      <div className="qb-tool-actions">
        <button className="qb-tool-button" disabled={saving || busy} onClick={() => void perform(async () => { await update((current) => mergeWorkspace(current, pending)); setPending(undefined); setMessage('已合并备份。') })}>合并并导入</button>
        <button className="qb-tool-button" disabled={saving || busy} onClick={() => void perform(async () => { await update(() => pending); setPending(undefined); setMessage('工作台已替换为备份内容。') })}>确认替换工作台</button>
        <button className="qb-tool-button" disabled={busy} onClick={() => setPending(undefined)}>取消</button>
      </div>
    </div>}
    {(message || error) && <p role="status">{message || error}</p>}
  </section>
}
