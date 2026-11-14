import { useState } from 'react'
import { Boxes, Search } from 'lucide-react'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { localizeCommand, localizePlugin, useLocale, useT } from '../i18n'
import { usePluginStore } from '../stores/plugin-store'
import { Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

export default function PluginManagerPage({ currentPage, onPageChange }: PageNavigationProps) {
  const plugins = pluginRegistry.listPlugins()
  const { enabledPluginIds, status, error, setPluginEnabled } = usePluginStore()
  const locale = useLocale()
  const tr = useT()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const permissionLabels: Record<string, string> = {
    'clipboard.read': tr('读取剪贴板', 'Read clipboard'),
    'clipboard.write': tr('写入剪贴板', 'Write clipboard'),
    'storage.read': tr('读取存储', 'Read storage'),
    'storage.write': tr('写入存储', 'Write storage'),
    'fs.read': tr('读取文件', 'Read files'),
    'fs.write': tr('写入文件', 'Write files'),
    'network.request': tr('网络请求', 'Network request'),
    'notification.send': tr('系统通知', 'Notifications'),
    'process.manage': tr('进程管理', 'Process management'),
  }

  const resolvedEnabledIds = status === 'idle' || status === 'loading' ? plugins.map((p) => p.id) : enabledPluginIds
  const isEnabled = (id: string) => resolvedEnabledIds.includes(id)
  const busy = status === 'loading' || status === 'saving'
  const visible = plugins.filter((p) => {
    const localized = localizePlugin(p, locale)
    const haystack = [
      p.name,
      p.description ?? '',
      localized.name,
      localized.description,
      ...p.commands.flatMap((c) => [c.title, localizeCommand(c, locale).title]),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query.toLowerCase().trim()) && (filter === 'all' || (filter === 'enabled') === isEnabled(p.id))
  })

  return <WindowShell mode="split" className="qb-workbench-compact"
    title={<PageHeader currentPage={currentPage} onPageChange={onPageChange} compact />}
    footer={<div className="qb-page-footer"><span>{tr(`${plugins.length} 个插件 · ${plugins.filter((p) => isEnabled(p.id)).length} 个已启用`, `${plugins.length} plugins · ${plugins.filter((p) => isEnabled(p.id)).length} enabled`)}</span><Tag tone={status === 'error' ? 'danger' : busy ? 'warning' : 'success'}>{status === 'error' ? tr('保存失败', 'Save failed') : busy ? tr('同步中', 'Syncing') : tr('已同步', 'Synced')}</Tag></div>}>
    <div className="qb-page-shell"><div className="qb-page-body qb-scrollbar"><div className="qb-page-stack">
      <div className="qb-settings-heading"><h1>{tr('插件管理', 'Plugins')}</h1><span>{tr('启停工具，管理启动器中的命令入口', 'Enable or disable built-in tools and launcher commands')}</span></div>
      <div className="qb-plugin-toolbar"><label className="qb-plugin-search"><Search size={16} /><input className="qb-page-input" aria-label={tr('搜索插件', 'Search plugins')} placeholder={tr('搜索插件或命令…', 'Search plugins or commands…')} value={query} onChange={(e) => setQuery(e.target.value)} /></label><select className="qb-page-input" aria-label={tr('插件状态', 'Plugin status')} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">{tr('全部插件', 'All plugins')}</option><option value="enabled">{tr('已启用', 'Enabled')}</option><option value="disabled">{tr('已停用', 'Disabled')}</option></select></div>
      {error && <p role="alert" className="qb-inline-error">{error}</p>}
      <div className="qb-plugin-list">
        {visible.map((plugin) => {
          const localized = localizePlugin(plugin, locale)
          return <section key={plugin.id} className="qb-plugin-row">
            <div className="qb-plugin-icon"><Boxes size={18} /></div>
            <div className="qb-plugin-copy"><div className="qb-plugin-name"><h2>{localized.name}</h2><span>v{plugin.version}</span><span>{tr(`${plugin.commands.length} 条命令`, `${plugin.commands.length} commands`)}</span></div><p>{localized.description || tr('暂未提供说明', 'No description available')}</p><details><summary>{tr('权限与详情', 'Permissions & details')}</summary><p>{plugin.permissions.map((permission) => permissionLabels[permission] ?? permission).join(tr('、', ', ')) || tr('未声明额外权限', 'No extra permissions')} · {tr(`${plugin.views?.length ?? 0} 个视图 · 官方内置`, `${plugin.views?.length ?? 0} views · Built-in`)}</p></details></div>
            <label className="qb-plugin-switch"><span>{isEnabled(plugin.id) ? tr('已启用', 'Enabled') : tr('已停用', 'Disabled')}</span><input className="qb-page-checkbox" type="checkbox" aria-label={tr(`启用 ${localized.name}`, `Enable ${localized.name}`)} checked={isEnabled(plugin.id)} disabled={busy} onChange={(e) => void setPluginEnabled(plugin, e.target.checked, plugins)} /></label>
          </section>
        })}
        {!visible.length && <p className="qb-plugin-empty">{tr('没有匹配的插件，请调整搜索或筛选条件。', 'No matching plugins. Try adjusting your search or filter.')}</p>}
      </div>
    </div></div></div>
  </WindowShell>
}
