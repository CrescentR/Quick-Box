import { create } from 'zustand'
import { loadMarketPlugins } from '../api/plugin-market-api'
import type {
  MarketPluginCategory,
  MarketPluginItem,
  MarketPluginPricing,
  MarketPluginQuery,
  MarketSource,
} from '../core/plugin-market/plugin-market-types'

type MarketStatus = 'idle' | 'loading' | 'ready' | 'error'

interface PluginMarketState {
  items: MarketPluginItem[]
  selectedPluginId?: string
  query: MarketPluginQuery
  source: MarketSource
  refreshedAt?: string
  status: MarketStatus
  error?: string
  hydrateMarket: () => Promise<void>
  refreshMarket: () => Promise<void>
  setKeyword: (keyword: string) => Promise<void>
  setCategory: (category: MarketPluginCategory) => Promise<void>
  setPricing: (pricing: 'all' | MarketPluginPricing) => Promise<void>
  selectPlugin: (pluginId: string) => void
}

const initialQuery: MarketPluginQuery = {
  keyword: '',
  category: 'all',
  pricing: 'all',
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export const usePluginMarketStore = create<PluginMarketState>((set, get) => ({
  items: [],
  selectedPluginId: undefined,
  query: initialQuery,
  source: 'mock',
  refreshedAt: undefined,
  status: 'idle',
  error: undefined,
  hydrateMarket: async () => {
    if (get().status === 'loading') return
    await get().refreshMarket()
  },
  refreshMarket: async () => {
    set({ status: 'loading', error: undefined })
    try {
      const marketResponse = await loadMarketPlugins(get().query)
      const selectedPluginId = get().selectedPluginId ?? marketResponse.items[0]?.id
      const selectedStillExists = marketResponse.items.some((item) => item.id === selectedPluginId)
      set({
        items: marketResponse.items,
        selectedPluginId: selectedStillExists ? selectedPluginId : marketResponse.items[0]?.id,
        source: marketResponse.source,
        refreshedAt: marketResponse.refreshedAt,
        status: 'ready',
        error: undefined,
      })
    } catch (error) {
      set({ status: 'error', error: getErrorMessage(error) })
    }
  },
  setKeyword: async (keyword) => {
    set((state) => ({ query: { ...state.query, keyword } }))
    await get().refreshMarket()
  },
  setCategory: async (category) => {
    set((state) => ({ query: { ...state.query, category } }))
    await get().refreshMarket()
  },
  setPricing: async (pricing) => {
    set((state) => ({ query: { ...state.query, pricing } }))
    await get().refreshMarket()
  },
  selectPlugin: (pluginId) => set({ selectedPluginId: pluginId }),
}))
