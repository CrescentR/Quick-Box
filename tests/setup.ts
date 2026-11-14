import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setActiveLanguage } from '../src/i18n'

Object.defineProperty(window.navigator, 'language', {
  value: 'zh-CN',
  configurable: true,
})
Object.defineProperty(window.navigator, 'languages', {
  value: ['zh-CN'],
  configurable: true,
})

beforeEach(() => {
  setActiveLanguage('zh-CN')
})

afterEach(cleanup)
