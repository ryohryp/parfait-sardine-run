import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/psrun-api': {
        target: 'https://howasaba-code.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/psrun-api/, ''),
        headers: {
          'Origin': 'https://howasaba-code.com',
          'Referer': 'https://howasaba-code.com/',
        },
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})
