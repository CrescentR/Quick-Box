import { MonitorCog, Palette, ShieldCheck, Sparkles } from 'lucide-react'
import { useConfigStore } from '../stores/config-store'
import { Detail, Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

export default function SettingsPage({ currentPage, onPageChange }: PageNavigationProps) {
  const { config, setConfig } = useConfigStore()

  return (
    <WindowShell
      mode="split"
      title={
        <PageHeader
          currentPage={currentPage}
          onPageChange={onPageChange}
          eyebrow="Workspace"
          title="Settings"
          description="Tune launcher behavior, appearance, and desktop integration from one place."
        />
      }
      footer={
        <div className="qb-page-footer">
          <div className="qb-page-footer__left">
            <span className="qb-page-footer__label">Quick toggle</span>
            <KeyboardShortcut keys={['Ctrl', ',']} />
          </div>
          <div className="qb-page-footer__right">
            <span className="qb-page-footer__label">Theme: {config.theme}</span>
          </div>
        </div>
      }
    >
      <div className="qb-page-shell">
        <div className="qb-page-body qb-scrollbar">
          <div className="qb-page-stack">
            <div className="qb-page-grid qb-page-grid--three">
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">Theme</div>
                <div className="qb-page-stat__value">{config.theme}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">Hotkey</div>
                <div className="qb-page-stat__value">{config.hotkey}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">Tray</div>
                <div className="qb-page-stat__value">{config.enableTray ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>

            <div className="qb-page-grid">
              <section className="qb-page-card">
                <div className="qb-page-card__top">
                  <div>
                    <div className="qb-page-card__title">Appearance</div>
                    <div className="qb-page-card__description">
                      Keep QuickBox aligned with the dark-first design system while leaving room for system-aware themes.
                    </div>
                  </div>
                  <Icon icon={Palette} size={18} tone="primary" />
                </div>

                <label className="qb-page-field">
                  <span className="qb-page-label">Theme mode</span>
                  <select
                    className="qb-page-select"
                    value={config.theme}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        theme: event.target.value as typeof config.theme,
                      })
                    }
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                </label>

                <div className="qb-page-card__meta">
                  <Tag tone="primary">Dark-first</Tag>
                  <Tag tone="default">Mica-like</Tag>
                </div>
              </section>

              <section className="qb-page-card">
                <div className="qb-page-card__top">
                  <div>
                    <div className="qb-page-card__title">Invocation</div>
                    <div className="qb-page-card__description">
                      Configure how the launcher is called and whether it stays reachable through desktop affordances.
                    </div>
                  </div>
                  <Icon icon={MonitorCog} size={18} tone="primary" />
                </div>

                <label className="qb-page-field">
                  <span className="qb-page-label">Launcher hotkey</span>
                  <input
                    className="qb-page-input"
                    value={config.hotkey}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        hotkey: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="qb-page-toggle">
                  <div className="qb-page-toggle__copy">
                    <div className="qb-page-toggle__title">Tray presence</div>
                    <div className="qb-page-toggle__description">
                      Keep QuickBox discoverable from desktop chrome while keyboard workflows continue to work.
                    </div>
                  </div>
                  <input
                    className="qb-page-checkbox"
                    type="checkbox"
                    checked={config.enableTray}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        enableTray: event.target.checked,
                      })
                    }
                  />
                </div>
              </section>
            </div>

            <Detail
              title="Settings Roadmap"
              markdown="- Theme, hotkey, and tray options now share the same UI language as the launcher.\n- This page is ready to connect to persistence once config save/load flows are expanded.\n- Keyboard-first affordances stay visible so it feels like part of the launcher rather than a separate admin screen."
              metadata={[
                { label: 'Status', value: 'Interactive prototype' },
                { label: 'Backed by', value: 'Zustand config store' },
                { label: 'Next', value: 'Persist changes to desktop config' },
              ]}
            />
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
