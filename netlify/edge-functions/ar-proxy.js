const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

function decodeBase64Url(str) {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    return atob(b64);
  } catch (_) {
    return null;
  }
}

async function handleUpload(request) {
  let fileBlob = null;
  let fileName = 'model.glb';

  try {
    const cType = (request.headers.get('content-type') || '').toLowerCase();
    if (cType.includes('multipart/form-data')) {
      const inFd = await request.formData();
      const f = inFd.get('file') || inFd.get('fileToUpload') || inFd.get('files[]');
      if (f && typeof f.arrayBuffer === 'function') {
        const ab = await f.arrayBuffer();
        fileBlob = new Blob([ab], { type: 'model/gltf-binary' });
        if (f.name) fileName = f.name;
      }
    } else {
      const ab = await request.arrayBuffer();
      if (ab && ab.byteLength > 0) {
        fileBlob = new Blob([ab], { type: 'model/gltf-binary' });
        const qName = new URL(request.url).searchParams.get('name');
        if (qName) fileName = qName;
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', error: 'Invalid upload payload: ' + err.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  if (!fileBlob || fileBlob.size === 0) {
    return new Response(JSON.stringify({ status: 'error', error: 'Empty file uploaded' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // 1. Try Catbox permanent (guaranteed direct .glb binary with CORS *, 200MB limit)
  try {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', fileBlob, fileName);
    const r = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: { 'User-Agent': ua },
      body: fd,
      signal: AbortSignal.timeout(45000)
    });
    if (r.ok) {
      const txt = (await r.text()).trim();
      if (txt.startsWith('https://')) {
        return new Response(JSON.stringify({ status: 'success', url: txt, provider: 'catbox' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (_) {}

  // 2. Try Litterbox (Catbox 72h temporary storage - guaranteed direct .glb binary with CORS *)
  try {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('time', '72h');
    fd.append('fileToUpload', fileBlob, fileName);
    const r = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      headers: { 'User-Agent': ua },
      body: fd,
      signal: AbortSignal.timeout(30000)
    });
    if (r.ok) {
      const txt = (await r.text()).trim();
      if (txt.startsWith('https://')) {
        return new Response(JSON.stringify({ status: 'success', url: txt, provider: 'litterbox' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (_) {}

  // 3. Try Uguu.se
  try {
    const fd = new FormData();
    fd.append('files[]', fileBlob, fileName);
    const r = await fetch('https://uguu.se/upload', {
      method: 'POST',
      headers: { 'User-Agent': ua, 'Accept': 'application/json' },
      body: fd,
      signal: AbortSignal.timeout(12000)
    });
    if (r.ok) {
      const json = await r.json();
      if (json && json.success && json.files && json.files[0] && json.files[0].url) {
        return new Response(JSON.stringify({ status: 'success', url: json.files[0].url, provider: 'uguu' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (_) {}

  // 4. Try 0x0.st
  try {
    const fd = new FormData();
    fd.append('file', fileBlob, fileName);
    const r = await fetch('https://0x0.st', {
      method: 'POST',
      headers: { 'User-Agent': 'StudiosProAR/1.0' },
      body: fd,
      signal: AbortSignal.timeout(12000)
    });
    if (r.ok) {
      const txt = (await r.text()).trim();
      if (txt.startsWith('https://')) {
        return new Response(JSON.stringify({ status: 'success', url: txt, provider: '0x0' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (_) {}

  // 5. Try Catbox permanent
  try {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', fileBlob, fileName);
    const r = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: { 'User-Agent': ua },
      body: fd,
      signal: AbortSignal.timeout(12000)
    });
    if (r.ok) {
      const txt = (await r.text()).trim();
      if (txt.startsWith('https://')) {
        return new Response(JSON.stringify({ status: 'success', url: txt, provider: 'catbox' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (_) {}

  return new Response(JSON.stringify({ status: 'error', error: 'All upstream cloud providers failed' }), {
    status: 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method === 'POST') {
    return handleUpload(request);
  }

  const reqUrl = new URL(request.url);
  let urlParam = reqUrl.searchParams.get('url');

  // Support path-encoded base64url: /api/ar-proxy/<base64url>/model.glb
  if (!urlParam) {
    const rest = reqUrl.pathname.replace(/^\/api\/ar-proxy\/?/, '');
    const firstSeg = rest.split('/')[0];
    if (firstSeg && firstSeg !== 'model.glb' && firstSeg !== 'model.gltf' && firstSeg !== 'model.usdz') {
      const decoded = decodeBase64Url(firstSeg);
      if (decoded && decoded.startsWith('http')) {
        urlParam = decoded;
      }
    }
  }

  if (!urlParam) {
    return new Response('Missing url parameter', {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  try {
    let fetchUrl = urlParam.replace(/^http:\/\/tmpfiles\.org\//i, 'https://tmpfiles.org/');
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
      return new Response(`Upstream error: ${response.status}`, {
        status: response.status,
        headers: CORS_HEADERS
      });
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

    let finalContentType = 'model/gltf-binary';
    if (fetchUrl.endsWith('.gltf') || contentType.includes('json')) {
      finalContentType = 'model/gltf+json';
    } else if (fetchUrl.endsWith('.usdz')) {
      finalContentType = 'model/vnd.usdz+zip';
    }

    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', finalContentType);
    headers.set('Content-Length', String(arrayBuffer.byteLength));
    headers.set('Content-Disposition', 'inline; filename="model.glb"');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400, immutable');

    return new Response(request.method === 'HEAD' ? null : arrayBuffer, {
      status: 200,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  }
};
