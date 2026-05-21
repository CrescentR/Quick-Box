import { MonitorCog, Palette } from 'lucide-react'
import type { QuickBoxConfig } from '../core/config/config-types'
import { useConfigStore } from '../stores/config-store'
import { Detail, Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

function getThemeLabel(theme: QuickBoxConfig['theme']) {
  return theme === 'light' ? '浅色' : theme === 'system' ? '跟随系统' : '暗色'
}

export default function SettingsPage({ currentPage, onPageChange }: PageNavigationProps) {
  const { config, setConfig } = useConfigStore()
  const themeLabel = getThemeLabel(config.theme)

  return (
    <WindowShell
      mode="split"
      title={
        <PageHeader
          currentPage={currentPage}
          onPageChange={onPageChange}
          eyebrow="工作区"
          title="设置"
          description="集中调整启动器行为、视觉外观和桌面集成。"
        />
      }
      footer={
        <div className="qb-page-footer">
          <div className="qb-page-footer__left">
            <span className="qb-page-footer__label">快速打开</span>
            <KeyboardShortcut keys={['Ctrl', ',']} />
          </div>
          <div className="qb-page-footer__right">
            <span className="qb-page-footer__label">主题：{themeLabel}</span>
          </div>
        </div>
      }
    >
      <div className="qb-page-shell">
        <div className="qb-page-body qb-scrollbar">
          <div className="qb-page-stack">
            <div className="qb-page-grid qb-page-grid--three">
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">主题</div>
                <div className="qb-page-stat__value">{themeLabel}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">热键</div>
                <div className="qb-page-stat__value">{config.hotkey}</div>
              </div>
              <div className="qb-page-stat">
                <div className="qb-page-stat__label">托盘</div>
                <div className="qb-page-stat__value">{config.enableTray ? '已启用' : '已停用'}</div>
              </div>
            </div>

            <div className="qb-page-grid">
              <section className="qb-page-card">
                <div className="qb-page-card__top">
                  <div>
                    <div className="qb-page-card__title">外观</div>
                    <div className="qb-page-card__description">
                      让 QuickBox 保持暗色优先的设计气质，同时为跟随系统主题预留空间。
                    </div>
                  </div>
                  <Icon icon={Palette} size={18} tone="primary" />
                </div>

                <label className="qb-page-field">
                  <span className="qb-page-label">主题模式</span>
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
                    <option value="dark">暗色</option>
                    <option value="light">浅色</option>
                    <option value="system">跟随系统</option>
                  </select>
                </label>

                <div className="qb-page-card__meta">
                  <Tag tone="primary">暗色优先</Tag>
                  <Tag tone="default">Mica-like</Tag>
                </div>
              </section>

              <section className="qb-page-card">
                <div className="qb-page-card__top">
                  <div>
                    <div className="qb-page-card__title">呼出方式</div>
                    <div className="qb-page-card__description">
                      配置启动器如何被唤起，以及是否通过桌面托盘保持可见入口。
                    </div>
                  </div>
                  <Icon icon={MonitorCog} size={18} tone="primary" />
                </div>

                <label className="qb-page-field">
                  <span className="qb-page-label">启动器热键</span>
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
                    <div className="qb-page-toggle__title">显示托盘入口</div>
                    <div className="qb-page-toggle__description">
                      在桌面托盘保留 QuickBox 入口，同时不影响键盘优先的工作流。
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
              title="设置路线"
              markdown="- 主题、热键和托盘选项已经与启动器保持同一套视觉语言。\n- 后续扩展配置读写流程后，这里可以直接接入持久化。\n- 键盘提示会持续可见，让设置页仍然像 QuickBox 的一部分，而不是独立后台。"
              metadata={[
                { label: '状态', value: '交互原型' },
                { label: '状态来源', value: 'Zustand 配置 Store' },
                { label: '下一步', value: '持久化到桌面配置' },
              ]}
            />
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
