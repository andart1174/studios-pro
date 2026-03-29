const fs = require('fs');
const path = require('path');

const apps = [
  { p: 'public/apps/aura-gen/index.html' },
  { p: 'public/apps/architect-pro-1/index.html' },
  { p: 'public/apps/architect-pro-2/index.html' },
  { p: 'public/apps/figure-builder/index.html' },
  { p: 'public/apps/music-composer/index.html' },
  { p: 'public/apps/design-pro-studio/index.html' },
  { p: 'public/apps/ia-architecte/index.html' }
];

apps.forEach(app => {
  const file = path.join(__dirname, app.p);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it already has 'print'
    if (!content.includes("'print'") || !content.includes("'copy'")) {
      // Find the keywords line
      const regex = /const keywords \= \[[^\]]+\];/;
      const match = content.match(regex);
      
      if (match) {
        let currentArray = match[0];
        // Ensure we don't duplicate
        let newArray = currentArray;
        if (!newArray.includes("'print'")) {
          newArray = newArray.replace('];', ", 'print'];");
        }
        if (!newArray.includes("'copy'")) {
          newArray = newArray.replace('];', ", 'copy'];");
        }
        
        content = content.replace(regex, newArray);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Patched ' + app.p);
      } else {
        console.log('Could not find keywords array in ' + app.p);
      }
    } else {
      console.log('Already patched ' + app.p);
    }
  } else {
    console.log('Not found: ' + file);
  }
});
