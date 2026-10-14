import { fireEvent, render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionPanel } from '../src/ui/ActionPanel/ActionPanel'
import { ToolErrorBoundary } from '../src/ui/ErrorState/ToolErrorBoundary'
import { clearToolDrafts, ToolProvider, useToolInput } from '../src/core/tool/tool-context'

function Editor() { const [value, setValue] = useToolInput('default'); return <input aria-label="内容" value={value} onChange={(e) => setValue(e.target.value)} /> }
describe('交互边界', () => {
  it('输入法确认和禁用动作不执行命令', () => {
    const run = vi.fn()
    render(<ActionPanel open actions={[{ id: 'a', title: '动作', onAction: run, disabled: true }]} />)
    fireEvent.keyDown(window, { key: 'Enter' }); expect(run).not.toHaveBeenCalled()
  })
  it('组合输入期间不触发动作', () => {
    const run = vi.fn()
    render(<ActionPanel open actions={[{ id: 'a', title: '动作', onAction: run }]} />)
    fireEvent.keyDown(window, { key: 'Enter', isComposing: true }); expect(run).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Enter' }); expect(run).toHaveBeenCalledOnce()
  })
  it('工具切换后恢复草稿，显式输入优先于旧草稿', () => {
    clearToolDrafts()
    const first = render(<ToolProvider viewId="json"><Editor /></ToolProvider>)
    fireEvent.change(screen.getByLabelText('内容'), { target: { value: '{"user":1}' } })
    first.unmount()
    const second = render(<ToolProvider viewId="json"><Editor /></ToolProvider>)
    expect((screen.getByLabelText('内容') as HTMLInputElement).value).toBe('{"user":1}')
    second.unmount()
    render(<ToolProvider viewId="json" params={{ toolInput: { text: 'incoming', type: 'text', source: 'test' } }}><Editor /></ToolProvider>)
    expect((screen.getByLabelText('内容') as HTMLInputElement).value).toBe('incoming')
  })
  it('单个视图异常可恢复', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = (event: ErrorEvent) => { if (event.error?.message === 'broken') event.preventDefault() }
    window.addEventListener('error', onError)
    let broken = true
    function Tool() { if (broken) throw new Error('broken'); return <p>恢复成功</p> }
    render(<ToolErrorBoundary><Tool /></ToolErrorBoundary>)
    expect(screen.getByText('工具暂时无法显示')).toBeTruthy()
    broken = false
    act(() => fireEvent.click(screen.getByText('重试')))
    expect(screen.getByText('恢复成功')).toBeTruthy()
    window.removeEventListener('error', onError)
    log.mockRestore()
  })
})
