import { useState } from 'react'
import { Boxes, Search } from 'lucide-react'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { usePluginStore } from '../stores/plugin-store'
import { Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

const permissionLabels: Record<string, string> = { 'clipboard.read': '读取剪贴板', 'clipboard.write': '写入剪贴板', 'storage.read': '读取存储', 'storage.write': '写入存储', 'fs.read': '读取文件', 'fs.write': '写入文件', 'network.request': '网络请求', 'notification.send': '系统通知', 'process.manage': '进程管理' }

export default function PluginManagerPage({ currentPage, onPageChange }: PageNavigationProps) {
  const plugins = pluginRegistry.listPlugins()
  const { enabledPluginIds, status, error, setPluginEnabled } = usePluginStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const resolvedEnabledIds = status === 'idle' || status === 'loading' ? plugins.map((p) => p.id) : enabledPluginIds
  const isEnabled = (id: string) => resolvedEnabledIds.includes(id)
  const busy = status === 'loading' || status === 'saving'
  const visible = plugins.filter((p) => `${p.name} ${p.description} ${p.commands.map((c) => c.title).join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()) && (filter === 'all' || (filter === 'enabled') === isEnabled(p.id)))
  return <WindowShell mode="split" className="qb-workbench-compact"
    title={<PageHeader currentPage={currentPage} onPageChange={onPageChange} compact />}
    footer={<div className="qb-page-footer"><span>{plugins.length} 个插件 · {plugins.filter((p) => isEnabled(p.id)).length} 个已启用</span><Tag tone={status === 'error' ? 'danger' : busy ? 'warning' : 'success'}>{status === 'error' ? '保存失败' : busy ? '同步中' : '已同步'}</Tag></div>}>
    <div className="qb-page-shell"><div className="qb-page-body qb-scrollbar"><div className="qb-page-stack">
      <div className="qb-settings-heading"><h1>插件管理</h1><span>启停工具，管理启动器中的命令入口</span></div>
      <div className="qb-plugin-toolbar"><label className="qb-plugin-search"><Search size={16} /><input className="qb-page-input" aria-label="搜索插件" placeholder="搜索插件或命令…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select className="qb-page-input" aria-label="插件状态" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">全部插件</option><option value="enabled">已启用</option><option value="disabled">已停用</option></select></div>
      {error && <p role="alert" className="qb-inline-error">{error}</p>}
      <div className="qb-plugin-list">
        {visible.map((plugin) => <section key={plugin.id} className="qb-plugin-row">
          <div className="qb-plugin-icon"><Boxes size={18} /></div>
          <div className="qb-plugin-copy"><div className="qb-plugin-name"><h2>{plugin.name}</h2><span>v{plugin.version}</span><span>{plugin.commands.length} 条命令</span></div><p>{plugin.description ?? '暂未提供说明'}</p><details><summary>权限与详情</summary><p>{plugin.permissions.map((permission) => permissionLabels[permission] ?? permission).join('、') || '未声明额外权限'} · {plugin.views?.length ?? 0} 个视图 · 官方内置</p></details></div>
          <label className="qb-plugin-switch"><span>{isEnabled(plugin.id) ? '已启用' : '已停用'}</span><input className="qb-page-checkbox" type="checkbox" aria-label={`启用 ${plugin.name}`} checked={isEnabled(plugin.id)} disabled={busy} onChange={(e) => void setPluginEnabled(plugin, e.target.checked, plugins)} /></label>
        </section>)}
        {!visible.length && <p className="qb-plugin-empty">没有匹配的插件，请调整搜索或筛选条件。</p>}
      </div>
    </div></div></div>
  </WindowShell>
}
