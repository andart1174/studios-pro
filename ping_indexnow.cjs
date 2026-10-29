const fs = require('fs');
const path = require('path');
const https = require('https');

const key = 'f89ae7b4f1094014a700fcd8d747035b';
const keyFile = path.join(__dirname, 'public', `${key}.txt`);

// 1. Ensure the key file exists in public/
if (!fs.existsSync(keyFile)) {
  fs.writeFileSync(keyFile, key.trim(), 'utf8');
  console.log(`Generated IndexNow key file: public/${key}.txt`);
}

// 2. Read all URLs from sitemap.xml
const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error("Sitemap file not found, skipping IndexNow ping.");
  process.exit(0);
}

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
const urlRegex = /https:\/\/studios-pro\.com\/[^\s<"]+/g;
const urlList = Array.from(new Set(sitemapContent.match(urlRegex) || []));

if (urlList.length === 0) {
  console.log("No URLs found in sitemap, skipping IndexNow ping.");
  process.exit(0);
}

console.log(`Extracted ${urlList.length} URLs for IndexNow ping.`);

// 3. Construct IndexNow payload
const payload = JSON.stringify({
  host: 'studios-pro.com',
  key: key,
  keyLocation: `https://studios-pro.com/${key}.txt`,
  urlList: urlList
});

// 4. Send POST request to verified IndexNow mesh endpoints (Yandex & Seznam propagate across all IndexNow engines including Bing)
const endpoints = [
  { hostname: 'yandex.com', path: '/indexnow' },
  { hostname: 'search.seznam.cz', path: '/indexnow' }
];

endpoints.forEach((ep) => {
  const options = {
    hostname: ep.hostname,
    port: 443,
    path: ep.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`SUCCESS: IndexNow (${ep.hostname}) accepted ${urlList.length} URLs (${res.statusCode})!`);
      } else {
        console.log(`IndexNow (${ep.hostname}) returned ${res.statusCode}`);
      }
    });
  });

  req.on('error', (e) => {
    console.warn(`IndexNow (${ep.hostname}) ping notice: ${e.message}`);
  });

  req.write(payload);
  req.end();
});
