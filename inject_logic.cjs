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

const scriptTemplate = (ref) => `
  <!-- Back Button and Payment logic -->
  <style>
    .back-to-studios {
      position: fixed; top: 20px; left: 20px; z-index: 9999;
      background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px);
      color: white; padding: 10px 20px; border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer;
      font-family: sans-serif; font-size: 14px; font-weight: 600;
      text-decoration: none; display: flex; align-items: center; gap: 8px;
      transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    .back-to-studios:hover { background: #3b82f6; transform: translateY(-2px); }
  </style>
  <button id="back-btn" class="back-to-studios">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
    <span>Retour / Back</span>
  </button>
  <script>
    (function () {
      const channel = new BroadcastChannel('studios_pro_channel');
      let isAllowed = false;
      let pendingTarget = null;
      const backBtn = document.getElementById('back-btn');
      if (backBtn) {
        backBtn.onclick = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          channel.postMessage({ type: 'CLOSE_STUDIO' });
          window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
        };
      }
      channel.onmessage = (e) => {
        if (e.data.type === 'EXPORT_ALLOWED' && pendingTarget) {
          isAllowed = true;
          pendingTarget.click();
        }
      };
      document.addEventListener('click', (e) => {
        if (isAllowed) { isAllowed = false; pendingTarget = null; return; }
        const target = e.target.closest('button') || e.target.closest('a') || e.target;
        if (!target) return;
        const text = (target.innerText || target.textContent || "").toLowerCase();
        const titleAttr = (target.getAttribute('title') || "").toLowerCase();
        const aria = (target.getAttribute('aria-label') || "").toLowerCase();
        const id = (target.id || "").toLowerCase();
        const cls = (target.className || "");
        const clsStr = typeof cls === 'string' ? cls.toLowerCase() : '';
        const keywords = ['export', 'download', 'telecharger', 'save', 'obj', 'stl', 'glb', 'gltf', 'ply', 'g-code', 'gcode', 'fbx', 'dae', '3mf', 'png', 'jpg', 'jpeg', 'capture', 'video', 'record', 'rec', 'enr', 'mp4', 'webm', 'render'];
        const isExport = keywords.some(k => text.includes(k) || titleAttr.includes(k) || aria.includes(k) || id.includes(k) || clsStr.includes(k));
        
        // Exclude the language toggle from triggering export
        if (target.classList && target.classList.contains('lang-btn')) return;

        if (isExport) {
          e.stopImmediatePropagation();
          e.preventDefault();
          pendingTarget = target;
          channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: '${ref}' } });
        }
      }, true);
    })();
  </script>
`;

apps.forEach(app => {
  const file = path.join(__dirname, app.p);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // if already injected, maybe skip
    if (!content.includes('back-to-studios')) {
      // Find <body> start tag, insert after it
      const bodyRegex = /(<body[^>]*>)/i;
      content = content.replace(bodyRegex, '$1\n' + scriptTemplate(app.ref));
      fs.writeFileSync(file, content, 'utf8');
      console.log('Injected: ' + app.p);
    } else {
      console.log('Already injected: ' + app.p);
    }
  } else {
    console.log('Not found: ' + file);
  }
});

// Wrapper generation removed as we clone the source code now.
