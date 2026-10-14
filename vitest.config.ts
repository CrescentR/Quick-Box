import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], test: { maxWorkers: 1, fileParallelism: false, environment: 'jsdom', include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] } })
