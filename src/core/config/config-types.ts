import type { AppLanguage } from '../../i18n'

export interface QuickBoxConfig {
  hotkey: string
  theme: 'system' | 'light' | 'dark'
  language: AppLanguage
  enableTray: boolean
  alwaysOnTop: boolean
}
