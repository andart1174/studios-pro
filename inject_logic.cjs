const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'public/apps');
const subdirs = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());

const scriptTemplate = (ref) => {
  const isDfxOrSpro = (ref === 'dfx' || ref === 'spro');
  return `
  <!-- Back Button and Payment logic -->
  <style>
    .back-to-studios {
      position: fixed; top: 20px; left: 20px; z-index: 99999;
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
      // Monkey patch Blob constructor to handle DataView gracefully
      const OriginalBlob = window.Blob;
      const CustomBlob = function (blobParts, options) {
        if (blobParts && Array.isArray(blobParts)) {
          const safeParts = blobParts.map(part => {
            if (typeof DataView !== 'undefined' && part instanceof DataView) {
              return new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
            }
            return part;
          });
          return new OriginalBlob(safeParts, options);
        }
        return new OriginalBlob(blobParts, options);
      };
      CustomBlob.prototype = OriginalBlob.prototype;
      window.Blob = CustomBlob;

      function base64ToBytes(base64) {
        const binString = atob(base64);
        const len = binString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        return bytes;
      }

      if (typeof THREE !== 'undefined') {
        THREE.STLExporter = class STLExporter {
          parse(scene, options = {}) {
            const binary = options.binary !== undefined ? options.binary : false;
            const objects = [];
            let triangles = 0;
            scene.traverse(function(object) {
              if (object.isMesh) {
                const geometry = object.geometry;
                const index = geometry.index;
                const positionAttribute = geometry.getAttribute('position');
                triangles += index !== null ? index.count / 3 : positionAttribute.count / 3;
                objects.push({ object3d: object, geometry: geometry });
              }
            });
            let output;
            let offset = 80;
            if (binary === true) {
              const bufferLength = triangles * 2 + triangles * 3 * 4 * 4 + 80 + 4;
              const arrayBuffer = new ArrayBuffer(bufferLength);
              output = new DataView(arrayBuffer);
              output.setUint32(offset, triangles, true);
              offset += 4;
            } else {
              output = 'solid exported\\n';
            }
            const vA = new THREE.Vector3();
            const vB = new THREE.Vector3();
            const vC = new THREE.Vector3();
            const cb = new THREE.Vector3();
            const ab = new THREE.Vector3();
            const normal = new THREE.Vector3();
            for (let i = 0, il = objects.length; i < il; i++) {
              const object = objects[i].object3d;
              const geometry = objects[i].geometry;
              const index = geometry.index;
              const positionAttribute = geometry.getAttribute('position');
              if (index !== null) {
                for (let j = 0; j < index.count; j += 3) {
                  const a = index.getX(j + 0);
                  const b = index.getX(j + 1);
                  const c = index.getX(j + 2);
                  writeFace(a, b, c, positionAttribute, object);
                }
              } else {
                for (let j = 0; j < positionAttribute.count; j += 3) {
                  const a = j + 0;
                  const b = j + 1;
                  const c = j + 2;
                  writeFace(a, b, c, positionAttribute, object);
                }
              }
            }
            if (binary === false) {
              output += 'endsolid exported\\n';
            }
            return output;

            function writeFace(a, b, c, positionAttribute, object) {
              vA.fromBufferAttribute(positionAttribute, a);
              vB.fromBufferAttribute(positionAttribute, b);
              vC.fromBufferAttribute(positionAttribute, c);
              if (object.isSkinnedMesh === true) {
                object.boneTransform(a, vA);
                object.boneTransform(b, vB);
                object.boneTransform(c, vC);
              }
              vA.applyMatrix4(object.matrixWorld);
              vB.applyMatrix4(object.matrixWorld);
              vC.applyMatrix4(object.matrixWorld);
              writeNormal(vA, vB, vC);
              writeVertex(vA);
              writeVertex(vB);
              writeVertex(vC);
              if (binary === true) {
                output.setUint16(offset, 0, true);
                offset += 2;
              } else {
                output += '\\t\\tendloop\\n\\tendfacet\\n';
              }
            }
            function writeNormal(vA, vB, vC) {
              cb.subVectors(vC, vB);
              ab.subVectors(vA, vB);
              cb.cross(ab).normalize();
              normal.copy(cb).normalize();
              if (binary === true) {
                output.setFloat32(offset, normal.x, true);
                offset += 4;
                output.setFloat32(offset, normal.y, true);
                offset += 4;
                output.setFloat32(offset, normal.z, true);
                offset += 4;
              } else {
                output += '\\tfacet normal ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\\n\\t\\touter loop\\n';
              }
            }
            function writeVertex(vertex) {
              if (binary === true) {
                output.setFloat32(offset, vertex.x, true);
                offset += 4;
                output.setFloat32(offset, vertex.y, true);
                offset += 4;
                output.setFloat32(offset, vertex.z, true);
                offset += 4;
              } else {
                output += '\\t\\t\\tvertex ' + vertex.x + ' ' + vertex.y + ' ' + vertex.z + '\\n';
              }
            }
          }
        };
      }

      // --- Object URL Hooking (prevent race condition with URL.revokeObjectURL) ---
      const blobMap = new Map();
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = function(obj) {
        const url = originalCreateObjectURL.call(URL, obj);
        if (obj instanceof Blob) {
          blobMap.set(url, obj);
        }
        return url;
      };

      const activeExports = new Set();
      const revokeQueue = new Set();

      URL.revokeObjectURL = function(url) {
        if (activeExports.has(url)) {
          revokeQueue.add(url);
        } else {
          originalRevokeObjectURL.call(URL, url);
          blobMap.delete(url);
        }
      };

      function releaseUrl(url) {
        activeExports.delete(url);
        if (revokeQueue.has(url)) {
          originalRevokeObjectURL.call(URL, url);
          revokeQueue.delete(url);
          blobMap.delete(url);
        }
      }

      const channel = new BroadcastChannel('studios_pro_channel');
      let isAllowed = false;
      let pendingTarget = null;
      let isPremiumUser = false;

      const backBtn = document.getElementById('back-btn');
      if (backBtn) {
        backBtn.onclick = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          channel.postMessage({ type: 'CLOSE_STUDIO' });
          window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
        };
      }

      // Hide local payment modal if any (since some apps have local modals)
      const localModal = document.getElementById('local-payment-modal');
      if (localModal) {
        localModal.style.display = 'none';
        const localCloseBtn = document.getElementById('modal-close-btn');
        if (localCloseBtn) localCloseBtn.onclick = () => { localModal.style.display = 'none'; pendingTarget = null; };
        const localPaySingleBtn = document.getElementById('pay-single-btn');
        if (localPaySingleBtn) localPaySingleBtn.onclick = () => {
          channel.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'single', ref: '${ref}' } });
          localModal.style.display = 'none';
        };
        const localPayPremiumBtn = document.getElementById('pay-premium-btn');
        if (localPayPremiumBtn) localPayPremiumBtn.onclick = () => {
          channel.postMessage({ type: 'START_STRIPE_PAYMENT', payload: { type: 'premium', ref: '${ref}' } });
          localModal.style.display = 'none';
        };
      }

      channel.onmessage = (e) => {
        if (e.data.type === 'EXPORT_ALLOWED') {
          isAllowed = true;
          isPremiumUser = !!(e.data.payload && e.data.payload.isPremium);
          window.isPremiumUser = isPremiumUser;
          if (localModal) localModal.style.display = 'none';
          if (pendingTarget) {
            pendingTarget.click();
          }
        } else if (e.data.type === 'USER_STATUS_RESPONSE') {
          isPremiumUser = !!(e.data.payload && e.data.payload.isPremium);
          window.isPremiumUser = isPremiumUser;
        } else if (e.data.type === 'LOAD_EXTERNAL_FILE') {
          (async () => {
            try {
              const { name, extension, data, isBinary } = e.data.payload;
              console.log("Receiving external file from extension:", name);
              let file;
              if (isBinary) {
                const res = await fetch(data);
                const blob = await res.blob();
                file = new File([blob], name, { type: 'application/octet-stream' });
              } else {
                file = new File([data], name, { type: 'text/plain' });
              }

              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);

              const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dataTransfer
              });
              
              const dragOverEvent = new DragEvent('dragover', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dataTransfer
              });

              // Set files on file inputs and trigger change
              const fileInputs = document.querySelectorAll('input[type="file"]');
              fileInputs.forEach(input => {
                try {
                  input.files = dataTransfer.files;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                } catch(err) { console.error("Input change dispatch error:", err); }
              });

              // Dispatch drag events
              [document, document.body, window].forEach(t => {
                try {
                  t.dispatchEvent(dragOverEvent);
                  t.dispatchEvent(dropEvent);
                } catch(err) { console.error("Drop dispatch error:", err); }
              });
              
              console.log('Successfully injected file:', name);
            } catch (err) {
              console.error('Error handling LOAD_EXTERNAL_FILE:', err);
            }
          })();
        } else if (e.data.type === 'LOAD_EXTERNAL_URL') {
          (async () => {
            try {
              const { url } = e.data.payload;
              const name = url.split('/').pop().split('?')[0] || 'imported_file';
              console.log("Receiving external url from extension:", url);
              const response = await fetch(url);
              const blob = await response.blob();
              const file = new File([blob], name, { type: 'application/octet-stream' });

              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);

              const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dataTransfer
              });
              
              const dragOverEvent = new DragEvent('dragover', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dataTransfer
              });

              const fileInputs = document.querySelectorAll('input[type="file"]');
              fileInputs.forEach(input => {
                try {
                  input.files = dataTransfer.files;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                } catch(err) {}
              });

              [document, document.body, window].forEach(t => {
                try {
                  t.dispatchEvent(dragOverEvent);
                  t.dispatchEvent(dropEvent);
                } catch(err) {}
              });
              
              console.log('Successfully loaded file from url:', url);
            } catch (err) {
              console.error('Error handling LOAD_EXTERNAL_URL:', err);
            }
          })();
        }
      };

      channel.postMessage({ type: 'GET_USER_STATUS' });

      document.addEventListener('click', (e) => {
        if (!e.isTrusted) return;

        if (isAllowed) {
          isAllowed = false;
          pendingTarget = null;
          return;
        }

        let target = e.target;
        if (!target) return;
        if (typeof target.closest === 'function') {
          target = target.closest('button') || target.closest('a') || target;
        }
        if (!target || typeof target.getAttribute !== 'function') return;

        // Bypass if it is our own programmatically generated bypassed export anchor
        if (target.dataset && target.dataset.bypassed === 'true') return;

        const text = (target.innerText || target.textContent || "").toLowerCase();
        const titleAttr = (target.getAttribute('title') || "").toLowerCase();
        const aria = (target.getAttribute('aria-label') || "").toLowerCase();
        const id = (target.id || "").toLowerCase();
        
        const cls = target.className;
        let clsStr = '';
        if (typeof cls === 'string') {
          clsStr = cls.toLowerCase();
        } else if (cls && typeof cls.baseVal === 'string') {
          clsStr = cls.baseVal.toLowerCase();
        }

        const keywords = ['export', 'download', 'telecharger', 'save', 'obj', 'stl', 'glb', 'gltf', 'ply', 'g-code', 'gcode', 'fbx', 'dae', '3mf', 'png', 'jpg', 'jpeg', 'capture', 'video', 'record', 'rec', 'enr', 'mp4', 'webm', 'render', 'html'];
        const isExport = keywords.some(k => text.includes(k) || titleAttr.includes(k) || aria.includes(k) || id.includes(k) || clsStr.includes(k));
        
        if (target.classList && typeof target.classList.contains === 'function' && target.classList.contains('lang-btn')) return;
        if (id === 'pay-single-btn' || id === 'pay-premium-btn' || id === 'modal-close-btn' || id === 'back-btn' || id === 'injected-save-html-btn' || id === 'injected-view-ar-btn') return;

        if (isExport) {
          e.stopImmediatePropagation();
          e.preventDefault();
          pendingTarget = target;
          if (localModal) {
            localModal.style.display = 'flex';
          }
          channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: '${ref}' } });
        }
      }, true);

      // --- WEB EXPORT PRO INTERCEPTOR ---
      const originalAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.href && !this.dataset.bypassed) {
          const fileUrl = this.href;
          const fileName = this.download;

          if (window.isGeneratingHtmlExport) {
            window.isGeneratingHtmlExport = false; // Reset flag
            activeExports.add(fileUrl);
            generateHtmlExport(fileUrl, fileName).catch(e => {
              console.error(e);
              alert("Error generating HTML export: " + e.message);
            });
            return;
          }

          if (window.isGeneratingArViewer) {
            window.isGeneratingArViewer = false; // Reset flag
            activeExports.add(fileUrl);
            generateArViewerExport(fileUrl, fileName).catch(e => {
              console.error(e);
              alert("Error opening in AR Viewer: " + e.message);
            });
            return;
          }
        }
        return originalAnchorClick.apply(this, arguments);
      };

      // Intercept programmatic click events (e.g., from FileSaver.js or custom click dispatchers)
      const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function(event) {
        if (event && event.type === 'click' && this instanceof HTMLAnchorElement) {
          if (this.download && this.href && !this.dataset.bypassed) {
            const fileUrl = this.href;
            const fileName = this.download;

            if (window.isGeneratingHtmlExport) {
              window.isGeneratingHtmlExport = false; // Reset flag
              activeExports.add(fileUrl);
              generateHtmlExport(fileUrl, fileName).catch(e => {
                console.error(e);
                alert("Error generating HTML export: " + e.message);
              });
              return false; // prevent event default/propagation simulation
            }

            if (window.isGeneratingArViewer) {
              window.isGeneratingArViewer = false; // Reset flag
              activeExports.add(fileUrl);
              generateArViewerExport(fileUrl, fileName).catch(e => {
                console.error(e);
                alert("Error opening in AR Viewer: " + e.message);
              });
              return false; // prevent event default/propagation simulation
            }
          }
        }
        return originalDispatchEvent.apply(this, arguments);
      };

      // Intercept modern showSaveFilePicker API (File System Access API)
      if (typeof window.showSaveFilePicker === 'function') {
        const originalShowSaveFilePicker = window.showSaveFilePicker;
        window.showSaveFilePicker = function(options) {
          if (window.isGeneratingHtmlExport) {
            const suggestedName = (options && options.suggestedName) || 'export';
            return new Promise((resolve, reject) => {
              const mockFileHandle = {
                kind: 'file',
                name: suggestedName,
                createWritable: async function() {
                  return {
                    write: async function(data) {
                      const fileUrl = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
                      window.isGeneratingHtmlExport = false; // Reset flag
                      activeExports.add(fileUrl);
                      generateHtmlExport(fileUrl, suggestedName).catch(e => {
                        console.error(e);
                        alert("Error generating HTML export: " + e.message);
                      });
                    },
                    close: async function() {
                      resolve(mockFileHandle);
                    }
                  };
                }
              };
            });
          }
          if (window.isGeneratingArViewer) {
            const suggestedName = (options && options.suggestedName) || 'export';
            return new Promise((resolve, reject) => {
              const mockFileHandle = {
                kind: 'file',
                name: suggestedName,
                createWritable: async function() {
                  return {
                    write: async function(data) {
                      const fileUrl = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
                      window.isGeneratingArViewer = false; // Reset flag
                      activeExports.add(fileUrl);
                      generateArViewerExport(fileUrl, suggestedName).catch(e => {
                        console.error(e);
                        alert("Error opening in AR Viewer: " + e.message);
                      });
                    },
                    close: async function() {
                      resolve(mockFileHandle);
                    }
                  };
                }
              };
            });
          }
          return originalShowSaveFilePicker.apply(this, arguments);
        };
      }

      // Inject "Save HTML" & "View in AR" buttons dynamically for all apps
      setInterval(() => {
        const buttons = Array.from(document.querySelectorAll('button, a.btn, input[type="button"]'));
        
        // Filter out buttons that are pay buttons, back buttons, close buttons, or already HTML/AR buttons
        const validButtons = buttons.filter(btn => {
          const txt = (btn.textContent || btn.value || '').toLowerCase();
          const id = (btn.id || '').toLowerCase();
          if (id.includes('html') || id.includes('ar') || id.includes('pay') || id.includes('back') || id.includes('close') || id.includes('premium') || id.includes('pdf')) return false;
          if (txt.includes('html') || txt.includes('view in ar') || txt.includes('voir en ar') || txt.includes('pay') || txt.includes('back') || txt.includes('close') || txt.includes('premium') || txt.includes('pdf')) return false;
          return true;
        });

        // Always find the base buttons in every tick for visibility syncing
        let baseBtn = null;
        const priorities = [
          ['glb', 'gltf'],
          ['stl'],
          ['obj'],
          ['ply'],
          ['3mf'],
          ['save svg', 'export svg', 'download svg', 'svg'],
          ['save dxf', 'export dxf', 'download dxf', 'dxf'],
          ['png', 'jpg', 'jpeg', 'capture', 'image'],
          ['save', 'export', 'download', 'telecharger', 'render', 'capture']
        ];
        for (const kwList of priorities) {
          baseBtn = validButtons.find(btn => {
            const txt = (btn.textContent || btn.value || '').toLowerCase();
            return kwList.some(kw => txt.includes(kw));
          });
          if (baseBtn) break;
        }

        let baseBtn3D = null;
        const priorities3D = [
          ['glb', 'gltf'],
          ['stl'],
          ['obj']
        ];
        for (const kwList of priorities3D) {
          baseBtn3D = validButtons.find(btn => {
            const txt = (btn.textContent || btn.value || '').toLowerCase();
            return kwList.some(kw => txt.includes(kw));
          });
          if (baseBtn3D) break;
        }

        // Check if there is an existing button that already contains 'html'
        const hasExistingHtmlBtn = buttons.some(btn => {
          const txt = (btn.textContent || btn.value || '').toLowerCase();
          return txt.includes('html') && !btn.id.includes('injected-save-html-btn');
        });

        // 1. INJECT SAVE HTML BUTTON
        if (baseBtn && !hasExistingHtmlBtn && !document.getElementById('injected-save-html-btn')) {
          const parent = baseBtn.parentElement;
          if (parent) {
            const htmlBtn = document.createElement(baseBtn.tagName);
            htmlBtn.id = 'injected-save-html-btn';
            htmlBtn.className = baseBtn.className;
            
            // Style matching (strip display:none if set initially)
            htmlBtn.style.cssText = baseBtn.style.cssText.replace(/display:\s*none;?/g, '');
            htmlBtn.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
            htmlBtn.style.color = '#ffffff';
            htmlBtn.style.borderColor = 'transparent';
            
            // Spacing adjustments
            const display = window.getComputedStyle(parent).display;
            if (display.includes('flex') || display.includes('grid')) {
              // Flex or grid layouts handle layout automatically
            } else {
              htmlBtn.style.marginTop = '8px';
              htmlBtn.style.marginLeft = '4px';
            }

            // Determine HTML button text based on base button text length/language
            const baseText = baseBtn.textContent.trim();
            let btnText = 'Save HTML';
            if (baseText.length <= 5) {
              btnText = 'HTML';
            } else if (baseText.toLowerCase().includes('télécharger') || baseText.toLowerCase().includes('telecharger')) {
              btnText = 'Télécharger HTML';
            } else if (baseText.toLowerCase().includes('export')) {
              btnText = 'Export HTML';
            } else if (baseText.toLowerCase().includes('sauvegarder')) {
              btnText = 'Sauvegarder HTML';
            }
            
            if (baseBtn.tagName === 'INPUT') {
              htmlBtn.value = btnText;
            } else {
              htmlBtn.textContent = btnText;
            }
            
            htmlBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (!isPremiumUser && !window.isPremiumUser) {
                channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: '${ref}' } });
                return;
              }
              
              if ('${ref}' === 'musc') {
                const btnShare = document.getElementById('btn-share');
                if (btnShare) {
                  btnShare.click(); // Sets location.hash with the compressed state
                  Promise.all([
                    fetch('/apps/music-composer/index.html').then(r => r.text()),
                    fetch('/apps/music-composer/css/style.css').then(r => r.text()),
                    fetch('/apps/music-composer/js/presets.js').then(r => r.text()),
                    fetch('/apps/music-composer/js/app.js').then(r => r.text())
                  ]).then(([htmlText, cssText, presetsText, jsText]) => {
                      let cleanHtml = htmlText;
                      cleanHtml = cleanHtml.replace('<link rel="stylesheet" href="./css/style.css">', '<style>' + cssText + '</style>');
                      cleanHtml = cleanHtml.replace('<script src="./js/presets.js"><\\/script>', '<script>' + presetsText + '<\\/script>');
                      cleanHtml = cleanHtml.replace('<script src="./js/app.js"><\\/script>', '<script>' + jsText + '<\\/script>');
                      cleanHtml = cleanHtml.replace(/<script[^>]*>(?:(?!<\\/script>)[\\s\\S])*?studios_pro_channel[\\s\\S]*?<\\/script>/gi, '');
                      cleanHtml = cleanHtml.replace(/<button[^>]*id=["']back-btn["'][^>]*>[\\s\\S]*?<\\/button>/gi, '');
                      
                      const hash = window.location.hash;
                      const playbackScript = \`
  <style>
    body { padding-bottom: 0 !important; }
    .top-bar { display: none !important; }
    .left-panel { display: none !important; }
    .right-panel { display: none !important; }
    #keyboard-synth-panel { display: none !important; }
    .stage-overlay { bottom: 30px !important; }
  </style>
  <script>
    window.location.hash = "\${hash}";
    window.addEventListener('load', function() {
      setTimeout(() => {
        const zenBtn = document.getElementById('btn-zen');
        if (zenBtn) zenBtn.click();
        const splash = document.createElement('div');
        splash.style.position = 'fixed';
        splash.style.top = '0'; splash.style.left = '0';
        splash.style.width = '100vw'; splash.style.height = '100vh';
        splash.style.background = '#05070a';
        splash.style.color = '#fff';
        splash.style.display = 'flex';
        splash.style.flexDirection = 'column';
        splash.style.alignItems = 'center';
        splash.style.justifyContent = 'center';
        splash.style.zIndex = '99999';
        splash.style.fontFamily = 'sans-serif';
        splash.style.cursor = 'pointer';
        splash.innerHTML = '<h2 style="margin-bottom:10px;">Interactive Music Composer</h2><p style="color:#94a3b8; margin:0;">Click anywhere to start playback</p>';
        document.body.appendChild(splash);
        splash.onclick = function() {
          if (typeof Tone !== "undefined") {
            Tone.start().then(() => {
              const playBtn = document.getElementById('btn-play');
              if (playBtn) playBtn.click();
              splash.remove();
            });
          } else {
            splash.remove();
          }
        };
      }, 500);
    });
  <\\/script>
  \`;
                      cleanHtml = cleanHtml.replace('</body>', playbackScript + '</body>');
                      const blob = new Blob([cleanHtml], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'music_composer_interactive.html';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                  }).catch(err => {
                      alert("Error generating HTML: " + err.message);
                  });
                }
                return;
              }
              
              window.isGeneratingHtmlExport = true;
              baseBtn.click();
            };
            
            baseBtn.parentNode.insertBefore(htmlBtn, baseBtn.nextSibling);
          }
        }

        // 2. INJECT VIEW IN AR BUTTON (PREMIUM ONLY, 3D APP DETECTED)
        if (baseBtn3D && !document.getElementById('injected-view-ar-btn')) {
          const parent = baseBtn3D.parentElement;
          if (parent) {
            const arBtn = document.createElement(baseBtn3D.tagName);
            arBtn.id = 'injected-view-ar-btn';
            arBtn.className = baseBtn3D.className;
            
            // Style matching (strip display:none if set initially)
            arBtn.style.cssText = baseBtn3D.style.cssText.replace(/display:\s*none;?/g, '');
            arBtn.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)'; // Teal to cyan premium gradient
            arBtn.style.color = '#ffffff';
            arBtn.style.borderColor = 'transparent';
            
            // Spacing adjustments
            const display = window.getComputedStyle(parent).display;
            if (display.includes('flex') || display.includes('grid')) {
              // Flex or grid layouts handle layout automatically
            } else {
              arBtn.style.marginTop = '8px';
              arBtn.style.marginLeft = '4px';
            }

            // Determine language: French or English
            const baseText = baseBtn3D.textContent.toLowerCase();
            const isFr = document.documentElement.lang === 'fr' || 
                         window.location.search.includes('lang=fr') || 
                         baseText.includes('télécharger') || 
                         baseText.includes('telecharger') || 
                         baseText.includes('sauvegarder') ||
                         baseText.includes('sauver') ||
                         baseText.includes('exporter');
                         
            const arText = isFr ? '👁️ Voir en AR' : '👁️ View in AR';
            
            if (baseBtn3D.tagName === 'INPUT') {
              arBtn.value = arText;
            } else {
              arBtn.textContent = arText;
            }
            
            arBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (!isPremiumUser && !window.isPremiumUser) {
                // View in AR is a strictly premium-only feature!
                channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { ref: '${ref}', forcePremium: true } });
                return;
              }
              
              // Create and show loading overlay
              const loaderOverlay = document.createElement('div');
              loaderOverlay.id = 'injected-ar-loading-overlay';
              loaderOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:999999; color:white; font-family:sans-serif; transition: opacity 0.3s ease;';
              loaderOverlay.innerHTML = \`
                <div style="border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #06b6d4; border-radius: 50%; width: 45px; height: 45px; animation: injected_spin 1s linear infinite; margin-bottom: 20px;"></div>
                <div style="font-size: 16px; font-weight: 600; text-align: center; padding: 0 20px;" class="loader-msg"></div>
                <style>
                  @keyframes injected_spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
              \`;
              document.body.appendChild(loaderOverlay);
              
              const setMsg = (msg) => {
                loaderOverlay.querySelector('.loader-msg').textContent = msg;
              };
              
              setMsg(isFr ? 'Génération du modèle 3D...' : 'Generating 3D model...');
              
              // Set global flag and click base 3D export button
              window.isGeneratingArViewer = true;
              baseBtn3D.click();
              
              // Safety timeout: remove loader after 15 seconds if export fails
              setTimeout(() => {
                const overlay = document.getElementById('injected-ar-loading-overlay');
                if (overlay) {
                  overlay.remove();
                  window.isGeneratingArViewer = false;
                }
              }, 15000);
            };
            
            // Insert it next to the base 3D export button or next to the HTML button if it exists
            const htmlBtn = document.getElementById('injected-save-html-btn');
            if (htmlBtn && htmlBtn.parentElement === parent) {
              parent.insertBefore(arBtn, htmlBtn.nextSibling);
            } else {
              baseBtn3D.parentNode.insertBefore(arBtn, baseBtn3D.nextSibling);
            }
          }
        }

        // 3. DYNAMIC VISIBILITY SYNCING
        const activeHtmlBtn = document.getElementById('injected-save-html-btn');
        if (activeHtmlBtn && baseBtn) {
          const isBaseVisible = window.getComputedStyle(baseBtn).display !== 'none' && baseBtn.style.display !== 'none';
          activeHtmlBtn.style.display = isBaseVisible ? '' : 'none';
        }
        const activeArBtn = document.getElementById('injected-view-ar-btn');
        if (activeArBtn && baseBtn3D) {
          const isBaseVisible = window.getComputedStyle(baseBtn3D).display !== 'none' && baseBtn3D.style.display !== 'none';
          activeArBtn.style.display = isBaseVisible ? '' : 'none';
        }
      }, 1000);

      async function generateHtmlExport(fileUrl, fileName) {
        let blob;
        if (blobMap.has(fileUrl)) {
          blob = blobMap.get(fileUrl);
        } else if (fileUrl.startsWith('data:')) {
          const parts = fileUrl.split(',');
          const header = parts[0];
          const dataStr = parts.slice(1).join(',');
          let mime = 'text/plain';
          const mimeMatch = header.match(/:(.*?)(;|$)/);
          if (mimeMatch) {
            mime = mimeMatch[1];
          }
          if (header.includes(';base64')) {
            blob = new Blob([base64ToBytes(dataStr)], { type: mime });
          } else {
            let decoded = dataStr;
            try {
              decoded = decodeURIComponent(dataStr);
            } catch (err) {
              try {
                decoded = unescape(dataStr);
              } catch (e2) {}
            }
            blob = new Blob([decoded], { type: mime });
          }
        } else {
          const response = await fetch(fileUrl);
          blob = await response.blob();
        }

        const extension = fileName.split('.').pop().toLowerCase();

        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            const base64 = result.substring(result.indexOf(',') + 1);
            resolve(base64);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        let htmlContent = '';

        if (['stl', 'obj', 'glb', 'gltf', 'ply', 'gbl'].includes(extension)) {
          htmlContent = get3DTemplate(base64Data, extension, fileName);
        } else if (extension === 'svg') {
          htmlContent = getSvgTemplate(base64Data, fileName);
        } else if (['png', 'jpg', 'jpeg'].includes(extension)) {
          htmlContent = getImageTemplate(base64Data, extension, fileName);
        } else {
          htmlContent = getTextTemplate(base64Data, extension, fileName);
        }

        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        const a = document.createElement('a');
        a.href = htmlUrl;
        a.download = fileName.replace('.' + extension, '_interactive.html');
        a.dataset.bypassed = 'true'; // bypass our monkey patch!
        document.body.appendChild(a);
        originalAnchorClick.call(a); // trigger download natively!
        document.body.removeChild(a);
        URL.revokeObjectURL(htmlUrl);
        
        releaseUrl(fileUrl);
      }

      async function generateArViewerExport(fileUrl, fileName) {
        const overlay = document.getElementById('injected-ar-loading-overlay');
        const isFr = document.documentElement.lang === 'fr' || 
                     window.location.search.includes('lang=fr') || 
                     fileName.toLowerCase().includes('telecharger') || 
                     fileName.toLowerCase().includes('sauvegarder');
                     
        const setMsg = (msg) => {
          if (overlay) {
            const el = overlay.querySelector('.loader-msg');
            if (el) el.textContent = msg;
          }
        };
        
        try {
          setMsg(isFr ? 'Téléchargement vers la Réalité Augmentée...' : 'Uploading to WebAR...');
          
          let blob;
          if (blobMap.has(fileUrl)) {
            blob = blobMap.get(fileUrl);
          } else if (fileUrl.startsWith('data:')) {
            const parts = fileUrl.split(',');
            const header = parts[0];
            const dataStr = parts.slice(1).join(',');
            let mime = 'text/plain';
            const mimeMatch = header.match(/:(.*?)(;|$)/);
            if (mimeMatch) {
              mime = mimeMatch[1];
            }
            if (header.includes(';base64')) {
              blob = new Blob([base64ToBytes(dataStr)], { type: mime });
            } else {
              let decoded = dataStr;
              try {
                decoded = decodeURIComponent(dataStr);
              } catch (err) {
                try {
                  decoded = unescape(dataStr);
                } catch (e2) {}
              }
              blob = new Blob([decoded], { type: mime });
            }
          } else {
            const response = await fetch(fileUrl);
            blob = await response.blob();
          }

          // Upload the model blob to tmpfiles.org
          const formData = new FormData();
          formData.append('file', blob, fileName);

          const uploadRes = await fetch('/api/proxy/api/v1/upload', {
            method: 'POST',
            body: formData
          });

          const json = await uploadRes.json();
          if (json.status === 'success') {
            const rawUrl = json.data.url;
            const directDlUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            
            // Send message to parent app to load this URL in AR Viewer
            channel.postMessage({ type: 'OPEN_AR_VIEWER', payload: { url: directDlUrl } });
          } else {
            throw new Error("Upload response status was not success");
          }
        } catch (err) {
          console.error("AR Viewer transfer failed:", err);
          alert(isFr ? "Échec du transfert vers l'AR Viewer. Veuillez réessayer." : "Failed to transfer to AR Viewer. Please try again.");
        } finally {
          if (overlay) overlay.remove();
          releaseUrl(fileUrl);
        }
      }

      function get3DTemplate(base64Data, extension, fileName) {
        return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${fileName} - 3D Interactive Viewer</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1329; color: #ffffff; font-family: 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    #container { width: 100vw; height: 100vh; display: block; }
    #loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: 600; background: rgba(15, 23, 42, 0.8); padding: 15px 30px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; transition: opacity 0.3s ease; z-index: 10; }
    .panel { position: absolute; bottom: 24px; left: 24px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); z-index: 10; max-width: 300px; }
    .panel h3 { margin-top: 0; margin-bottom: 12px; font-size: 16px; letter-spacing: 0.5px; color: #3b82f6; }
    .control-group { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .control-group input[type="color"] { border: none; background: none; cursor: pointer; width: 40px; height: 25px; padding: 0; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\\/script>
  \${extension === 'stl' ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"><\\/script>' : ''}
  \${extension === 'obj' ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"><\\/script>' : ''}
  \${extension === 'ply' ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/PLYLoader.js"><\\/script>' : ''}
  \${['glb', 'gltf'].includes(extension) ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\\/script>' : ''}
</head>
<body>
  <div id="loader">Loading 3D Model...</div>
  <div id="container"></div>
  <div class="panel">
    <h3>\${fileName}</h3>
    <div class="control-group"><span>Model Color</span><input type="color" id="modelColor" value="#3b82f6"></div>
    <div class="control-group"><span>Background</span><input type="color" id="bgColor" value="#0b1329"></div>
    <div class="control-group"><span>Auto Rotate</span><input type="checkbox" id="autoRotate"></div>
  </div>
  <script>
    const base64Data = "\${base64Data}";
    const extension = "\${extension}";
    const container = document.getElementById('container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1329);
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0x666666));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 1, 1).normalize();
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x555555, 0.5);
    dirLight2.position.set(-1, -1, -1).normalize();
    scene.add(dirLight2);
    camera.add(new THREE.PointLight(0xffffff, 0.5));
    scene.add(camera);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    let currentMesh;
    
    function base64ToBytes(base64) {
      const binString = atob(base64);
      const len = binString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binString.charCodeAt(i);
      }
      return bytes;
    }
    
    function base64ToArrayBuffer(base64) {
      return base64ToBytes(base64).buffer;
    }
    
    try {
      const buffer = base64ToArrayBuffer(base64Data);
      let loader;
      if (extension === 'stl') {
        loader = new THREE.STLLoader();
        const geometry = loader.parse(buffer);
        const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4, metalness: 0.2 });
        currentMesh = new THREE.Mesh(geometry, material);
        scene.add(currentMesh);
        adjustCamera(geometry);
      } else if (extension === 'ply') {
        loader = new THREE.PLYLoader();
        const geometry = loader.parse(buffer);
        const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
        currentMesh = new THREE.Mesh(geometry, material);
        scene.add(currentMesh);
        adjustCamera(geometry);
      } else if (extension === 'obj') {
        loader = new THREE.OBJLoader();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);
        const obj = loader.parse(text);
        currentMesh = obj;
        obj.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
          } else if (child.isLine || child.isLineSegments || child.material) {
            child.material = new THREE.LineBasicMaterial({ color: 0x3b82f6 });
          }
        });
        scene.add(obj);
        adjustCamera(obj);
      } else if (['glb', 'gltf'].includes(extension)) {
        loader = new THREE.GLTFLoader();
        loader.parse(buffer, '', (gltf) => {
          currentMesh = gltf.scene;
          scene.add(currentMesh);
          adjustCamera(currentMesh);
        }, (error) => {
          console.error(error);
          document.getElementById('loader').innerText = 'Error loading model';
        });
      }
    } catch (err) {
      console.error(err);
      document.getElementById('loader').innerText = 'Failed to parse model';
    }
    
    function adjustCamera(objOrGeom) {
      document.getElementById('loader').style.opacity = '0';
      setTimeout(() => document.getElementById('loader').remove(), 300);
      
      let boundingBox = new THREE.Box3();
      let hasGeometry = false;
      
      if (objOrGeom.attributes && objOrGeom.attributes.position) {
        boundingBox.setFromBufferAttribute(objOrGeom.attributes.position);
        hasGeometry = true;
      } else {
        // Traverse and calculate bounding box of only meshes, lines and line segments, ignoring grids, helpers, lights, cameras
        objOrGeom.traverse((child) => {
          if (child.isMesh || child.isLine || child.isLineSegments) {
            if (child.geometry) {
              const nameLower = (child.name || '').toLowerCase();
              const typeLower = (child.type || '').toLowerCase();
              if (typeLower.includes('grid') || nameLower.includes('grid') || typeLower.includes('helper') || nameLower.includes('helper')) {
                return;
              }
              child.geometry.computeBoundingBox();
              if (child.geometry.boundingBox) {
                const childBox = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
                if (isFinite(childBox.min.x) && isFinite(childBox.max.x)) {
                  if (!hasGeometry) {
                    boundingBox.copy(childBox);
                    hasGeometry = true;
                  } else {
                    boundingBox.union(childBox);
                  }
                }
              }
            }
          }
        });
      }
      
      if (!hasGeometry) {
        boundingBox.setFromObject(objOrGeom);
      }
      
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      
      if (objOrGeom.attributes && objOrGeom.attributes.position) {
        objOrGeom.center();
      } else {
        // Shift geometry group meshes to center at 0,0,0
        objOrGeom.position.x -= center.x;
        objOrGeom.position.y -= center.y;
        objOrGeom.position.z -= center.z;
      }
      
      let maxDim = Math.max(size.x, size.y, size.z);
      if (isNaN(maxDim) || !isFinite(maxDim) || maxDim <= 0) {
        maxDim = 50;
      }
      
      camera.near = Math.min(0.1, maxDim / 100);
      camera.far = Math.max(10000, maxDim * 100);
      camera.updateProjectionMatrix();

      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 2.5;
      camera.position.set(maxDim * 0.8, maxDim * 0.8, cameraZ);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    }
    
    document.getElementById('modelColor').addEventListener('input', (e) => {
      if (!currentMesh) return;
      currentMesh.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(e.target.value);
        } else if (child.isLine || child.isLineSegments || child.material) {
          child.material.color.set(e.target.value);
        }
      });
    });
    document.getElementById('bgColor').addEventListener('input', (e) => { scene.background.set(e.target.value); });
    document.getElementById('autoRotate').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; controls.autoRotateSpeed = 2.0; });
    
    function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
    animate();
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
  <\\/script>
</body>
</html>\`;
      }

      function getSvgTemplate(base64Data, fileName) {
        return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${fileName} - Interactive Vector Viewer</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1329; color: #ffffff; font-family: sans-serif; overflow: hidden; }
    #viewer-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; cursor: grab; }
    #viewer-container:active { cursor: grabbing; }
    svg { width: 100%; height: 100%; max-width: 90%; max-height: 90%; }
    .panel { position: absolute; bottom: 24px; left: 24px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); z-index: 10; max-width: 300px; }
    .panel h3 { margin-top: 0; margin-bottom: 12px; font-size: 16px; letter-spacing: 0.5px; color: #10b981; }
    .control-group { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .btn { background: #10b981; border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px; }
    .btn:hover { background: #059669; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"><\\/script>
</head>
<body>
  <div id="viewer-container"></div>
  <div class="panel">
    <h3>\${fileName}</h3>
    <div class="control-group"><span>Vector Image (SVG)</span><button class="btn" id="resetBtn">Reset View</button></div>
  </div>
  <script>
    const base64Data = "\${base64Data}";
    function base64ToBytes(base64) {
      const binString = atob(base64);
      const len = binString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binString.charCodeAt(i);
      }
      return bytes;
    }
    let svgText = "";
    try {
      svgText = new TextDecoder('utf-8').decode(base64ToBytes(base64Data));
    } catch (e) {
      svgText = "Error decoding SVG content.";
    }
    document.getElementById('viewer-container').innerHTML = svgText;
    
    window.onload = function() {
      const svgElement = document.querySelector('#viewer-container svg');
      if (svgElement) {
        svgElement.setAttribute('id', 'interactive-svg');
        const panZoomInstance = svgPanZoom('#interactive-svg', { zoomEnabled: true, controlIconsEnabled: false, fit: true, center: true, minZoom: 0.1, maxZoom: 50 });
        document.getElementById('resetBtn').addEventListener('click', () => { panZoomInstance.resetZoom(); panZoomInstance.resetPan(); });
      }
    };
  <\\/script>
</body>
</html>\`;
      }

      function getImageTemplate(base64Data, extension, fileName) {
        return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${fileName} - Interactive Image Viewer</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1329; color: #ffffff; font-family: sans-serif; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    #image-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; cursor: grab; }
    #image-container:active { cursor: grabbing; }
    img { max-width: 90%; max-height: 90%; object-fit: contain; user-select: none; -webkit-user-drag: none; }
    .panel { position: absolute; bottom: 24px; left: 24px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); z-index: 10; }
    .panel h3 { margin-top: 0; margin-bottom: 8px; font-size: 14px; color: #3b82f6; }
  </style>
</head>
<body>
  <div id="image-container"><img id="zoomable-img" alt="Exported Image"></div>
  <div class="panel"><h3>\${fileName}</h3><span style="font-size: 12px; opacity: 0.7;">Use pinch or drag to interact</span></div>
  <script>
    const base64Data = "\${base64Data}";
    const extension = "\${extension}";
    const img = document.getElementById('zoomable-img');
    const mime = extension === 'jpg' ? 'jpeg' : extension;
    img.src = "data:image/" + mime + ";base64," + base64Data;
    
    const container = document.getElementById('image-container');
    let scale = 1, pointX = 0, pointY = 0, start = { x: 0, y: 0 }, isPanning = false;
    function setTransform() { img.style.transform = "translate(" + pointX + "px, " + pointY + "px) scale(" + scale + ")"; }
    container.onmousedown = function(e) { e.preventDefault(); start = { x: e.clientX - pointX, y: e.clientY - pointY }; isPanning = true; }
    container.onmouseup = function(e) { isPanning = false; }
    container.onmousemove = function(e) { e.preventDefault(); if (!isPanning) return; pointX = (e.clientX - start.x); pointY = (e.clientY - start.y); setTransform(); }
    container.onwheel = function(e) {
      e.preventDefault();
      const xs = (e.clientX - pointX) / scale, ys = (e.clientY - pointY) / scale;
      const delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
      (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);
      scale = Math.min(Math.max(0.1, scale), 10);
      pointX = e.clientX - xs * scale; pointY = e.clientY - ys * scale;
      setTransform();
    }
  <\\/script>
</body>
</html>\`;
      }

      function getTextTemplate(base64Data, extension, fileName) {
        return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${fileName} - Document Viewer</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; color: #cbd5e1; font-family: monospace; font-size: 14px; }
    header { background-color: #1e293b; padding: 15px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
    header h3 { margin: 0; color: #fff; }
    .btn { background: #3b82f6; border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }
    .btn:hover { background: #2563eb; }
    pre { margin: 0; padding: 30px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; line-height: 1.5; }
  </style>
</head>
<body>
  <header><h3>\${fileName} (\${extension.toUpperCase()})</h3><button class="btn" id="copyBtn">Copy Code</button></header>
  <pre><code id="code-content"></code></pre>
  <script>
    const base64Data = "\${base64Data}";
    function base64ToBytes(base64) {
      const binString = atob(base64);
      const len = binString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binString.charCodeAt(i);
      }
      return bytes;
    }
    let code = "";
    try {
      code = new TextDecoder('utf-8').decode(base64ToBytes(base64Data));
    } catch (e) {
      code = "Error decoding document content.";
    }
    document.getElementById('code-content').textContent = code;
    document.getElementById('copyBtn').addEventListener('click', () => {
      const btn = document.getElementById('copyBtn');
      navigator.clipboard.writeText(code).then(() => {
        btn.innerText = 'Copied!';
        btn.style.background = '#10b981';
        setTimeout(() => { btn.innerText = 'Copy Code'; btn.style.background = '#3b82f6'; }, 2000);
      });
    });
  <\\/script>
</body>
</html>\`;
      }
    })();
  </script>
`;
};

