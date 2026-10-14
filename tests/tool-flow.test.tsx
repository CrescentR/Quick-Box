import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { loadBuiltinPlugins } from '../src/core/plugin/builtin-loader'
import { pluginRegistry } from '../src/core/plugin/plugin-registry'
import { usePluginStore } from '../src/stores/plugin-store'
import { useLauncherStore } from '../src/stores/launcher-store'
import { ToolViewPane } from '../src/pages/launcher/components/ToolViewPane'
import { clearToolDrafts } from '../src/core/tool/tool-context'

function Host() {
  const { activeViewId, activeViewParams } = useLauncherStore()
  return activeViewId ? <ToolViewPane viewId={activeViewId} params={activeViewParams} isQuick={false} onToggleQuick={() => {}} onOpenActions={() => {}} /> : null
}
beforeEach(() => {
  loadBuiltinPlugins(); clearToolDrafts()
  usePluginStore.setState({ enabledPluginIds: pluginRegistry.listPlugins().map((plugin) => plugin.id), status: 'ready' })
})
it('JSON 输入发送到 TypeScript 工具，精确保留数据', async () => {
  useLauncherStore.getState().openView('official.json-tool.view', { toolInput: { type: 'json', text: '{"recordId":42}', source: 'test' } })
  render(<Host />)
  expect((await screen.findByLabelText('输入') as HTMLTextAreaElement).value).toBe('{"recordId":42}')
  fireEvent.change(screen.getAllByLabelText('发送到工具')[0], { target: { value: 'official.utility-tools.json-to-typescript' } })
  await waitFor(() => expect((screen.getByLabelText('JSON') as HTMLTextAreaElement).value).toContain('recordId'))
  expect(screen.getByText(/recordId: number/)).toBeTruthy()
})
it('错误 JSON 不展示后续动作', async () => {
  useLauncherStore.getState().openView('official.json-tool.view', { toolInput: { type: 'text', text: '{broken', source: 'test' } })
  render(<Host />)
  await screen.findByLabelText('输入')
  expect(screen.queryByLabelText('发送到工具')).toBeNull()
  expect((screen.getByText('复制格式化结果') as HTMLButtonElement).disabled).toBe(true)
})
it('文本清洗结果可直接发送给去重工具', async () => {
  useLauncherStore.getState().openView('official.workflow-tools.text-cleaner.view', { toolInput: { type: 'text', text: '  alpha\n alpha\n beta ', source: 'test' } })
  render(<Host />)
  fireEvent.change(await screen.findByLabelText('发送到工具'), { target: { value: 'official.workflow-tools.text-deduplicate' } })
  await waitFor(() => expect((screen.getByLabelText('输入列表') as HTMLTextAreaElement).value).toBe('alpha\nalpha\nbeta'))
})
