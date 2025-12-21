import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1001,
    proxy: {
      '/api': {
        target: 'http://72.62.52.200:1002',
        changeOrigin: true,
      },
    },
  },
})