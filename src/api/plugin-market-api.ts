import { defaultMarketItems } from '../core/plugin-market/default-market-items'
import type { MarketPluginQuery, MarketPluginResponse } from '../core/plugin-market/plugin-market-types'

const marketEndpointStorageKey = 'quickbox.market.endpoint'
const requestTimeoutMs = 6000

function getMarketEndpoint() {
  const storedEndpoint = window.localStorage.getItem(marketEndpointStorageKey)?.trim()
  if (storedEndpoint) return storedEndpoint.replace(/\/$/, '')

  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> }
  const envEndpoint = meta.env?.VITE_QUICKBOX_MARKET_URL
  return envEndpoint?.trim().replace(/\/$/, '') || ''
}

function matchesQuery(itemText: string, keyword: string) {
  return !keyword || itemText.toLowerCase().includes(keyword.toLowerCase())
}

function filterMarketItems(query: MarketPluginQuery) {
  const keyword = query.keyword.trim()
  return defaultMarketItems.filter((item) => {
    const text = [item.name, item.description, item.author, item.category, ...item.tags].join(' ')
    const categoryMatched = query.category === 'all' || item.category === query.category
    const pricingMatched = query.pricing === 'all' || item.pricing === query.pricing
    return categoryMatched && pricingMatched && matchesQuery(text, keyword)
  })
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    return await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

export async function loadMarketPlugins(query: MarketPluginQuery): Promise<MarketPluginResponse> {
  const endpoint = getMarketEndpoint()
  if (!endpoint) {
    return {
      source: 'mock',
      refreshedAt: new Date().toISOString(),
      items: filterMarketItems(query),
    }
  }

  const searchParams = new URLSearchParams()
  if (query.keyword.trim()) searchParams.set('keyword', query.keyword.trim())
  if (query.category !== 'all') searchParams.set('category', query.category)
  if (query.pricing !== 'all') searchParams.set('pricing', query.pricing)

  const response = await fetchWithTimeout(`${endpoint}/api/market/plugins?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error(`插件市场接口返回 ${response.status}`)
  }

  const payload = (await response.json()) as Omit<MarketPluginResponse, 'source'>
  return {
    source: 'remote',
    refreshedAt: payload.refreshedAt ?? new Date().toISOString(),
    items: Array.isArray(payload.items) ? payload.items : [],
  }
}
