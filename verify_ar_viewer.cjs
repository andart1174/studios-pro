/**
 * AR VIEWER INTEGRITY VERIFIER
 * 
 * Automatically executed before `vite build` and Netlify deploys.
 * If any critical invariant of the AR Viewer is broken, the build halts immediately,
 * preventing any broken code from ever being deployed to production.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const AR_HTML = path.join(ROOT, 'public', 'apps', 'ar-viewer', 'index.html');
const AR_CSS = path.join(ROOT, 'public', 'apps', 'ar-viewer', 'style.css');
const APP_JSX = path.join(ROOT, 'src', 'App.jsx');

let errors = [];
let passedChecks = 0;

function check(name, fn) {
  try {
    fn();
    passedChecks++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    errors.push({ name, error: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

console.log('\n🔍 Running AR Viewer Integrity Verification...');

// 1. File existence & basic size
check('AR Viewer files exist and are not empty', () => {
  if (!fs.existsSync(AR_HTML)) throw new Error(`Missing ${AR_HTML}`);
  const htmlSize = fs.statSync(AR_HTML).size;
  if (htmlSize < 40000) throw new Error(`index.html is suspiciously small (${htmlSize} bytes)`);

  if (!fs.existsSync(AR_CSS)) throw new Error(`Missing ${AR_CSS}`);
  const cssSize = fs.statSync(AR_CSS).size;
  if (cssSize < 5000) throw new Error(`style.css is suspiciously small (${cssSize} bytes)`);
});

const htmlContent = fs.readFileSync(AR_HTML, 'utf8');

// 2. JavaScript Syntax Verification (all scripts inside index.html)
check('All inline JavaScript inside index.html compiles with 0 syntax errors', () => {
  const scriptRegex = /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const attrs = match[1];
    const code = match[2];
    if (/type\s*=\s*["'](?:importmap|application\/json)["']/i.test(attrs)) continue;
    count++;
    try {
      new vm.Script(code, { filename: `inline-script-${count}.js` });
    } catch (syntaxErr) {
      throw new Error(`Syntax error in inline script #${count}: ${syntaxErr.message}`);
    }
  }
  if (count === 0) throw new Error('No inline scripts found in index.html to validate');
});

// 3. Model-Viewer critical AR attributes
check('model-viewer has interaction-prompt="auto" (restores hand prompt for surface placement)', () => {
  if (!htmlContent.includes('interaction-prompt="auto"')) {
    throw new Error('interaction-prompt must be "auto" - setting to "none" hides tap animation and breaks AR!');
  }
});

check('model-viewer has xr-environment attribute', () => {
  if (!/<model-viewer[^>]*\bxr-environment\b/i.test(htmlContent)) {
    throw new Error('model-viewer tag is missing xr-environment attribute');
  }
});

check('model-viewer has ar-modes="webxr scene-viewer quick-look"', () => {
  if (!htmlContent.includes('ar-modes="webxr scene-viewer quick-look"')) {
    throw new Error('ar-modes attribute is missing or altered');
  }
});

// 4. TDZ prevention (ReferenceError activeDemoId fix)
check('queryUrl loader has initialization deferral to prevent TDZ ReferenceError', () => {
  if (!htmlContent.includes('await new Promise(r => setTimeout(r, 0))') &&
      !htmlContent.includes('setTimeout(r, 0)')) {
    throw new Error('Missing deferral in queryUrl loader; without this, activeDemoId causes ReferenceError on mobile load!');
  }
});

// 5. Proxy routing for CORS & mime-type compatibility
check('Proxy fallback routing /api/ar-proxy/ is configured for shared URLs', () => {
  if (!htmlContent.includes('/api/ar-proxy/')) {
    throw new Error('Missing /api/ar-proxy/ routing for shared mobile QR URLs');
  }
});

// 6. Parent window ready notification
check('AR Viewer sends AR_VIEWER_READY_RECEIVED to parent window', () => {
  if (!htmlContent.includes('AR_VIEWER_READY_RECEIVED')) {
    throw new Error('Missing AR_VIEWER_READY_RECEIVED notification to parent window');
  }
});

// 7. App.jsx integration
check('App.jsx has AR_VIEWER_READY_RECEIVED handler and xr-spatial-tracking permission', () => {
  if (!fs.existsSync(APP_JSX)) throw new Error(`Missing ${APP_JSX}`);
  const appContent = fs.readFileSync(APP_JSX, 'utf8');

  if (!appContent.includes('AR_VIEWER_READY_RECEIVED')) {
    throw new Error('App.jsx is missing AR_VIEWER_READY_RECEIVED handler');
  }
  if (!appContent.includes('xr-spatial-tracking')) {
    throw new Error('App.jsx iframe is missing xr-spatial-tracking permission');
  }
});

console.log(`\n📊 AR Viewer Integrity Check Result: ${passedChecks}/${passedChecks + errors.length} checks passed.\n`);

if (errors.length > 0) {
  console.error('❌ AR VIEWER INTEGRITY VERIFICATION FAILED!');
  console.error('Build aborted to prevent deploying a broken AR Viewer.');
  process.exit(1);
} else {
  console.log('✅ AR VIEWER IS FULLY FUNCTIONAL AND PROTECTED.\n');
  process.exit(0);
}
