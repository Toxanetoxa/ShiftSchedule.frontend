import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { sourceAliases } from './config/aliases.ts'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: sourceAliases,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    clearMocks: true,
  },
})
