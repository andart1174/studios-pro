// Test full AR QR code URL flow
(async () => {
  try {
    // 1. Upload test file
    const fd = new FormData();
    const testContent = 'solid test\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test';
    const blob = new Blob([testContent], { type: 'application/octet-stream' });
    fd.append('file', blob, 'test_model.stl');
    
    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: fd
    });
    const uploadJson = await uploadRes.json();
    console.log('Upload result:', uploadJson);
    
    const landingUrl = uploadJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    console.log('Landing URL (this is what goes in QR code currently):', landingUrl);
    
    // 2. Check what phone gets when fetching landing URL directly
    const htmlRes = await fetch(landingUrl);
    console.log('Landing HTML status:', htmlRes.status, 'type:', htmlRes.headers.get('content-type'));
    const html = await htmlRes.text();
    
    const match = html.match(/href="([^"]+)">Download/);
    if (match) {
      const realLink = match[1];
      console.log('Real binary link found:', realLink);
      
      const fileRes = await fetch(realLink);
      console.log('File fetch status:', fileRes.status, 'type:', fileRes.headers.get('content-type'));
      const text = await fileRes.text();
      console.log('Content preview:', text.slice(0, 100));
    } else {
      console.log('No Download link in HTML!');
      console.log('HTML preview:', html.slice(0, 500));
    }
  } catch(e) {
    console.error('Error:', e.message, e.stack);
  }
})();
