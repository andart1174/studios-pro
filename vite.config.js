import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://tmpfiles.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, '')
      }
    }
  },
  build: {
    // Split large bundle into smaller async chunks for faster LCP / FID
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-stripe':   ['@stripe/stripe-js'],
          'vendor-motion':   ['framer-motion'],
          'vendor-icons':    ['lucide-react'],
        }
      }
    },
    // Raise warning threshold — real chunks now much smaller
    chunkSizeWarningLimit: 600,
    // Minify CSS
    cssMinify: true,
  }
})
