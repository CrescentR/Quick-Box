import { useState } from 'react'
import { useWorkspaceStore } from '../stores/workspace-store'
import { clearToolDrafts } from '../core/tool/tool-context'
import { createBackup, mergeWorkspace, readBackup, type WorkspaceData } from '../core/workspace/workspace-data'
import BackupSettings from './BackupSettings'
import { libraryError } from '../api/library-api'
import { useT } from '../i18n'

export default function WorkspaceSettings() {
  const tr = useT()
  const { data, ready, saving, error, update, hydrate } = useWorkspaceStore()
  const [pending, setPending] = useState<WorkspaceData>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const perform = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try {
      await action()
    } catch (cause) {
      setMessage(libraryError(cause))
    } finally {
      setBusy(false)
    }
  }

  const conflicts = pending?.snippets.filter((item) => data.snippets.some((current) => current.id === item.id)) ?? []

  return (
    <>
      <BackupSettings />
      <section className="qb-page-card">
        <h2 className="qb-page-card__title">{tr('工作台偏好', 'Workspace Preferences')}</h2>
        <p>{tr('常用置顶、工具预设与本地代码片段保存在本机。偏好备份不包含剪贴板历史、任务和内存草稿。', 'Pinned tools, presets, and local snippets are stored locally. Preference backups do not include clipboard history, tasks, or in-memory drafts.')}</p>
        <label className="qb-page-toggle">
          <span>{tr('呼出时推荐剪贴板工具（仅识别，不记录历史）', 'Suggest tools for clipboard content on open (inspection only, no history logged)')}</span>
          <input
            className="qb-page-checkbox"
            type="checkbox"
            disabled={!ready || saving || busy}
            checked={data.clipboardSuggestions}
            onChange={(event) => {
              const checked = event.target.checked
              void perform(() => update((current) => ({ ...current, clipboardSuggestions: checked })))
            }}
          />
        </label>
        <div className="qb-tool-actions">
          <button
            type="button"
            className="qb-tool-button"
            disabled={!ready || saving || busy}
            onClick={() =>
              void perform(async () => {
                const text = await createBackup(data)
                const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = `QuickBox-workspace-${new Date().toISOString().slice(0, 10)}.json`
                anchor.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
                setMessage(tr('工作台偏好备份已导出。', 'Workspace preferences exported.'))
              })
            }
          >
            {tr('导出工作台偏好', 'Export Preferences')}
          </button>
          <label className="qb-tool-button">
            {tr('导入工作台偏好', 'Import Preferences')}
            <input
              aria-label={tr('选择工作台偏好备份文件', 'Select workspace backup file')}
              type="file"
              accept=".json,application/json"
              hidden
              disabled={!ready || saving || busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                setPending(undefined)
                if (file) {
                  void perform(async () => {
                    if (file.size > 4_000_000) throw new Error(tr('备份文件过大', 'Backup file is too large'))
                    setPending(await readBackup(await file.text()))
                  })
                }
              }}
            />
          </label>
          <button
            type="button"
            className="qb-tool-button"
            onClick={() => {
              clearToolDrafts()
              setMessage(tr('已清除内存草稿。', 'In-memory tool drafts cleared.'))
            }}
          >
            {tr('清除内存草稿', 'Clear Drafts')}
          </button>
          {!ready && (
            <button
              type="button"
              className="qb-tool-button"
              disabled={saving || busy}
              onClick={() => void perform(hydrate)}
            >
              {tr('重试读取工作台', 'Retry Loading Workspace')}
            </button>
          )}
        </div>
        {pending && (
          <div className="qb-backup-confirm" role="region" aria-label={tr('工作台备份导入预览', 'Workspace backup import preview')}>
            <p>
              <strong>{tr('导入预览：', 'Import preview: ')}</strong>
              {tr(
                `${pending.snippets.length} 条代码片段、${pending.quickCommandIds.length} 个常用置顶、${Object.keys(pending.presets).length} 个工具预设。`,
                `${pending.snippets.length} snippets, ${pending.quickCommandIds.length} pinned tools, ${Object.keys(pending.presets).length} presets.`,
              )}
            </p>
            <p>
              {tr(
                `同 ID 片段冲突 ${conflicts.length} 条${conflicts.length ? `（${conflicts.map((item) => item.title).join('、')}）` : ''}。合并会保留其他现有内容并覆盖同 ID 冲突项；替换则会用备份内容整体覆盖当前工作台。`,
                `${conflicts.length} snippet ID conflict(s)${conflicts.length ? ` (${conflicts.map((item) => item.title).join(', ')})` : ''}. Merge keeps existing items and overwrites matching IDs; Replace overwrites the entire workspace.`,
              )}
            </p>
            <div className="qb-tool-actions">
              <button
                type="button"
                className="qb-tool-button"
                disabled={saving || busy}
                onClick={() =>
                  void perform(async () => {
                    await update((current) => mergeWorkspace(current, pending))
                    setPending(undefined)
                    setMessage(tr('已合并工作台偏好备份。', 'Workspace preferences merged.'))
                  })
                }
              >
                {tr('合并并导入', 'Merge & Import')}
              </button>
              <button
                type="button"
                className="qb-tool-button"
                disabled={saving || busy}
                onClick={() =>
                  void perform(async () => {
                    await update(() => pending)
                    setPending(undefined)
                    setMessage(tr('已替换为备份中的工作台偏好。', 'Workspace replaced with backup.'))
                  })
                }
              >
                {tr('确认替换工作台', 'Replace Workspace')}
              </button>
              <button type="button" className="qb-tool-button" disabled={busy} onClick={() => setPending(undefined)}>
                {tr('取消', 'Cancel')}
              </button>
            </div>
          </div>
        )}
        {(message || error) && <p role="status">{message || error}</p>}
      </section>
    </>
  )
}
