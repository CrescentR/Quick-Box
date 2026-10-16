import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// esbuild 的 JS API 会把超过 1MB 的 transform 输入先写成 os.tmpdir() 里的临时文件，再由 esbuild
// 进程读取后删除（esbuild/lib/main.js 中 input.length > 1024 * 1024 的分支）。本机的文件沙箱会拒绝
// 删除系统临时目录中的这类文件，构建便中断在 vite:esbuild-transpile 上并报
// “remove C:\...\esbuild-xxx: Access is denied.”——本项目有个 2MB 级的命令速查分块，所以必现。
// 把构建用的临时目录放进仓库即可绕开，也避免大文件碎片残留在系统 Temp 里。
const buildTempDir = path.resolve('.tmp-build')
fs.mkdirSync(buildTempDir, { recursive: true })
process.env.TEMP = buildTempDir
process.env.TMP = buildTempDir

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  cacheDir: 'node_modules/.vite',
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'zustand',
      'clsx',
      '@tauri-apps/api/core',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/src-tauri/target/**', '**/target/**'],
    },
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
  },
})
