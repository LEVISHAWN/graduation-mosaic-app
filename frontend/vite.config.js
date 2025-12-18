import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config with proxy so fetch('/api/...') from the frontend is forwarded
// to the Flask backend running at http://127.0.0.1:5000 during development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
