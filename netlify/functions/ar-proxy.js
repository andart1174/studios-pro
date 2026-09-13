exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    };
  }

  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;
  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain'
      },
      body: 'Missing url query parameter'
    };
  }

  try {
    let fetchUrl = targetUrl;
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
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': finalContentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=86400, immutable'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
