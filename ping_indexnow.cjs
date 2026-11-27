const fs = require('fs');
const path = require('path');
const https = require('https');

const key = 'f89ae7b4f1094014a700fcd8d747035b';
const keyFile = path.join(__dirname, 'public', `${key}.txt`);

// 1. Ensure the single official IndexNow key file exists in public/
if (!fs.existsSync(keyFile)) {
  fs.writeFileSync(keyFile, key.trim(), 'utf8');
  console.log(`Generated IndexNow key file: public/${key}.txt`);
}

// 2. Read all canonical <loc> URLs from sitemap.xml (including homepage https://studios-pro.com/)
const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('Sitemap file not found, skipping IndexNow ping.');
  process.exit(0);
}

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
const locRegex = /<loc>(https:\/\/studios-pro\.com\/[^<]*)<\/loc>/g;
const urlSet = new Set();
let match;
while ((match = locRegex.exec(sitemapContent)) !== null) {
  urlSet.add(match[1].trim());
}
const urlList = Array.from(urlSet);

if (urlList.length === 0) {
  console.log('No URLs found in sitemap, skipping IndexNow ping.');
  process.exit(0);
}

console.log(`Extracted ${urlList.length} canonical URLs (homepage included: ${urlSet.has('https://studios-pro.com/')}) for IndexNow ping.`);

// 3. Submit ONCE to the official central IndexNow hub (automatically fans out to Bing, Yandex, Seznam, Naver)
const payload = JSON.stringify({
  host: 'studios-pro.com',
  key,
  keyLocation: `https://studios-pro.com/${key}.txt`,
  urlList
});

const options = {
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const bodyPreview = data.trim().slice(0, 300);
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log(`SUCCESS: IndexNow (api.indexnow.org) accepted ${urlList.length} URLs (HTTP ${res.statusCode}).`);
    } else {
      console.log(`IndexNow (api.indexnow.org) returned HTTP ${res.statusCode}${bodyPreview ? `: ${bodyPreview}` : ''}`);
    }
  });
});

req.on('error', (e) => {
  console.warn(`IndexNow ping error: ${e.message}`);
});

req.write(payload);
req.end();
