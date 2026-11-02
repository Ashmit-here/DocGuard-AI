import react from '@vitejs/plugin-react'
import { env } from 'node:process'
import { defineConfig } from 'vite'

const apiProxyTarget =
  env.DOCGUARD_API_PROXY_TARGET ||
  env.API_PROXY_TARGET ||
  'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
