import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ar-proxy-dev',
      configureServer(server) {
        server.middlewares.use('/api/ar-proxy', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.statusCode = 204;
            res.end();
            return;
          }
          const urlObj = new URL(req.url, 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url query parameter');
            return;
          }
          try {
            let fetchUrl = targetUrl;
            if (fetchUrl.includes('tmpfiles.org') && !fetchUrl.includes('/dl/') && !fetchUrl.includes('/api/v1/')) {
              fetchUrl = fetchUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            }
            let upstream = await fetch(fetchUrl);
            let cType = (upstream.headers.get('content-type') || '').toLowerCase();
            if (cType.includes('html')) {
              const htmlText = await upstream.text();
              const m = htmlText.match(/href=["']([^"']*\/(?:dl|files)\/[^"']+)["']/i) || htmlText.match(/href=["']([^"']+)["']>Download/i);
              if (m) {
                let realLink = m[1].startsWith('http') ? m[1] : 'https://tmpfiles.org' + (m[1].startsWith('/') ? '' : '/') + m[1];
                upstream = await fetch(realLink);
              }
            }
            const buf = Buffer.from(await upstream.arrayBuffer());
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'model/gltf-binary');
            res.end(buf);
          } catch(e) {
            res.statusCode = 502;
            res.end(e.message);
          }
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://tmpfiles.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, '')
      },
      '/api/proxy-catbox': {
        target: 'https://catbox.moe',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy-catbox/, '')
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
