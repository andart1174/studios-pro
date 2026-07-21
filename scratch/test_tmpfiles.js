async function resolveModelUrl(url) {
  let directUrl = url;
  if (directUrl.includes('tmpfiles.org')) {
    // If it's a tmpfiles page URL or landing URL, fetch HTML to get real binary download link
    const pageRes = await fetch(directUrl);
    const contentType = pageRes.headers.get('content-type') || '';
    if (contentType.includes('html')) {
      const html = await pageRes.text();
      const match = html.match(/href="([^"]+)">Download/);
      if (match) {
        directUrl = match[1];
        console.log('Resolved tmpfiles real binary URL:', directUrl);
      }
    }
  }
  const res = await fetch(directUrl);
  return res;
}

async function test() {
  const testUrl = 'https://tmpfiles.org/dl/w1wE9QjyrdBi/test.stl';
  const res = await resolveModelUrl(testUrl);
  console.log('Final status:', res.status, 'content-type:', res.headers.get('content-type'));
  const text = await res.text();
  console.log('Final content:', text);
}
test();
