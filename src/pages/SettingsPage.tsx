import { MonitorCog, Palette } from 'lucide-react'
import type { QuickBoxConfig } from '../core/config/config-types'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { useConfigStore } from '../stores/config-store'
import { Detail, Icon, KeyboardShortcut, Tag, WindowShell } from '../ui'
import PageHeader from './PageHeader'
import type { PageNavigationProps } from './page-types'
import './Workbench.css'

function getThemeLabel(theme: QuickBoxConfig['theme']) {
  return theme === 'light' ? '浅色' : theme === 'system' ? '跟随系统' : '暗色'
}

const themeOptions: Array<{
  value: QuickBoxConfig['theme']
  label: string
  description: string
}> = [
  { value: 'dark', label: '暗色', description: '默认验收模式' },
  { value: 'light', label: '浅色', description: '明亮桌面环境' },
  { value: 'system', label: '跟随系统', description: '自动同步系统' },
]

const hotkeyOptions: Array<{
  value: string
  label: string
  description: string
}> = [
  { value: 'Ctrl+Alt+Space', label: '推荐', description: '避开输入法与系统搜索' },
  { value: 'Ctrl+Alt+K', label: '键盘流', description: '适合高频呼出' },
  { value: 'Ctrl+Alt+Q', label: 'QuickBox', description: '记忆成本低' },
  { value: 'Ctrl+Shift+Space', label: '备用', description: '保留空格手感' },
  { value: 'Alt+Space', label: '经典', description: '沿用当前默认值' },
]

export default function SettingsPage({ currentPage, onPageChange }: PageNavigationProps) {
  const { config, status, error, setConfig } = useConfigStore()
  const resolvedTheme = useResolvedTheme(config.theme)
  const themeLabel = getThemeLabel(config.theme)
  const resolvedThemeLabel = getThemeLabel(resolvedTheme)
  const isPresetHotkey = hotkeyOptions.some((option) => option.value === config.hotkey)
  const statusLabel =
    status === 'loading'
      ? '读取中'
      : status === 'saving'
        ? '保存中'
        : status === 'error'
          ? '保存失败'
          : '已保存'
  const statusTone =
    status === 'error' ? 'danger' : status === 'loading' || status === 'saving' ? 'warning' : 'success'

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
            <Tag tone={statusTone}>{statusLabel}</Tag>
            <span className="qb-page-footer__label">
              主题：{themeLabel}
              {config.theme === 'system' ? `（当前${resolvedThemeLabel}）` : ''}
            </span>
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
                <div className="qb-page-stat__value">
                  {themeLabel}
                  {config.theme === 'system' ? ` / ${resolvedThemeLabel}` : ''}
                </div>
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

                <div className="qb-page-field">
                  <span className="qb-page-label">主题模式</span>
                  <div className="qb-page-segmented" role="radiogroup" aria-label="主题模式">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        className="qb-page-segmented__item"
                        type="button"
                        role="radio"
                        aria-checked={config.theme === option.value}
                        data-active={config.theme === option.value}
                        onClick={() =>
                          void setConfig({
                            ...config,
                            theme: option.value,
                          })
                        }
                      >
                        <span className="qb-page-segmented__label">{option.label}</span>
                        <span className="qb-page-segmented__description">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="qb-page-card__meta">
                  <Tag tone="primary">暗色优先</Tag>
                  <Tag tone="default">当前{resolvedThemeLabel}</Tag>
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

                <div className="qb-page-field">
                  <span className="qb-page-label">启动器热键</span>
                  <div className="qb-page-hotkey-options" role="radiogroup" aria-label="启动器热键">
                    {hotkeyOptions.map((option) => (
                      <button
                        key={option.value}
                        className="qb-page-hotkey-option qb-focus-ring"
                        type="button"
                        role="radio"
                        aria-checked={config.hotkey === option.value}
                        data-active={config.hotkey === option.value}
                        onClick={() =>
                          void setConfig({
                            ...config,
                            hotkey: option.value,
                          })
                        }
                      >
                        <span className="qb-page-hotkey-option__top">
                          <span className="qb-page-hotkey-option__label">{option.label}</span>
                          <KeyboardShortcut keys={option.value} />
                        </span>
                        <span className="qb-page-hotkey-option__description">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="qb-page-field">
                  <span className="qb-page-label">自定义热键</span>
                  <input
                    id="quickbox-hotkey"
                    name="quickbox-hotkey"
                    className="qb-page-input"
                    value={config.hotkey}
                    data-custom={!isPresetHotkey}
                    onChange={(event) =>
                      void setConfig({
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
                    id="quickbox-enable-tray"
                    name="quickbox-enable-tray"
                    className="qb-page-checkbox"
                    type="checkbox"
                    aria-label="显示托盘入口"
                    checked={config.enableTray}
                    onChange={(event) =>
                      void setConfig({
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
                { label: '状态', value: statusLabel },
                { label: '状态来源', value: 'Zustand + Rust SQLite' },
                { label: '热键模式', value: isPresetHotkey ? '预设组合' : '自定义组合' },
                ...(error ? [{ label: '保存错误', value: error }] : []),
              ]}
            />
          </div>
        </div>
      </div>
    </WindowShell>
  )
}
