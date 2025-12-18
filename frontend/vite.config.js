import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Load the PWA plugin only if it's installed. This allows `npm run dev`
// to work in environments where `vite-plugin-pwa` couldn't be installed.
// We export an async config so we can use dynamic import safely.
export default defineConfig(async () => {
  let pwaPlugins = []
  try {
    const mod = await import('vite-plugin-pwa')
    const { VitePWA } = mod
    pwaPlugins = [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Graduation Memory Keeper',
          short_name: 'MemoryKeeper',
          description: 'Create and preserve graduation memories and mosaics',
          theme_color: '#0ea5a4',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
        }
      })
    ]
  } catch (e) {
    // plugin not installed — continue without PWA support for dev
    // eslint-disable-next-line no-console
    console.warn('vite-plugin-pwa not installed; skipping PWA plugin')
  }

  return {
    plugins: [react(), ...pwaPlugins],
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
  }
})
