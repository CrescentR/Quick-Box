import type { PluginPermission } from '../plugin/permission-types'

export type MarketPluginCategory =
  | 'all'
  | 'developer-basic'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'image'
  | 'ocr'
  | 'ai'
  | 'database'
  | 'pdf'

export type MarketPluginPricing = 'free' | 'membership'
export type MarketPluginRuntime = 'frontend' | 'native-process' | 'remote-service'
export type MarketPluginInstallStatus = 'not-installed' | 'installed' | 'enabled' | 'disabled' | 'update-available'
export type MarketSource = 'remote' | 'mock'

export interface MarketPluginPackage {
  url: string
  sha256: string
  signature?: string
}

export interface MarketPluginItem {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: Exclude<MarketPluginCategory, 'all'>
  tags: string[]
  pricing: MarketPluginPricing
  requiredEntitlements: string[]
  platforms: string[]
  sizeBytes: number
  unpackedSizeBytes: number
  offline: boolean
  requiresNetwork: boolean
  permissions: PluginPermission[]
  containsModel: boolean
  requiresConfiguration: boolean
  runtime: MarketPluginRuntime
  dependencies: string[]
  latestPackage: MarketPluginPackage
  updatedAt: string
  screenshots?: string[]
  changelog?: string
}

export interface MarketPluginQuery {
  keyword: string
  category: MarketPluginCategory
  pricing: 'all' | MarketPluginPricing
}

export interface MarketPluginResponse {
  source: MarketSource
  refreshedAt: string
  items: MarketPluginItem[]
}
