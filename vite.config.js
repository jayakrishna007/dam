import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT) || 5173,
    proxy: {
      '/api': {
        target: 'https://damtoday.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
