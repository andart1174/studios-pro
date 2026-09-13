export default async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  const urlParam = new URL(request.url).searchParams.get('url');
  if (!urlParam) {
    return new Response('Missing url query parameter', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    let fetchUrl = urlParam;
    if (fetchUrl.includes('tmpfiles.org') && !fetchUrl.includes('/dl/') && !fetchUrl.includes('/api/v1/')) {
      fetchUrl = fetchUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }

    let response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, {
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' }
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        });
        contentType = (response.headers.get('content-type') || '').toLowerCase();
      }
    }

    let finalContentType = 'model/gltf-binary';
    if (fetchUrl.endsWith('.gltf') || contentType.includes('json')) {
      finalContentType = 'model/gltf+json';
    } else if (fetchUrl.endsWith('.usdz')) {
      finalContentType = 'model/vnd.usdz+zip';
    }

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Content-Type', finalContentType);
    headers.set('Cache-Control', 'public, max-age=86400, immutable');

    return new Response(response.body, {
      status: 200,
      headers
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};
