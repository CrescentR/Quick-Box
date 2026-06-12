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
