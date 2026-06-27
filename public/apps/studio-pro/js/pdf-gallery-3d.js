// PDF → 3D Virtual Gallery
window.PdfGallery3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'pdf3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f43f5e,#fb923c);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">📄</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'PDF to 3D Gallery' : 'PDF en Galerie 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Interactive document viewer' : 'Visionneuse de doc interactive'}</div>
        </div>
      </div>
      
      <div style="margin-bottom:15px;">
         <label style="display:block;width:100%;padding:15px;background:#1e293b;border:1px dashed #475569;border-radius:8px;text-align:center;cursor:pointer;font-size:12px;color:#94a3b8;transition:all 0.2s;">
            <div id="pdf3d-upload-lbl">📁 ${isEN ? 'Select PDF File (Max 12 pages)' : 'Choisir un fichier PDF (Max 12 pages)'}</div>
            <input type="file" id="pdf3d-file" accept=".pdf" style="display:none;" />
         </label>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        <div class="pdf3d-row"><span style="font-size:10px;color:#94a3b8;">Layout</span>
        <select id="pdf3d-layout" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
          <option value="wall">Wall</option>
          <option value="spiral">Spiral</option>
          <option value="orbit">Orbit</option>
        </select></div>
      </div>
      
      <div id="pdf3d-status" style="font-size:10px;color:#10b981;margin-bottom:10px;text-align:center;display:none;"></div>

      <button id="pdf3d-add" disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#f43f5e,#fb923c);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:not-allowed;box-shadow:0 4px 15px rgba(244,63,94,0.3);opacity:0.5;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>
    `;
    _container.appendChild(_panel);
    _bindUI();
  }

  let _pdfImages = [];

  function _bindUI() {
    const fileIn = _panel.querySelector('#pdf3d-file');
    const lbl = _panel.querySelector('#pdf3d-upload-lbl');
    const status = _panel.querySelector('#pdf3d-status');
    const addBtn = _panel.querySelector('#pdf3d-add');

    fileIn.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        lbl.textContent = '⏳ Processing PDF...';
        status.style.display = 'block';
        status.textContent = 'Loading document...';
        
        try {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error("pdf.js is not loaded.");
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = Math.min(pdf.numPages, 12); // Limit to 12 pages for performance
            
            _pdfImages = [];
            for (let i = 1; i <= numPages; i++) {
                status.textContent = `Processing page ${i} of ${numPages}...`;
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                
                // Downscale slightly if too large to save texture memory
                const scale = Math.min(1.0, 512 / viewport.width);
                const finalViewport = page.getViewport({ scale: 1.5 * scale });
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = finalViewport.width;
                canvas.height = finalViewport.height;
                
                const renderContext = {
                    canvasContext: ctx,
                    viewport: finalViewport
                };
                await page.render(renderContext).promise;
                _pdfImages.push(canvas.toDataURL('image/jpeg', 0.8));
            }
            
            lbl.textContent = '✅ ' + file.name;
            status.textContent = 'Ready!';
            addBtn.disabled = false;
            addBtn.style.cursor = 'pointer';
            addBtn.style.opacity = '1';
        } catch(err) {
            console.error(err);
            lbl.textContent = '❌ Error processing PDF';
            status.textContent = 'Failed to load PDF. Check console.';
        }
    });

    addBtn.onclick = () => {
      if(_pdfImages.length === 0) return;
      const layout = _panel.querySelector('#pdf3d-layout').value;

      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('pdf-gallery', { images: _pdfImages, layout: layout });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container;
    buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display='none');
      _panel.style.display = visible ? 'none' : 'flex';
      _panel.style.flexDirection = 'column';
    });
  }

  return { init };
})();
