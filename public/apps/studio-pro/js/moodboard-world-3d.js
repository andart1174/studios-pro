// Moodboard → 3D Themed World
window.MoodboardWorld3D = (() => {
  'use strict';
  let _container, _panel;

  const MOODS = {
    cyberpunk:   { label: 'Cyberpunk 2077', emoji: '🤖', grad: 'linear-gradient(135deg,#f472b6,#06b6d4)', desc: { en: 'Neon city, dark rain, holograms', fr: 'Ville néon, pluie noire, hologrammes' } },
    renaissance: { label: 'Renaissance', emoji: '🎨', grad: 'linear-gradient(135deg,#d97706,#92400e)', desc: { en: 'Gold pillars, domes, sculpture', fr: 'Piliers or, coupoles, sculpture' } },
    pastel:      { label: 'Pastel Dream', emoji: '🌸', grad: 'linear-gradient(135deg,#f9a8d4,#c4b5fd)', desc: { en: 'Soft clouds, flowers, gentle hills', fr: 'Nuages doux, fleurs, collines' } },
    darkfantasy: { label: 'Dark Fantasy', emoji: '🧙', grad: 'linear-gradient(135deg,#4c1d95,#1e1b4b)', desc: { en: 'Spires, runes, dark castle', fr: 'Flèches, runes, château sombre' } },
    space:       { label: 'Space Opera', emoji: '🚀', grad: 'linear-gradient(135deg,#1e40af,#7c3aed)', desc: { en: 'Stars, nebula, alien structures', fr: 'Étoiles, nébuleuse, structures aliens' } },
    jungle:      { label: 'Jungle', emoji: '🌿', grad: 'linear-gradient(135deg,#065f46,#84cc16)', desc: { en: 'Organic forms, vines, bioluminescence', fr: 'Formes organiques, lianes, bioluminescence' } },
    underwater:  { label: 'Deep Ocean', emoji: '🌊', grad: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)', desc: { en: 'Corals, bubbles, sea creatures', fr: 'Coraux, bulles, créatures marines' } },
    minimal:     { label: 'Minimalist', emoji: '⬜', grad: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', desc: { en: 'Clean geometry, white space', fr: 'Géométrie pure, espace blanc' } }
  };

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'moodboard3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';

    const moodBtns = Object.entries(MOODS).map(([k, v]) =>
      `<button class="mood-btn" data-mood="${k}" style="padding:8px;background:${v.grad};border:2px solid transparent;border-radius:8px;cursor:pointer;text-align:center;font-size:11px;font-weight:700;color:#fff;transition:all 0.2s;">
        <div style="font-size:18px;">${v.emoji}</div>${v.label}
      </button>`
    ).join('');

    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f472b6,#c4b5fd,#34d399);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎭</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Moodboard → 3D World' : 'Moodboard → Monde 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Your mood shapes the scene' : 'Votre humeur façonne la scène'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">${isEN ? 'Choose your visual universe:' : 'Choisissez votre univers visuel:'}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">${moodBtns}</div>
      <div id="moodboard3d-desc" style="background:#1e293b;border-radius:6px;padding:8px;font-size:10px;color:#94a3b8;margin-bottom:10px;text-align:center;min-height:30px;"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <label style="font-size:10px;color:#94a3b8;min-width:90px;">${isEN ? 'Complexity' : 'Complexité'} <b id="mood-cv">5</b></label>
        <input type="range" id="moodboard3d-complexity" min="1" max="10" value="5" style="flex:1;accent-color:#f472b6;">
      </div>
      <label style="display:flex;align-items:center;cursor:pointer;font-size:11px;color:#c084fc;margin-bottom:10px;">
        <input type="checkbox" id="moodboard3d-animate" checked style="width:auto;margin-right:8px;"> ✨ ${isEN ? 'Ambient animation' : 'Animation ambiante'}
      </label>
      <button id="moodboard3d-add" disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#f472b6,#c4b5fd);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:not-allowed;opacity:0.5;">
        ${isEN ? '🎭 GENERATE 3D WORLD' : '🎭 GÉNÉRER MONDE 3D'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  let _selectedMood = null;

  function _bindUI() {
    _panel.querySelector('#moodboard3d-complexity').addEventListener('input', e => { _panel.querySelector('#mood-cv').textContent = e.target.value; });
    _panel.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _panel.querySelectorAll('.mood-btn').forEach(b => b.style.border = '2px solid transparent');
        btn.style.border = '2px solid #fff';
        _selectedMood = btn.dataset.mood;
        const isEN = (window.currentLang || 'en') !== 'fr';
        const desc = MOODS[_selectedMood].desc;
        _panel.querySelector('#moodboard3d-desc').textContent = MOODS[_selectedMood].emoji + ' ' + desc[isEN ? 'en' : 'fr'];
        const addBtn = _panel.querySelector('#moodboard3d-add');
        addBtn.disabled = false; addBtn.style.cursor = 'pointer'; addBtn.style.opacity = '1';
      });
    });
    _panel.querySelector('#moodboard3d-add').onclick = () => {
      if (!_selectedMood) return;
      const complexity = +_panel.querySelector('#moodboard3d-complexity').value;
      const doAnimate = _panel.querySelector('#moodboard3d-animate').checked;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('moodboard-world', { mood: _selectedMood, complexity, doAnimate });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container; buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      _panel.style.display = visible ? 'none' : 'flex'; _panel.style.flexDirection = 'column';
    });
  }
  return { init };
})();
