#!/usr/bin/env node

// 按 package.json 声明检查依赖是否都已安装：新增依赖后忘了 pnpm install 时，
// 这里直接给出缺失清单，而不是让 tsc / vite 报一串找不到模块的错误
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const declared = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })

// 查 node_modules/<name>/package.json 而不是 require.resolve：部分包的 exports 不暴露 "."
const missing = declared.filter((name) => !fs.existsSync(path.join(root, 'node_modules', name, 'package.json')))

if (missing.length > 0) {
  console.error('Missing npm dependencies:')
  missing.forEach((name) => console.error(`  - ${name}`))
  console.error('\nRun: pnpm install')
  process.exit(1)
}
