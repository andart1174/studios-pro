// Test if the real binary link is CORS accessible (simulating mobile phone fetch)
// and also test what happens with the litterlbox catbox as fallback
(async () => {
  try {
    // The real binary link from tmpfiles has a timestamp in the URL
    // Let's check the CORS headers on the real link
    const testUrl = 'https://tmpfiles.org/dl/1784595659.3878e73e898db8d3/wbw49OjLh6rM/test_model.stl';
    console.log('Fetching real binary URL:', testUrl);
    
    const res = await fetch(testUrl);
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    const text = await res.text();
    console.log('Content:', text);
    
  } catch(e) {
    console.error('CORS or fetch error:', e.message);
  }
  
  // Also test litterbox
  try {
    const fd = new FormData();
    const testContent = 'solid test\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test';
    const blob = new Blob([testContent], { type: 'application/octet-stream' });
    fd.append('reqtype', 'fileupload');
    fd.append('time', '72h');
    fd.append('fileToUpload', blob, 'test_model.stl');
    
    console.log('\nTesting litterbox...');
    const r2 = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: fd
    });
    const urlText = (await r2.text()).trim();
    console.log('Litterbox response:', urlText);
    
    if (urlText.startsWith('https://')) {
      const fileRes = await fetch(urlText);
      console.log('Litterbox file status:', fileRes.status, 'type:', fileRes.headers.get('content-type'));
      console.log('Access-Control:', fileRes.headers.get('access-control-allow-origin'));
    }
  } catch(e) {
    console.error('Litterbox error:', e.message);
  }
})();
