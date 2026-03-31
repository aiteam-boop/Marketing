import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5050,
    strictPort: true, // Prevents jumping to another port and breaking the proxy
    host: '0.0.0.0',
    allowedHosts: 'all', // Fixes "Blocked request" error on Render/Cloud
    proxy: {
      '/api': {
        target: 'http://localhost:5051',
        changeOrigin: true
      }
    }
  }
})
