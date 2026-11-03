# Studios-Pro Workspace Guidelines & AI Safety Rules

## 🔒 1. AR VIEWER STRICT PROTECTION & FREEZE RULE
- **AR Viewer (`public/apps/ar-viewer/index.html` & `public/apps/ar-viewer/style.css`) is a FROZEN PRODUCTION MODULE**:
  - **ABSOLUTE PROHIBITION**: NEVER modify, refactor, clean up, or alter any file inside `public/apps/ar-viewer/` or the AR bridge handlers in `src/App.jsx` when working on ANY other part of the site (3D Studio, DFX Studio, Blog, Pricing, Nexus, Admin, Navigation, etc.).
  - Other modules must communicate with AR Viewer STRICTLY through the established external contracts:
    - URL Query parameters: `?url=...`, `?demo=...`, `?lang=...`
    - Window messaging: `AR_VIEWER_READY_RECEIVED`, `LOAD_EXTERNAL_FILE`, `CLOSE_STUDIO`
- **If the USER EXPLICITLY requests changes to AR Viewer**:
  - NEVER change `interaction-prompt="auto"` to "none" (this hides the mobile tap-to-place prompt and causes black screen / missing model in AR).
  - NEVER remove `xr-environment` or alter `ar-modes="webxr scene-viewer quick-look"`.
  - NEVER remove the TDZ deferral (`await new Promise(r => setTimeout(r, 0));`) in the `queryUrl` block.
  - NEVER bypass or alter the `/api/ar-proxy/` proxy routing (required for mobile cross-origin model downloads).
  - MANDATORY: Always run `npm run test:ar` and verify that all 9/9 integrity checks pass before any commit.
- **Instant Disaster Recovery**:
  - If AR Viewer ever behaves unexpectedly or breaks, immediately run:
    `npm run restore:ar`
    This restores `public/apps/ar-viewer/` to the certified working stable state from `backups/ar-viewer-stable/` in 1 second.
  - Or via Git:
    `git checkout ar-viewer-stabil -- public/apps/ar-viewer/`

## 2. Netlify Proxy & Edge Functions Stability
- NEVER alter or remove working `/api/ar-proxy`, `/api/litterbox`, `/api/catbox`, or `/api/uguu` routes in `netlify.toml` or `netlify/edge-functions/ar-proxy.js`.
- These endpoints serve critical mobile cross-origin (CORS) 3D binary streams required by Google SceneViewer and iOS QuickLook.

## 3. Pre-Deploy Integrity Enforcement
- `npm run build` automatically runs `verify_ar_viewer.cjs` as step 1. If any invariant is violated, the build aborts immediately, preventing broken code from ever deploying to Netlify production.
