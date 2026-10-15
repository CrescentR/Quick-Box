import { useEffect, useState } from 'react'
import ReleaseSettings from './ReleaseSettings'
import WorkspaceSettings from './WorkspaceSettings'
import StorageSettings from './StorageSettings'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { useConfigStore } from '../stores/config-store'
import { KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

const themes = [{ value: 'dark', label: '暗色' }, { value: 'light', label: '浅色' }, { value: 'system', label: '跟随系统' }] as const
const hotkeys = ['Ctrl+Alt+Space', 'Ctrl+Alt+K', 'Ctrl+Alt+Q', 'Ctrl+Shift+Space', 'Alt+Space']

export default function SettingsPage({ currentPage, onPageChange }: PageNavigationProps) {
  const { config, status, error, setConfig } = useConfigStore()
  const resolvedTheme = useResolvedTheme(config.theme)
  const [hotkey, setHotkey] = useState(config.hotkey)
  useEffect(() => setHotkey(config.hotkey), [config.hotkey])
  const busy = status === 'saving' || status === 'loading'
  const statusLabel = status === 'loading' ? '读取中' : status === 'saving' ? '保存中' : status === 'error' ? '保存失败' : '已保存'
  return <WindowShell mode="split" className="qb-workbench-compact"
    title={<PageHeader currentPage={currentPage} onPageChange={onPageChange} compact />}
    footer={<div className="qb-page-footer"><div className="qb-page-footer__left"><span>设置</span><KeyboardShortcut keys={['Ctrl', ',']} /></div><Tag tone={status === 'error' ? 'danger' : busy ? 'warning' : 'success'}>{statusLabel}</Tag></div>}>
    <div className="qb-page-shell"><div className="qb-page-body qb-scrollbar"><div className="qb-page-stack">
      <div className="qb-settings-heading"><h1>设置</h1><span>外观、启动方式与本地数据</span></div>
      {error && <p role="alert" className="qb-inline-error">{error}</p>}
      <section className="qb-page-card">
        <h2 className="qb-page-card__title">常规</h2>
        <div className="qb-setting-row"><div><strong>主题模式</strong><p>当前显示{resolvedTheme === 'dark' ? '暗色' : '浅色'}主题</p></div>
          <div className="qb-page-segmented" role="radiogroup" aria-label="主题模式">{themes.map((theme) => <button key={theme.value} className="qb-page-segmented__item" role="radio" aria-checked={config.theme === theme.value} data-active={config.theme === theme.value} disabled={busy} onClick={() => void setConfig({ ...config, theme: theme.value })}>{theme.label}</button>)}</div>
        </div>
        <div className="qb-setting-row"><div><strong>启动器热键</strong><p>选择预设，或输入组合键后保存</p></div>
          <div className="qb-hotkey-editor"><select className="qb-page-input" aria-label="预设热键" value={hotkeys.includes(hotkey) ? hotkey : 'custom'} disabled={busy} onChange={(e) => { if (e.target.value !== 'custom') setHotkey(e.target.value) }}><option value="custom">自定义</option>{hotkeys.map((key) => <option key={key} value={key}>{key}</option>)}</select>
            <div className="qb-inline-controls"><input className="qb-page-input" aria-label="自定义热键" value={hotkey} disabled={busy} onChange={(e) => setHotkey(e.target.value)} /><button className="qb-tool-button" disabled={busy || !hotkey.trim() || hotkey === config.hotkey} onClick={() => void setConfig({ ...config, hotkey: hotkey.trim() })}>保存热键</button></div>
          </div>
        </div>
        <label className="qb-setting-row"><div><strong>显示托盘入口</strong><p>在系统托盘保留入口，重启应用后生效</p></div><input className="qb-page-checkbox" type="checkbox" aria-label="显示托盘入口" checked={config.enableTray} disabled={busy} onChange={(e) => void setConfig({ ...config, enableTray: e.target.checked })} /></label>
        <label className="qb-setting-row"><div><strong>窗口保持置顶</strong><p>让 QuickBox 显示在其他窗口上方</p></div><input className="qb-page-checkbox" type="checkbox" aria-label="窗口保持置顶" checked={config.alwaysOnTop} disabled={busy} onChange={(e) => void setConfig({ ...config, alwaysOnTop: e.target.checked })} /></label>
      </section>
      <StorageSettings />
      <WorkspaceSettings />
      <ReleaseSettings />
    </div></div></div>
  </WindowShell>
}
