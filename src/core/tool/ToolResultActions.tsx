import { useState } from 'react'
import { commandRegistry } from '../command/command-registry'
import { useLauncherStore } from '../../stores/launcher-store'
import { usePluginStore } from '../../stores/plugin-store'
import { TOOL_ACTIONS, useToolContext, type ToolDataType } from './tool-context'

export function ToolResultActions({ text, type }: { text: string; type: ToolDataType }) {
  const { input, viewId } = useToolContext()
  const enabled = usePluginStore((state) => state.enabledPluginIds)
  const [error, setError] = useState('')
  const actions = TOOL_ACTIONS.filter((action) => action.accepts.includes(type) && enabled.includes(commandRegistry.get(action.commandId)?.pluginId ?? ''))
  const transfer = async (id: string) => {
    const command = commandRegistry.get(id)
    if (!command) return
    try {
      if (text.length > 1_000_000) throw new Error('结果超过 1 MB，请缩小数据后再传递。')
      await command.run({
        closeView: useLauncherStore.getState().closeView,
        openView: async (target, params) => useLauncherStore.getState().openView(target, {
          ...params, commandId: id, requestId: crypto.randomUUID(),
          toolInput: { text, type, source: viewId, sensitive: input?.sensitive },
        }),
      })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '发送失败') }
  }
  return <div className="qb-tool-actions">
    <label>发送到工具 <select aria-label="发送到工具" className="qb-tool-input" value="" onChange={(event) => void transfer(event.target.value)}>
      <option value="">选择下一步…</option>
      {actions.map((action) => <option key={action.commandId} value={action.commandId}>{action.title}</option>)}
    </select></label>
    {error && <span role="alert">{error}</span>}
  </div>
}
