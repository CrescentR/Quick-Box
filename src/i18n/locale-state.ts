import { useSyncExternalStore } from 'react'

export type AppLanguage = 'system' | 'zh-CN' | 'en-US'
export type ResolvedLocale = 'zh-CN' | 'en-US'

let activeLanguage: AppLanguage = 'system'
const listeners = new Set<() => void>()

export function detectSystemLocale(): ResolvedLocale {
  if (typeof navigator === 'undefined') return 'en-US'
  const lang = (navigator.languages?.[0] || navigator.language || 'en-US').toLowerCase()
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function resolveLocale(language: AppLanguage = activeLanguage): ResolvedLocale {
  if (language === 'zh-CN' || language === 'en-US') return language
  return detectSystemLocale()
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage
}

export function setActiveLanguage(language: AppLanguage) {
  if (activeLanguage === language) return
  activeLanguage = language
  for (const listener of listeners) listener()
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getCurrentLocale(): ResolvedLocale {
  return resolveLocale(activeLanguage)
}

export function useLocale(): ResolvedLocale {
  const language = useSyncExternalStore(subscribeLocale, getActiveLanguage, getActiveLanguage)
  return resolveLocale(language)
}

export function lt(zh: string, en: string, locale: ResolvedLocale = getCurrentLocale()): string {
  return locale === 'en-US' ? en : zh
}

export function useT() {
  const locale = useLocale()
  return (zh: string, en: string) => (locale === 'en-US' ? en : zh)
}
