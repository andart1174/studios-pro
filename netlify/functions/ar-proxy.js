const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

function decodeBase64Url(str) {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch (_) {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  // Handle POST upload fallback
  if (event.httpMethod === 'POST') {
    try {
      const rawBuf = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64')
        : Buffer.from(event.body || '', 'utf8');
      const fileName = (event.queryStringParameters && event.queryStringParameters.name) || 'model.glb';
      const blob = new Blob([rawBuf], { type: 'model/gltf-binary' });
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

      // 1. tmpfiles.org
      try {
        const fd = new FormData();
        fd.append('file', blob, fileName);
        const r = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          headers: { 'User-Agent': ua, 'Accept': 'application/json' },
          body: fd
        });
        if (r.ok) {
          const json = await r.json();
          if (json && json.status === 'success' && json.data && json.data.url) {
            const dlUrl = json.data.url.replace(/^http:\/\//i, 'https://').replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            return {
              statusCode: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'success', url: dlUrl })
            };
          }
        }
      } catch (_) {}

      // 2. Litterbox
      try {
        const fd = new FormData();
        fd.append('reqtype', 'fileupload');
        fd.append('time', '72h');
        fd.append('fileToUpload', blob, fileName);
        const r = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
          method: 'POST',
          headers: { 'User-Agent': ua },
          body: fd
        });
        if (r.ok) {
          const txt = (await r.text()).trim();
          if (txt.startsWith('https://')) {
            return {
              statusCode: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'success', url: txt })
            };
          }
        }
      } catch (_) {}

      return {
        statusCode: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'error', error: 'Upstream upload failed' })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'error', error: err.message })
      };
    }
  }

  let targetUrl = event.queryStringParameters && event.queryStringParameters.url;
  if (!targetUrl && event.path) {
    const rest = event.path.replace(/^\/?(?:\.netlify\/functions\/ar-proxy|api\/ar-proxy)\/?/, '');
    const firstSeg = rest.split('/')[0];
    if (firstSeg && firstSeg !== 'model.glb' && firstSeg !== 'model.gltf') {
      const decoded = decodeBase64Url(firstSeg);
      if (decoded && decoded.startsWith('http')) {
        targetUrl = decoded;
      }
    }
  }

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
      body: 'Missing url query parameter'
    };
  }

  try {
    let fetchUrl = targetUrl.replace(/^http:\/\/tmpfiles\.org\//i, 'https://tmpfiles.org/');
    if (fetchUrl.includes('tmpfiles.org') && !fetchUrl.includes('/dl/') && !fetchUrl.includes('/api/v1/')) {
      fetchUrl = fetchUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }

    let response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: 'Upstream error: ' + response.status + ' ' + response.statusText
      };
    }

    let contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('html')) {
      const htmlText = await response.text();
      const m = htmlText.match(/href=["']([^"']*\/(?:dl|files)\/[^"']+)["']/i) || htmlText.match(/href=["']([^"']+)["']>Download/i);
      if (m) {
        let realLink = m[1];
        if (!realLink.startsWith('http')) {
          realLink = 'https://tmpfiles.org' + (realLink.startsWith('/') ? '' : '/') + realLink;
        }
        response = await fetch(realLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        });
        contentType = (response.headers.get('content-type') || '').toLowerCase();
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let finalContentType = 'model/gltf-binary';
    if (fetchUrl.endsWith('.gltf') || contentType.includes('json')) {
      finalContentType = 'model/gltf+json';
    } else if (fetchUrl.endsWith('.usdz')) {
      finalContentType = 'model/vnd.usdz+zip';
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': finalContentType,
        'Content-Length': String(buffer.length),
        'Content-Disposition': 'inline; filename="model.glb"',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, immutable'
      },
      body: event.httpMethod === 'HEAD' ? '' : buffer.toString('base64'),
      isBase64Encoded: event.httpMethod !== 'HEAD'
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
