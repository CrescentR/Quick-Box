import { Boxes } from 'lucide-react'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { usePluginStore } from '../stores/plugin-store'
import { Detail, Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

const permissionLabels: Record<string, string> = {
  'clipboard.read': '读取剪贴板',
  'clipboard.write': '写入剪贴板',
}

function formatPermissions(permissions: string[]) {
  if (!permissions.length) {
    return '未声明额外权限'
  }

  return permissions.map((permission) => permissionLabels[permission] ?? permission).join('、')
}

export default function PluginManagerPage({ currentPage, onPageChange }: PageNavigationProps) {
  const plugins = pluginRegistry.listPlugins()
  const { enabledPluginIds, setEnabledPluginIds } = usePluginStore()

  const resolvedEnabledIds = enabledPluginIds.length
    ? enabledPluginIds
    : plugins.map((plugin) => plugin.id)

  const isEnabled = (pluginId: string) => resolvedEnabledIds.includes(pluginId)

  return (
    <WindowShell
      mode="split"
      title={
        <PageHeader
          currentPage={currentPage}
          onPageChange={onPageChange}
          eyebrow="工作区"
          title="插件管理"
          description="查看官方工具、权限声明和启用状态，让插件能力保持清晰克制。"
        />
      }
      footer={
        <div className="qb-page-footer">
          <div className="qb-page-footer__left">
            <span className="qb-page-footer__label">已安装</span>
            <Tag tone="primary">{plugins.length} 个官方工具</Tag>
          </div>
          <div className="qb-page-footer__right">
            <KeyboardShortcut keys={['Up', 'Down']} />
            <KeyboardShortcut keys="Enter" />
          </div>
        </div>
      }
    >
      <div className="qb-page-shell">
        <div className="qb-page-body qb-scrollbar">
          <div className="qb-page-stack">
            <div className="qb-page-grid qb-page-grid--three">
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">插件</div>
                <div className="qb-page-stat__value">{plugins.length}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">命令</div>
                <div className="qb-page-stat__value">
                  {plugins.reduce((count, plugin) => count + plugin.commands.length, 0)}
                </div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">视图</div>
                <div className="qb-page-stat__value">
                  {plugins.reduce((count, plugin) => count + (plugin.views?.length ?? 0), 0)}
                </div>
              </div>
            </div>

            <div className="qb-page-grid">
              {plugins.map((plugin) => (
                <section key={plugin.id} className="qb-page-card">
                  <div className="qb-page-card__top">
                    <div>
                      <div className="qb-page-card__title">{plugin.name}</div>
                      <div className="qb-page-card__description">
                        {plugin.description ?? '暂未提供说明。'}
                      </div>
                    </div>
                    <Icon icon={Boxes} size={18} tone="primary" />
                  </div>

                  <div className="qb-page-card__meta">
                    <Tag tone="primary">官方</Tag>
                    <Tag tone="default">{plugin.version}</Tag>
                    <Tag tone={isEnabled(plugin.id) ? 'success' : 'warning'}>
                      {isEnabled(plugin.id) ? '已启用' : '已停用'}
                    </Tag>
                  </div>

                  <div className="qb-page-list">
                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">命令入口</div>
                        <div className="qb-page-toggle__description">
                          {plugin.commands.length} 条启动器命令
                        </div>
                      </div>
                      <Tag tone="default">{plugin.commands.length}</Tag>
                    </div>

                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">可用视图</div>
                        <div className="qb-page-toggle__description">
                          已注册 {plugin.views?.length ?? 0} 个工具视图
                        </div>
                      </div>
                      <Tag tone="default">{plugin.views?.length ?? 0}</Tag>
                    </div>

                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">启用插件</div>
                        <div className="qb-page-toggle__description">
                          当前由内存中的插件状态驱动，后续会接入持久化配置。
                        </div>
                      </div>
                      <input
                        className="qb-page-checkbox"
                        type="checkbox"
                        checked={isEnabled(plugin.id)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? Array.from(new Set([...resolvedEnabledIds, plugin.id]))
                            : resolvedEnabledIds.filter((id) => id !== plugin.id)
                          setEnabledPluginIds(next)
                        }}
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <Detail
              title="权限摘要"
              markdown="- 当前插件全部来自官方内置集合。\n- 权限仍由插件 metadata 显式声明，方便后续治理。\n- 这个页面会继续扩展为更完整的插件能力管理界面。"
              metadata={plugins.slice(0, 4).map((plugin) => ({
                label: plugin.name,
                value: formatPermissions(plugin.permissions),
              }))}
            />
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
