import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 使用默认的并行 forks 池：比串行执行快约 3 倍。
// 不要改成 vmThreads：VM 上下文里没有 crypto.subtle，哈希类测试会失败。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
})
