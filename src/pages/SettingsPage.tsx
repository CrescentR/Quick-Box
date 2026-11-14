import { useEffect, useState } from 'react'
import ReleaseSettings from './ReleaseSettings'
import WorkspaceSettings from './WorkspaceSettings'
import StorageSettings from './StorageSettings'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { useLocale, useT, type AppLanguage } from '../i18n'
import { useConfigStore } from '../stores/config-store'
import { KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

const hotkeys = ['Ctrl+Alt+Space', 'Ctrl+Alt+K', 'Ctrl+Alt+Q', 'Ctrl+Shift+Space', 'Alt+Space']

export default function SettingsPage({ currentPage, onPageChange }: PageNavigationProps) {
  const { config, status, error, setConfig } = useConfigStore()
  const resolvedTheme = useResolvedTheme(config.theme)
  const resolvedLocale = useLocale()
  const tr = useT()
  const [hotkey, setHotkey] = useState(config.hotkey)
  useEffect(() => setHotkey(config.hotkey), [config.hotkey])
  const busy = status === 'saving' || status === 'loading'

  const themes = [
    { value: 'dark', label: tr('暗色', 'Dark') },
    { value: 'light', label: tr('浅色', 'Light') },
    { value: 'system', label: tr('跟随系统', 'System') },
  ] as const

  const languages: ReadonlyArray<{ value: AppLanguage; label: string }> = [
    { value: 'system', label: tr('跟随系统', 'System') },
    { value: 'en-US', label: 'English' },
    { value: 'zh-CN', label: '简体中文' },
  ]

  const statusLabel =
    status === 'loading'
      ? tr('读取中', 'Loading')
      : status === 'saving'
        ? tr('保存中', 'Saving')
        : status === 'error'
          ? tr('保存失败', 'Save failed')
          : tr('已保存', 'Saved')

  return <WindowShell mode="split" className="qb-workbench-compact"
    title={<PageHeader currentPage={currentPage} onPageChange={onPageChange} compact />}
    footer={<div className="qb-page-footer"><div className="qb-page-footer__left"><span>{tr('设置', 'Settings')}</span><KeyboardShortcut keys={['Ctrl', ',']} /></div><Tag tone={status === 'error' ? 'danger' : busy ? 'warning' : 'success'}>{statusLabel}</Tag></div>}>
    <div className="qb-page-shell"><div className="qb-page-body qb-scrollbar"><div className="qb-page-stack">
      <div className="qb-settings-heading"><h1>{tr('设置', 'Settings')}</h1><span>{tr('外观、语言、启动方式与本地数据', 'Appearance, language, startup & local data')}</span></div>
      {error && <p role="alert" className="qb-inline-error">{error}</p>}
      <section className="qb-page-card">
        <h2 className="qb-page-card__title">{tr('常规', 'General')}</h2>
        <div className="qb-setting-row"><div><strong>{tr('界面语言', 'Language')}</strong><p>{tr(`当前显示${resolvedLocale === 'en-US' ? '英文' : '简体中文'}界面`, `Currently using ${resolvedLocale === 'en-US' ? 'English' : 'Simplified Chinese'}`)}</p></div>
          <div className="qb-page-segmented" role="radiogroup" aria-label={tr('界面语言', 'Language')}>{languages.map((lang) => <button key={lang.value} className="qb-page-segmented__item" role="radio" aria-checked={config.language === lang.value} data-active={config.language === lang.value} disabled={busy} onClick={() => void setConfig({ ...config, language: lang.value })}>{lang.label}</button>)}</div>
        </div>
        <div className="qb-setting-row"><div><strong>{tr('主题模式', 'Theme')}</strong><p>{tr(`当前显示${resolvedTheme === 'dark' ? '暗色' : '浅色'}主题`, `Using ${resolvedTheme} theme`)}</p></div>
          <div className="qb-page-segmented" role="radiogroup" aria-label={tr('主题模式', 'Theme')}>{themes.map((theme) => <button key={theme.value} className="qb-page-segmented__item" role="radio" aria-checked={config.theme === theme.value} data-active={config.theme === theme.value} disabled={busy} onClick={() => void setConfig({ ...config, theme: theme.value })}>{theme.label}</button>)}</div>
        </div>
        <div className="qb-setting-row"><div><strong>{tr('启动器热键', 'Launcher Hotkey')}</strong><p>{tr('选择预设，或输入组合键后保存', 'Pick a preset or enter a custom shortcut')}</p></div>
          <div className="qb-hotkey-editor"><select className="qb-page-input" aria-label={tr('预设热键', 'Preset hotkey')} value={hotkeys.includes(hotkey) ? hotkey : 'custom'} disabled={busy} onChange={(e) => { if (e.target.value !== 'custom') setHotkey(e.target.value) }}><option value="custom">{tr('自定义', 'Custom')}</option>{hotkeys.map((key) => <option key={key} value={key}>{key}</option>)}</select>
            <div className="qb-inline-controls"><input className="qb-page-input" aria-label={tr('自定义热键', 'Custom hotkey')} value={hotkey} disabled={busy} onChange={(e) => setHotkey(e.target.value)} /><button className="qb-tool-button" disabled={busy || !hotkey.trim() || hotkey === config.hotkey} onClick={() => void setConfig({ ...config, hotkey: hotkey.trim() })}>{tr('保存热键', 'Save Hotkey')}</button></div>
          </div>
        </div>
        <label className="qb-setting-row"><div><strong>{tr('显示托盘入口', 'Show Tray Icon')}</strong><p>{tr('在系统托盘保留入口，重启应用后生效', 'Keep QuickBox in the system tray (restart required)')}</p></div><input className="qb-page-checkbox" type="checkbox" aria-label={tr('显示托盘入口', 'Show Tray Icon')} checked={config.enableTray} disabled={busy} onChange={(e) => void setConfig({ ...config, enableTray: e.target.checked })} /></label>
        <label className="qb-setting-row"><div><strong>{tr('窗口保持置顶', 'Always on Top')}</strong><p>{tr('让 QuickBox 显示在其他窗口上方', 'Keep the QuickBox window above other windows')}</p></div><input className="qb-page-checkbox" type="checkbox" aria-label={tr('窗口保持置顶', 'Always on Top')} checked={config.alwaysOnTop} disabled={busy} onChange={(e) => void setConfig({ ...config, alwaysOnTop: e.target.checked })} /></label>
      </section>
      <StorageSettings />
      <WorkspaceSettings />
      <ReleaseSettings />
    </div></div></div>
  </WindowShell>
}
