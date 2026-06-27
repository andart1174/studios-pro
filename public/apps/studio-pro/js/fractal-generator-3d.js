// Fractal Generator → 3D Scene
window.FractalGenerator3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'fractal3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#a855f7,#06b6d4,#10b981);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌀</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Fractal Generator 3D' : 'Générateur Fractal 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Infinite mathematical art' : 'Art mathématique infini'}</div>
        </div>
      </div>

      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Fractal Type' : 'Type de Fractal'}</div>
      <select id="fractal3d-type" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;margin-bottom:10px;">
        <option value="mandelbrot">${isEN ? '🌀 Mandelbrot Heightmap' : '🌀 Relief Mandelbrot'}</option>
        <option value="julia">${isEN ? '💎 Julia Set 3D' : '💎 Julia Set 3D'}</option>
        <option value="sierpinski">${isEN ? '🔺 Sierpiński Tetrahedron' : '🔺 Tétraèdre de Sierpiński'}</option>
        <option value="menger">${isEN ? '🔳 Menger Sponge' : '🔳 Éponge de Menger'}</option>
        <option value="dragon">${isEN ? '🐉 Dragon Curve Tower' : '🐉 Tour Courbe Dragon'}</option>
        <option value="snowflake">${isEN ? '❄️ Koch Snowflake 3D' : '❄️ Flocon Koch 3D'}</option>
      </select>

      <div id="fractal3d-mandelbrot-opts">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Resolution' : 'Résolution'} <b id="frac-resv">60</b></div>
            <input type="range" id="fractal3d-res" min="20" max="120" value="60" style="width:100%;accent-color:#a855f7;">
          </div>
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Iterations' : 'Itérations'} <b id="frac-iterv">32</b></div>
            <input type="range" id="fractal3d-iter" min="8" max="128" step="8" value="32" style="width:100%;accent-color:#06b6d4;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Zoom' : 'Zoom'} <b id="frac-zv">1.0</b></div>
            <input type="range" id="fractal3d-zoom" min="0.3" max="5" step="0.1" value="1.0" style="width:100%;accent-color:#10b981;">
          </div>
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Height Scale' : 'Amplitude'} <b id="frac-hv">1.0</b></div>
            <input type="range" id="fractal3d-height" min="0.1" max="4" step="0.1" value="1.0" style="width:100%;accent-color:#a855f7;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Center X' : 'Centre X'} <b id="frac-cxv">-0.5</b></div>
            <input type="range" id="fractal3d-cx" min="-2" max="1" step="0.05" value="-0.5" style="width:100%;accent-color:#f59e0b;">
          </div>
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Center Y' : 'Centre Y'} <b id="frac-cyv">0.0</b></div>
            <input type="range" id="fractal3d-cy" min="-1.5" max="1.5" step="0.05" value="0.0" style="width:100%;accent-color:#f59e0b;">
          </div>
        </div>
      </div>

      <div id="fractal3d-julia-opts" style="display:none;margin-bottom:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">Julia C real <b id="frac-jcrv">-0.7</b></div>
            <input type="range" id="fractal3d-jcr" min="-2" max="2" step="0.05" value="-0.7" style="width:100%;accent-color:#a855f7;">
          </div>
          <div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">Julia C imag <b id="frac-jciv">0.27</b></div>
            <input type="range" id="fractal3d-jci" min="-2" max="2" step="0.05" value="0.27" style="width:100%;accent-color:#06b6d4;">
          </div>
        </div>
      </div>

      <div id="fractal3d-sierpinski-opts" style="display:none;margin-bottom:8px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Recursion Depth' : 'Profondeur Récursion'} <b id="frac-depthv">3</b></div>
          <input type="range" id="fractal3d-depth" min="1" max="5" value="3" style="width:100%;accent-color:#a855f7;">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Color Mode' : 'Mode Couleur'}</div>
          <select id="fractal3d-color" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="psychedelic">Psychedelic</option>
            <option value="fire">${isEN ? 'Fire' : 'Feu'}</option>
            <option value="ocean">Ocean</option>
            <option value="neon">Neon</option>
            <option value="gold">${isEN ? 'Gold' : 'Or'}</option>
            <option value="ice">${isEN ? 'Ice' : 'Glace'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Render Mode' : 'Mode Rendu'}</div>
          <select id="fractal3d-render" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="solid">Solid</option>
            <option value="wireframe">Wireframe</option>
            <option value="points">${isEN ? 'Point Cloud' : 'Nuage Points'}</option>
          </select>
        </div>
      </div>

      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#c084fc;margin-bottom:10px;">
        <input type="checkbox" id="fractal3d-animate" style="width:auto;margin-right:8px;"> 🌀 ${isEN ? 'Animate (slow rotation + pulse)' : 'Animer (rotation + pulse)'}
      </label>

      <button id="fractal3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#a855f7,#06b6d4,#10b981);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(168,85,247,0.4);">
        ${isEN ? '🌀 GENERATE & ADD TO SCENE' : '🌀 GÉNÉRER & AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const typeSelect = _panel.querySelector('#fractal3d-type');
    const mandOpts = _panel.querySelector('#fractal3d-mandelbrot-opts');
    const juliaOpts = _panel.querySelector('#fractal3d-julia-opts');
    const sierOpts = _panel.querySelector('#fractal3d-sierpinski-opts');

    // Show/hide options based on fractal type
    typeSelect.addEventListener('change', (e) => {
      const t = e.target.value;
      mandOpts.style.display = (t === 'mandelbrot' || t === 'menger' || t === 'dragon' || t === 'snowflake') ? 'block' : 'none';
      juliaOpts.style.display = t === 'julia' ? 'block' : 'none';
      sierOpts.style.display = (t === 'sierpinski') ? 'block' : 'none';
    });

    // Sliders
    const sliders = [
      ['#fractal3d-res', '#frac-resv', v => v],
      ['#fractal3d-iter', '#frac-iterv', v => v],
      ['#fractal3d-zoom', '#frac-zv', v => (+v).toFixed(1)],
      ['#fractal3d-height', '#frac-hv', v => (+v).toFixed(1)],
      ['#fractal3d-cx', '#frac-cxv', v => (+v).toFixed(2)],
      ['#fractal3d-cy', '#frac-cyv', v => (+v).toFixed(2)],
      ['#fractal3d-jcr', '#frac-jcrv', v => (+v).toFixed(2)],
      ['#fractal3d-jci', '#frac-jciv', v => (+v).toFixed(2)],
      ['#fractal3d-depth', '#frac-depthv', v => v],
    ];
    sliders.forEach(([inp, lbl, fmt]) => {
      const el = _panel.querySelector(inp), lel = _panel.querySelector(lbl);
      if (el && lel) el.addEventListener('input', e => { lel.textContent = fmt(e.target.value); });
    });

    _panel.querySelector('#fractal3d-add').onclick = () => {
      const config = {
        fractalType: typeSelect.value,
        res: +_panel.querySelector('#fractal3d-res').value,
        iterations: +_panel.querySelector('#fractal3d-iter').value,
        zoom: +_panel.querySelector('#fractal3d-zoom').value,
        heightScale: +_panel.querySelector('#fractal3d-height').value,
        centerX: +_panel.querySelector('#fractal3d-cx').value,
        centerY: +_panel.querySelector('#fractal3d-cy').value,
        juliaR: +_panel.querySelector('#fractal3d-jcr').value,
        juliaI: +_panel.querySelector('#fractal3d-jci').value,
        depth: +_panel.querySelector('#fractal3d-depth').value,
        colorMode: _panel.querySelector('#fractal3d-color').value,
        renderMode: _panel.querySelector('#fractal3d-render').value,
        doAnimate: _panel.querySelector('#fractal3d-animate').checked
      };
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('fractal-3d', config);
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container; buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      _panel.style.display = visible ? 'none' : 'flex';
      _panel.style.flexDirection = 'column';
    });
  }
  return { init };
})();
