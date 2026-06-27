// Web Nodes → 3D Network Map
window.WebNetwork3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'webnet3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#3b82f6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🌐</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Network → 3D Map' : 'Réseau → Carte 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Node graph visualization' : 'Graphe de nœuds 3D'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter nodes (one per line, use → for links):' : 'Entrez les nœuds (un par ligne, → pour liens):'}</div>
      <textarea id="webnet3d-text" placeholder="${isEN ? 'Home\nHome → About\nHome → Products\nProducts → Item A\nProducts → Item B' : 'Accueil\nAccueil → À propos\nAccueil → Produits\nProduits → Article A'}" style="width:100%;height:110px;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#fff;font-size:11px;resize:none;margin-bottom:8px;"></textarea>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Layout' : 'Disposition'}</div>
      <select id="webnet3d-layout" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;margin-bottom:8px;">
        <option value="sphere">${isEN ? 'Sphere' : 'Sphère'}</option>
        <option value="tree">${isEN ? 'Tree' : 'Arbre'}</option>
        <option value="galaxy">${isEN ? 'Galaxy' : 'Galaxie'}</option>
      </select>
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="flex:1;"><div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Node Color' : 'Couleur Nœud'}</div>
        <input type="color" id="webnet3d-ncolor" value="#06b6d4" style="width:100%;height:26px;border:none;background:none;cursor:pointer;"></div>
        <div style="flex:1;"><div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Link Color' : 'Couleur Lien'}</div>
        <input type="color" id="webnet3d-lcolor" value="#3b82f6" style="width:100%;height:26px;border:none;background:none;cursor:pointer;"></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <label style="font-size:10px;color:#94a3b8;min-width:90px;">${isEN ? 'Node Size' : 'Taille Nœud'} <b id="webnet3d-sv">4</b></label>
        <input type="range" id="webnet3d-size" min="1" max="12" value="4" style="flex:1;accent-color:#06b6d4;">
      </div>
      <button id="webnet3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#06b6d4,#3b82f6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '📐 ADD TO SCENE' : '📐 AJOUTER À LA SCÈNE'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    _panel.querySelector('#webnet3d-size').addEventListener('input', e => { _panel.querySelector('#webnet3d-sv').textContent = e.target.value; });
    _panel.querySelector('#webnet3d-add').onclick = () => {
      const text = _panel.querySelector('#webnet3d-text').value || 'Home\nHome → About\nHome → Products';
      const lines = text.split('\n').filter(l => l.trim());
      const nodes = [], links = [];
      const nodeSet = new Set();
      lines.forEach(l => {
        if (l.includes('→')) {
          const parts = l.split('→').map(s => s.trim());
          parts.forEach(p => nodeSet.add(p));
          links.push({ from: parts[0], to: parts[1] });
        } else { nodeSet.add(l.trim()); }
      });
      nodeSet.forEach(n => nodes.push(n));
      const layout = _panel.querySelector('#webnet3d-layout').value;
      const nodeColor = _panel.querySelector('#webnet3d-ncolor').value;
      const linkColor = _panel.querySelector('#webnet3d-lcolor').value;
      const nodeSize = +_panel.querySelector('#webnet3d-size').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('web-network', { nodes, links, layout, nodeColor, linkColor, nodeSize });
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
