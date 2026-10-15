import { useState } from 'react'
import { useWorkspaceStore } from '../stores/workspace-store'
import { clearToolDrafts } from '../core/tool/tool-context'
import BackupSettings from './BackupSettings'
import { libraryError } from '../api/library-api'

export default function WorkspaceSettings() {
  const { data, ready, saving, error, update, hydrate } = useWorkspaceStore()
  const [message, setMessage] = useState('')
  return <>
    <BackupSettings />
    <section className="qb-page-card">
      <h2 className="qb-page-card__title">工作台偏好</h2>
      <label className="qb-page-toggle">
        <span>呼出时推荐剪贴板工具（仅识别，不记录历史）</span>
        <input className="qb-page-checkbox" type="checkbox" disabled={!ready || saving} checked={data.clipboardSuggestions} onChange={(event) => {
          const checked = event.target.checked
          void update((current) => ({ ...current, clipboardSuggestions: checked })).catch((cause) => setMessage(libraryError(cause)))
        }} />
      </label>
      <div className="qb-tool-actions"><button className="qb-tool-button" onClick={() => { clearToolDrafts(); setMessage('已清除内存草稿。') }}>清除内存草稿</button>
        {!ready && <button className="qb-tool-button" disabled={saving} onClick={() => void hydrate().catch((cause) => setMessage(libraryError(cause)))}>重试读取工作台</button>}
      </div>
      {(message || error) && <p role="status">{message || error}</p>}
    </section>
  </>
}
