import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function decodeBase64Url(str) {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch (_) {
    return null;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ar-proxy-dev',
      configureServer(server) {
        server.middlewares.use('/api/ar-proxy', async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const urlObj = new URL(req.url, 'http://localhost');

          if (req.method === 'POST') {
            try {
              const chunks = [];
              for await (const chunk of req) chunks.push(chunk);
              const bodyBuf = Buffer.concat(chunks);
              const qName = urlObj.searchParams.get('name') || 'model.glb';

              // 1. Catbox permanent (guaranteed CORS *, direct .glb, 200MB capacity)
              try {
                const fdCat = new FormData();
                fdCat.append('reqtype', 'fileupload');
                fdCat.append('fileToUpload', new Blob([bodyBuf], { type: 'model/gltf-binary' }), qName);
                const rCat = await fetch('https://catbox.moe/user/api.php', {
                  method: 'POST',
                  body: fdCat,
                  signal: AbortSignal.timeout(45000)
                }).catch(() => null);
                if (rCat && rCat.ok) {
                  const txt = (await rCat.text()).trim();
                  if (txt.startsWith('https://')) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ status: 'success', url: txt, provider: 'catbox' }));
                    return;
                  }
                }
              } catch (_) {}

              // 2. Litterbox (72h temporary storage)
              try {
                const fdLit = new FormData();
                fdLit.append('reqtype', 'fileupload');
                fdLit.append('time', '72h');
                fdLit.append('fileToUpload', new Blob([bodyBuf], { type: 'model/gltf-binary' }), qName);
                const rLit = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
                  method: 'POST',
                  body: fdLit,
                  signal: AbortSignal.timeout(30000)
                }).catch(() => null);
                if (rLit && rLit.ok) {
                  const txt = (await rLit.text()).trim();
                  if (txt.startsWith('https://')) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ status: 'success', url: txt, provider: 'litterbox' }));
                    return;
                  }
                }
              } catch (_) {}

              // 3. Uguu.se (100MB capacity fallback)
              try {
                const fdUguu = new FormData();
                fdUguu.append('files[]', new Blob([bodyBuf], { type: 'model/gltf-binary' }), qName);
                const rUguu = await fetch('https://uguu.se/upload', {
                  method: 'POST',
                  body: fdUguu,
                  signal: AbortSignal.timeout(30000)
                }).catch(() => null);
                if (rUguu && rUguu.ok) {
                  const j = await rUguu.json().catch(() => null);
                  if (j && j.success && j.files && j.files[0] && j.files[0].url) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ status: 'success', url: j.files[0].url, provider: 'uguu' }));
                    return;
                  }
                }
              } catch (_) {}

              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'error', error: 'All upload providers failed' }));
              return;
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'error', error: err.message }));
              return;
            }
          }

          let targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            const rest = urlObj.pathname.replace(/^\/+/, '');
            const firstSeg = rest.split('/')[0];
            if (firstSeg && firstSeg !== 'model.glb' && firstSeg !== 'model.gltf') {
              const decoded = decodeBase64Url(firstSeg);
              if (decoded && decoded.startsWith('http')) {
                targetUrl = decoded;
              }
            }
          }

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url query parameter');
            return;
          }
          try {
            let fetchUrl = targetUrl.replace(/^http:\/\/tmpfiles\.org\//i, 'https://tmpfiles.org/');
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
            res.setHeader('Content-Type', 'model/gltf-binary');
            res.setHeader('Content-Length', String(buf.length));
            res.setHeader('Content-Disposition', 'inline; filename="model.glb"');
            res.end(req.method === 'HEAD' ? undefined : buf);
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
      },
      '/api/litterbox': {
        target: 'https://litterbox.catbox.moe',
        changeOrigin: true,
        rewrite: () => '/resources/internals/api.php'
      },
      '/api/uguu': {
        target: 'https://uguu.se',
        changeOrigin: true,
        rewrite: () => '/upload'
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
