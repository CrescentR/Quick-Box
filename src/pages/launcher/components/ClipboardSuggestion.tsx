import { useEffect, useState } from 'react'
import { readClipboardText } from '../../../api/clipboard-api'
import { detectClipboard, getClipboardMatchLabel, type ClipboardMatch } from '../launcher-clipboard'
import { useWorkspaceStore } from '../../../stores/workspace-store'
import { usePluginStore } from '../../../stores/plugin-store'
import { commandRegistry } from '../../../core/command/command-registry'
import { useLauncherStore } from '../../../stores/launcher-store'
import { useLocale, useT } from '../../../i18n'

export function ClipboardSuggestion() {
  const locale = useLocale()
  const tr = useT()
  const enabled = useWorkspaceStore((state) => state.data.clipboardSuggestions)
  const plugins = usePluginStore((state) => state.enabledPluginIds)
  const [match, setMatch] = useState<ClipboardMatch | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) { setMatch(null); return }
    let active = true
    let sequence = 0
    const read = async () => {
      const request = ++sequence
      try {
        const text = await readClipboardText()
        if (active && request === sequence) setMatch(detectClipboard(text))
      } catch { if (active && request === sequence) setMatch(null) }
    }
    void read()
    window.addEventListener('focus', read)
    return () => { active = false; window.removeEventListener('focus', read) }
  }, [enabled])
  const command = match && commandRegistry.get(match.commandId)
  if (!enabled || !match || !command || !plugins.includes(command.pluginId)) return null
  const label = getClipboardMatchLabel(match, locale)
  return <div className="qb-clipboard-suggestion">
    <button className="qb-tool-button" onClick={() => {
      void Promise.resolve().then(() => command.run({
        closeView: useLauncherStore.getState().closeView,
        openView: async (viewId, params) => useLauncherStore.getState().openView(viewId, { ...params, commandId: command.id, requestId: crypto.randomUUID(), toolInput: { text: match.text, type: 'text', source: 'clipboard', sensitive: match.kind === 'JWT' } }),
      })).catch(() => setError(tr('打开推荐工具失败，请重试', 'Failed to open suggested tool. Please try again.')))
    }}>{tr(`用工具处理剪贴板中的${label}`, `Open ${label} from clipboard`)}</button>
    <button className="qb-tool-button" onClick={() => setMatch(null)}>{tr('忽略', 'Dismiss')}</button>
    {error && <span role="alert">{error}</span>}
  </div>
}
