import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { sourceAliases } from './config/aliases.ts'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), ...(command === 'serve' ? [vueDevTools()] : [])],
    resolve: {
      alias: sourceAliases,
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.FRONT_PORT || 5173),
      strictPort: true,
      hmr: {
        host: env.VITE_HMR_HOST || 'localhost',
        clientPort: Number(env.FRONT_PORT || 5173),
      },
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
