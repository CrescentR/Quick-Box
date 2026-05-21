import { Boxes } from 'lucide-react'
import { pluginRegistry } from '../core/plugin/plugin-registry'
import { usePluginStore } from '../stores/plugin-store'
import { Detail, Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

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
          eyebrow="Workspace"
          title="Plugin Manager"
          description="Review official tools, inspect permissions, and keep the plugin surface deliberate."
        />
      }
      footer={
        <div className="qb-page-footer">
          <div className="qb-page-footer__left">
            <span className="qb-page-footer__label">Installed</span>
            <Tag tone="primary">{plugins.length} official tools</Tag>
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
                <div className="qb-page-stat__label">Plugins</div>
                <div className="qb-page-stat__value">{plugins.length}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">Commands</div>
                <div className="qb-page-stat__value">
                  {plugins.reduce((count, plugin) => count + plugin.commands.length, 0)}
                </div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">Views</div>
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
                        {plugin.description ?? 'No description provided yet.'}
                      </div>
                    </div>
                    <Icon icon={Boxes} size={18} tone="primary" />
                  </div>

                  <div className="qb-page-card__meta">
                    <Tag tone="primary">Official</Tag>
                    <Tag tone="default">{plugin.version}</Tag>
                    <Tag tone={isEnabled(plugin.id) ? 'success' : 'warning'}>
                      {isEnabled(plugin.id) ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </div>

                  <div className="qb-page-list">
                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">Command surface</div>
                        <div className="qb-page-toggle__description">
                          {plugin.commands.length} launcher command{plugin.commands.length > 1 ? 's' : ''}
                        </div>
                      </div>
                      <Tag tone="default">{plugin.commands.length}</Tag>
                    </div>

                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">Available views</div>
                        <div className="qb-page-toggle__description">
                          {plugin.views?.length ?? 0} registered view{(plugin.views?.length ?? 0) > 1 ? 's' : ''}
                        </div>
                      </div>
                      <Tag tone="default">{plugin.views?.length ?? 0}</Tag>
                    </div>

                    <div className="qb-page-toggle">
                      <div className="qb-page-toggle__copy">
                        <div className="qb-page-toggle__title">Enable plugin</div>
                        <div className="qb-page-toggle__description">
                          Prototype toggle backed by the in-memory plugin store.
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
              title="Permission Summary"
              markdown="- Plugins currently come from the official builtin set.\n- Permissions are still declared explicitly in plugin metadata.\n- This screen is ready to grow into a fuller plugin governance surface later."
              metadata={plugins.slice(0, 4).map((plugin) => ({
                label: plugin.name,
                value: plugin.permissions.join(', ') || 'No explicit permissions',
              }))}
            />
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
