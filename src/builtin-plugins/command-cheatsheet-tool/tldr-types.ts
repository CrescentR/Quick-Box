import { lt, type ResolvedLocale } from '../../i18n'

export type TldrPlatform = 'common' | 'linux' | 'osx' | 'windows'

export interface TldrExample {
  description: string
  command: string
}

export interface TldrPage {
  id: string
  command: string
  platform: TldrPlatform
  summary: string
  moreInfo?: string
  aliases?: string[]
  examples: TldrExample[]
}

export const tldrPlatformLabels: Record<TldrPlatform, string> = {
  common: '通用',
  linux: 'Linux',
  osx: 'macOS',
  windows: 'Windows',
}

export function getTldrPlatformLabel(platform: TldrPlatform, locale?: ResolvedLocale): string {
  if (platform === 'common') return lt('通用', 'Common', locale)
  return tldrPlatformLabels[platform]
}
