import { create } from 'zustand'
import type { InstalledPlugin, MarketIndex, MarketPluginItem, MarketPluginView } from '../core/plugin-market/market-types'
import type { PluginCategory } from '../core/plugin-market/plugin-spec'
import { isRemoteNewer } from '../core/plugin-market/semver'
import {
  disablePlugin,
  enablePlugin,
  fetchMarketIndex,
  getMarketSourceUrl,
  installPlugin,
  loadInstalledPlugins,
  setMarketSourceUrl,
  uninstallPlugin,
  updatePlugin,
} from '../api/plugin-market-api'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type ActionStatus = 'idle' | 'installing' | 'uninstalling' | 'updating' | 'toggling'

interface PluginMarketState {
  /** 远程市场索引 */
  marketIndex: MarketIndex | null
  /** 本地已安装插件 */
  installedPlugins: InstalledPlugin[]
  /** 市场源地址 */
  sourceUrl: string
  /** 索引加载状态 */
  status: LoadStatus
  /** 操作状态 */
  actionStatus: ActionStatus
  /** 当前正在操作的插件 ID */
  activePluginId: string | null
 /** 错误信息 */
  error?: string
  /** 搜索关键词 */
  searchQuery: string
  /** 当前选中的分类（空字符串 = 全部） */
  selectedCategory: string

  // ---- Actions ----
  hydrate: () => Promise<void>
  refreshMarket: () => Promise<void>
  setSourceUrl: (url: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  install: (item: MarketPluginItem) => Promise<void>
  update: (item: MarketPluginItem) => Promise<void>
  uninstall: (pluginId: string) => Promise<void>
  toggleEnabled: (plugin: InstalledPlugin) => Promise<void>

  /** 合并市场数据与本地安装信息的展示列表 */
  getMarketViews: () => MarketPluginView[]
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') return error.message
    if ('code' in error && typeof error.code === 'string') return error.code
  }
  return error instanceof Error ? error.message : String(error)
}

function buildMarketViews(
  marketIndex: MarketIndex | null,
  installedPlugins: InstalledPlugin[],
): MarketPluginView[] {
  if (!marketIndex) return []

  const installedById = new Map(installedPlugins.map((p) => [p.id, p]))

  return marketIndex.plugins.map((item) => {
    const installed = installedById.get(item.id)
    if (!installed) {
      return { ...item, status: 'not-installed', enabled: false }
    }

    const updatable = isRemoteNewer(item.version, installed.version)
    return {
      ...item,
      status: updatable ? 'updatable' : installed.enabled ? 'installed' : 'disabled',
      installedVersion: installed.version,
      enabled: installed.enabled,
    }
  })
}

export const usePluginMarketStore = create<PluginMarketState>((set, get) => ({
  marketIndex: null,
  installedPlugins: [],
  sourceUrl: '',
  status: 'idle',
  actionStatus: 'idle',
  activePluginId: null,
  error: undefined,
  searchQuery: '',
  selectedCategory: '',

  hydrate: async () => {
    if (get().status === 'loading') return
    set({ status: 'loading', error: undefined })

    try {
      const [sourceUrl, installedPlugins] = await Promise.all([
        getMarketSourceUrl(),
        loadInstalledPlugins(),
      ])
      set({ sourceUrl, installedPlugins, status: 'ready', error: undefined })
    } catch (error) {
      set({ status: 'error', error: getErrorMessage(error) })
    }
  },

  refreshMarket: async () => {
    const { sourceUrl } = get()
    set({ status: 'loading', error: undefined })

    try {
      const marketIndex = await fetchMarketIndex(sourceUrl || undefined)
      set({ marketIndex, status: 'ready', error: undefined })
    } catch (error) {
      set({ status: 'error', error: getErrorMessage(error) })
    }
  },

  setSourceUrl: async (url) => {
    set({ sourceUrl: url })
    try {
      await setMarketSourceUrl(url)
    } catch (error) {
      set({ error: getErrorMessage(error) })
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  install: async (item) => {
    set({ actionStatus: 'installing', activePluginId: item.id, error: undefined })
    try {
      await installPlugin({ pluginId: item.id, downloadUrl: item.downloadUrl, sha256: item.sha256 })
      const installedPlugins = await loadInstalledPlugins()
      set({ installedPlugins, actionStatus: 'idle', activePluginId: null })
    } catch (error) {
      set({ actionStatus: 'idle', activePluginId: null, error: getErrorMessage(error) })
      throw error
    }
  },

  update: async (item) => {
    set({ actionStatus: 'updating', activePluginId: item.id, error: undefined })
    try {
      await updatePlugin({ pluginId: item.id, downloadUrl: item.downloadUrl, sha256: item.sha256 })
      const installedPlugins = await loadInstalledPlugins()
      set({ installedPlugins, actionStatus: 'idle', activePluginId: null })
    } catch (error) {
      set({ actionStatus: 'idle', activePluginId: null, error: getErrorMessage(error) })
      throw error
    }
  },

  uninstall: async (pluginId) => {
    set({ actionStatus: 'uninstalling', activePluginId: pluginId, error: undefined })
    try {
      await uninstallPlugin(pluginId)
      const installedPlugins = await loadInstalledPlugins()
      set({ installedPlugins, actionStatus: 'idle', activePluginId: null })
    } catch (error) {
      set({ actionStatus: 'idle', activePluginId: null, error: getErrorMessage(error) })
      throw error
    }
  },

  toggleEnabled: async (plugin) => {
    set({ actionStatus: 'toggling', activePluginId: plugin.id, error: undefined })
    try {
      if (plugin.enabled) {
        await disablePlugin(plugin.id)
      } else {
        await enablePlugin(plugin.id)
      }
      const installedPlugins = await loadInstalledPlugins()
      set({ installedPlugins, actionStatus: 'idle', activePluginId: null })
    } catch (error) {
      set({ actionStatus: 'idle', activePluginId: null, error: getErrorMessage(error) })
      throw error
    }
  },

  getMarketViews: () => {
    const { marketIndex, installedPlugins } = get()
    return buildMarketViews(marketIndex, installedPlugins)
  },
}))
