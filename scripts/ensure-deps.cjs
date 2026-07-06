#!/usr/bin/env node

const requiredModules = [
  'jsqr',
  'qrcode.react',
  'react-diff-viewer-continued',
]

const missing = requiredModules.filter((name) => {
  try {
    require.resolve(name)
    return false
  } catch {
    return true
  }
})

if (missing.length > 0) {
  console.error('Missing npm dependencies:')
  missing.forEach((name) => console.error(`  - ${name}`))
  console.error('\nRun: pnpm install')
  process.exit(1)
}
