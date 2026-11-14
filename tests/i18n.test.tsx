import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '../src/core/config/default-config'
import { loadBuiltinPlugins } from '../src/core/plugin/builtin-loader'
import { pluginRegistry } from '../src/core/plugin/plugin-registry'
import { searchCommands } from '../src/core/command/command-search'
import { commandRegistry } from '../src/core/command/command-registry'
import { ToolProvider } from '../src/core/tool/tool-context'
import { resolveLocale, setActiveLanguage } from '../src/i18n'
import LauncherPage from '../src/pages/LauncherPage'
import PluginManagerPage from '../src/pages/PluginManagerPage'
import SettingsPage from '../src/pages/SettingsPage'
import { useConfigStore } from '../src/stores/config-store'
import { useLauncherStore } from '../src/stores/launcher-store'
import { usePluginStore } from '../src/stores/plugin-store'
import JsonToolView from '../src/builtin-plugins/json-tool/JsonToolView'
import CssVisualToolView from '../src/builtin-plugins/advanced-tools/CssVisualToolView'
import PasswordHashToolView from '../src/builtin-plugins/advanced-tools/PasswordHashToolView'
import UnitConverterToolView from '../src/builtin-plugins/utility-tools/UnitConverterToolView'

function ensureDomMocks() {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })
  }
  if (typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = vi.fn()
  }
}

function setNavigatorLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', {
    value: language,
    configurable: true,
  })
  Object.defineProperty(window.navigator, 'languages', {
    value: [language],
    configurable: true,
  })
}

describe('Bilingual i18n support', () => {
  it('resolves system locale from navigator language and explicit overrides', () => {
    setNavigatorLanguage('en-US')
    expect(resolveLocale('system')).toBe('en-US')
    expect(resolveLocale('zh-CN')).toBe('zh-CN')

    setNavigatorLanguage('zh-CN')
    expect(resolveLocale('system')).toBe('zh-CN')
    expect(resolveLocale('en-US')).toBe('en-US')
  })

  it('switches UI language in SettingsPage and updates config store', async () => {
    ensureDomMocks()
    useConfigStore.setState({ config: { ...defaultConfig, language: 'zh-CN' }, status: 'ready', error: undefined })
    render(<SettingsPage currentPage="settings" onPageChange={vi.fn()} />)

    expect(screen.getByText('界面语言')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    })

    expect(useConfigStore.getState().config.language).toBe('en-US')
    expect(screen.getByText('Language')).toBeTruthy()
    expect(screen.getByText('Appearance, language, startup & local data')).toBeTruthy()
    expect(screen.getByText('Currently using English')).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: '简体中文' }))
    })
    expect(useConfigStore.getState().config.language).toBe('zh-CN')
    expect(screen.getByText('外观、语言、启动方式与本地数据')).toBeTruthy()
  })

  it('renders LauncherPage in English, supports bilingual command search, and toggles language via Ctrl+K', async () => {
    ensureDomMocks()
    loadBuiltinPlugins()
    setActiveLanguage('en-US')
    useConfigStore.setState({ config: { ...defaultConfig, language: 'en-US' }, status: 'ready', error: undefined })
    usePluginStore.setState({ enabledPluginIds: pluginRegistry.listPlugins().map((p) => p.id), status: 'ready' })
    useLauncherStore.setState({ query: '', selectedIndex: 0, activeViewId: undefined, activeViewParams: undefined })

    render(<LauncherPage currentPage="launcher" onPageChange={vi.fn()} />)

    expect(screen.getAllByText('All Tools').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('JSON Formatter').length).toBeGreaterThanOrEqual(1)

    // Bilingual search works in both English and Chinese regardless of active locale
    const allCommands = commandRegistry.list()
    const portByEn = searchCommands(allCommands, 'port inspector')
    const portByZh = searchCommands(allCommands, '端口')
    expect(portByEn.some((item) => item.command.id === 'official.port-killer-tool.open')).toBe(true)
    expect(portByZh.some((item) => item.command.id === 'official.port-killer-tool.open')).toBe(true)

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByText('切换为简体中文')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByText('切换为简体中文'))
    })
    expect(useConfigStore.getState().config.language).toBe('zh-CN')
  })

  it('renders PluginManagerPage in English', () => {
    loadBuiltinPlugins()
    setActiveLanguage('en-US')
    usePluginStore.setState({ enabledPluginIds: pluginRegistry.listPlugins().map((p) => p.id), status: 'ready' })

    render(<PluginManagerPage currentPage="plugins" onPageChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Plugins' })).toBeTruthy()
    expect(screen.getByText('Enable or disable built-in tools and launcher commands')).toBeTruthy()
    expect(screen.getByText('JSON Formatter')).toBeTruthy()
  })

  it('renders representative built-in tool views in English', () => {
    setActiveLanguage('en-US')

    const { unmount: u1 } = render(
      <ToolProvider viewId="official.json-tool.view">
        <JsonToolView />
      </ToolProvider>,
    )
    expect(screen.getAllByText('JSON Formatter').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Copy Formatted')).toBeTruthy()
    u1()

    const { unmount: u2 } = render(
      <ToolProvider viewId="official.advanced-tools.css-visual.view">
        <CssVisualToolView />
      </ToolProvider>,
    )
    expect(screen.getByText('CSS Shadow & Gradient Studio')).toBeTruthy()
    expect(screen.getByText('Offset X (px)')).toBeTruthy()
    u2()

    const { unmount: u3 } = render(
      <ToolProvider viewId="official.advanced-tools.password-hash.view">
        <PasswordHashToolView />
      </ToolProvider>,
    )
    expect(screen.getByText('Password Hash & Verify')).toBeTruthy()
    expect(screen.getByText('Plain password')).toBeTruthy()
    u3()

    render(
      <ToolProvider viewId="official.utility-tools.unit-converter.view">
        <UnitConverterToolView />
      </ToolProvider>,
    )
    expect(screen.getByText('Unit Converter')).toBeTruthy()
    expect(screen.getByText('Input Unit')).toBeTruthy()
  })
})