const oldKeywordsRegex = /const keywords \= \['export', 'download'[^\]]+\];/;
const newKeywordsLine = "        const keywords = ['export', 'download', 'telecharger', 'save', 'obj', 'stl', 'glb', 'gltf', 'ply', 'g-code', 'gcode', 'fbx', 'dae', '3mf', 'png', 'jpg', 'jpeg', 'capture', 'video', 'record', 'rec', 'enr', 'mp4', 'webm', 'render', 'html'];";

// Automatically process discovered apps
subdirs.forEach(dir => {
  const indexPath = path.join(appsDir, dir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');

    // Skip rules and ar-viewer, they have no payment trigger or have custom logic
    if (dir === 'rules' || dir === 'ar-viewer') return;

    let ref = dir;
    if (dir === 'studio-3d-viewer') {
      ref = 's3dviewer';
    } else if (dir === 'ap3d') {
      ref = 'ap3d';
    } else {
      const match = content.match(/payload:\s*\{\s*ref:\s*'([^']+)'\s*\}/) || content.match(/refStudio:\s*'([^']+)'/);
      if (match) {
        ref = match[1];
      } else {
        // mapping fallbacks
        if (dir === 'depth-maps') ref = 'depth';
        if (dir === 'new3d4d') ref = 'n3d';
        if (dir === 'vector-cnc') ref = 'vcnc';
        if (dir === 'studio-pro') ref = 'spro';
        if (dir === 'maker7') ref = 'mkr7';
        if (dir === 'jewelry-pro') ref = 'jwly';
        if (dir === 'architect-pro-1') ref = 'arp1';
        if (dir === 'architect-pro-2') ref = 'arp2';
        if (dir === 'figure-builder') ref = 'figb';
        if (dir === 'music-composer') ref = 'musc';
        if (dir === 'design-pro-studio') ref = 'desp';
        if (dir === 'studio-pro-2') ref = 'spro2';
        if (dir === 'mech-gen-pro') ref = 'mechgen';
        if (dir === 'dfx') ref = 'dfx';
        if (dir === 'aura-gen') ref = 'aurg';
        if (dir === 'ia-architecte') ref = 'iaar';
      }
    }

    // 1. Clean up ALL script tags containing 'studios_pro_channel' (using safe lookahead)
    content = content.replace(/<script[^>]*>(?:(?!<\/script>)[\s\S])*?studios_pro_channel[\s\S]*?<\/script>/gi, '');

    // 2. Clean up any existing back buttons
    content = content.replace(/<button[^>]*id=["']back-btn["'][^>]*>[\s\S]*?<\/button>/gi, '');

    // 3. Clean up any existing back-to-studios styles safely
    content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
      if (css.includes('.back-to-studios') && !css.includes('local-payment-modal') && !css.includes('local-modal-content') && !css.includes('pay-btn') && !css.includes('premium-btn')) {
        return '';
      }
      return match;
    });

    // 3. Inject new logic at the top of the body (if body tag exists)
    const newScript = scriptTemplate(ref);
    const bodyRegex = /(<body[^>]*>)/i;
    if (bodyRegex.test(content)) {
      content = content.replace(bodyRegex, (match) => match + '\n' + newScript.trim());
      console.log('Injected clean script in: ' + dir + ' (ref: ' + ref + ')');
    } else {
      // Fallback for files without a body tag: inject right after head tag closing or at the top of file
      const headCloseRegex = /(<\/head>)/i;
      if (headCloseRegex.test(content)) {
        content = content.replace(headCloseRegex, (match) => match + '\n<body>\n' + newScript.trim());
        // Also close the body tag before html close
        content = content.replace(/(<\/html>)/i, '</body>\n$1');
        console.log('Injected clean script with head-close fallback in: ' + dir + ' (ref: ' + ref + ')');
      } else {
        console.log('Failed to find body or head tags in: ' + dir);
      }
    }

    // Patch keywords in the file content if keywords array matches
    if (oldKeywordsRegex.test(content)) {
      content = content.replace(oldKeywordsRegex, () => newKeywordsLine);
      console.log('Patched keywords array in: ' + dir);
    }

    fs.writeFileSync(indexPath, content, 'utf8');
  }
});
