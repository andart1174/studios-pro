const fs = require('fs');
const path = require('path');

const apps = [
  { p: 'public/apps/aura-gen/index.html', ref: 'aurg' },
  { p: 'public/apps/architect-pro-1/index.html', ref: 'arp1' },
  { p: 'public/apps/architect-pro-2/index.html', ref: 'arp2' },
  { p: 'public/apps/figure-builder/index.html', ref: 'figb' },
  { p: 'public/apps/music-composer/index.html', ref: 'musc' },
  { p: 'public/apps/design-pro-studio/index.html', ref: 'desp' },
  { p: 'public/apps/ia-architecte/index.html', ref: 'iaar' }
];

const newKeywordsLine = "        const keywords = ['export', 'download', 'telecharger', 'save', 'obj', 'stl', 'glb', 'gltf', 'ply', 'g-code', 'gcode', 'fbx', 'dae', '3mf', 'png', 'jpg', 'jpeg', 'capture', 'video', 'record', 'rec', 'enr', 'mp4', 'webm', 'render'];";
const oldKeywordsRegex = /const keywords \= \['export', 'download'[^\]]+\];/;

apps.forEach(app => {
  const file = path.join(__dirname, app.p);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (oldKeywordsRegex.test(content)) {
      content = content.replace(oldKeywordsRegex, newKeywordsLine);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Patched keywords in: ' + app.p);
    } else {
      console.log('Pattern not found in: ' + app.p);
    }
  } else {
    console.log('Not found: ' + file);
  }
});
