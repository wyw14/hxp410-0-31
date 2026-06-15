import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 41031,
    proxy: {
      '/api': {
        target: 'http://localhost:41131',
        changeOrigin: true
      }
    }
  }
})
