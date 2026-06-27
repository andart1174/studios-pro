const fs = require('fs');
const path = require('path');
const https = require('https');

const key = '6a5c18b76c8c4f0da9e23f7bb3d1b7b0';
const keyFile = path.join(__dirname, 'public', `${key}.txt`);

// 1. Ensure the key file exists in public/
if (!fs.existsSync(keyFile)) {
  fs.writeFileSync(keyFile, key);
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

// 4. Send POST request to IndexNow
const options = {
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/IndexNow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  console.log(`IndexNow status: ${res.statusCode} ${res.statusMessage}`);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log("SUCCESS: IndexNow ping completed successfully (Accepted)!");
    } else {
      console.warn(`WARNING: IndexNow returned status code ${res.statusCode}. Response: ${data}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`IndexNow ping error: ${e.message}`);
});

req.write(payload);
req.end();
