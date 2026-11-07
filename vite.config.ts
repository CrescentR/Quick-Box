import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
