// Sentiment / Emotion → 3D Landscape
window.SentimentLandscape3D = (() => {
  'use strict';
  let _container, _panel;

  // Bilingual sentiment dictionaries
  const POSITIVE = ['happy','joy','love','wonderful','amazing','great','beautiful','fantastic','excellent','good','hope','bright','peace','smile','dream','success','perfect','brilliant','awesome','outstanding','superb','radiant','glorious','jubilant','triumph','heureux','joie','amour','magnifique','merveilleux','excellent','beau','fantastique','espoir','brillant','parfait','sublime','lumineux','glorieux','paix'];
  const NEGATIVE = ['sad','sorrow','grief','dark','pain','hurt','loss','cry','despair','lonely','cold','empty','broken','misery','gloomy','hopeless','bleak','triste','douleur','chagrin','sombre','perte','désespoir','seul','vide','brisé','mélancolie','lugubre','morne'];
  const ANGRY = ['anger','rage','fury','hate','mad','furious','violent','destroy','fight','war','curse','wrath','colère','rage','haine','furieux','violent','détruire','combat','guerre','maudire'];
  const FEAR = ['fear','scared','terror','horror','dread','panic','danger','threat','nightmare','peur','effrayé','terreur','horreur','angoisse','panique','danger','menace','cauchemar'];
  const ENERGY = ['power','strong','fire','electric','spark','burst','explode','surge','force','rush','puissance','fort','feu','électrique','étincelle','exploser','élan'];

  function _analyze(text) {
    const words = text.toLowerCase().replace(/[^a-záàâäéèêëîïôùûüç\s]/g, '').split(/\s+/);
    const counts = { positive: 0, negative: 0, angry: 0, fear: 0, energy: 0, total: words.length || 1 };
    words.forEach(w => {
      if (POSITIVE.includes(w)) counts.positive++;
      if (NEGATIVE.includes(w)) counts.negative++;
      if (ANGRY.includes(w)) counts.angry++;
      if (FEAR.includes(w)) counts.fear++;
      if (ENERGY.includes(w)) counts.energy++;
    });
    // Dominant emotion
    const scores = [
      { name: 'positive', val: counts.positive },
      { name: 'negative', val: counts.negative },
      { name: 'angry', val: counts.angry },
      { name: 'fear', val: counts.fear },
      { name: 'energy', val: counts.energy }
    ];
    scores.sort((a, b) => b.val - a.val);
    return { dominant: scores[0].name, counts, words };
  }

  const EMOTION_CONFIG = {
    positive: { peakH: 40, valleyH: 5, colorA: '#10b981', colorB: '#34d399', bgColor: '#0f4c35', desc: { en: 'Joy & Brightness', fr: 'Joie & Lumière' } },
    negative:  { peakH: 8, valleyH: -30, colorA: '#334155', colorB: '#1e3a5f', bgColor: '#0a0a1a', desc: { en: 'Sadness & Depth', fr: 'Tristesse & Profondeur' } },
    angry:    { peakH: 50, valleyH: -10, colorA: '#ef4444', colorB: '#f97316', bgColor: '#1a0505', desc: { en: 'Rage & Fire', fr: 'Colère & Feu' } },
    fear:     { peakH: 25, valleyH: -25, colorA: '#7c3aed', colorB: '#1e1b4b', bgColor: '#0d0d1a', desc: { en: 'Terror & Shadow', fr: 'Terreur & Ombre' } },
    energy:   { peakH: 60, valleyH: 10, colorA: '#facc15', colorB: '#f59e0b', bgColor: '#1a1500', desc: { en: 'Power & Energy', fr: 'Puissance & Énergie' } }
  };

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'sentiment3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#8b5cf6,#ec4899,#f59e0b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧠</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Emotion → 3D Landscape' : 'Émotion → Paysage 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Text sentiment becomes terrain' : 'Le texte devient un relief 3D'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Enter your text (poem, message, speech...):' : 'Entrez votre texte (poème, message, discours...):'}</div>
      <textarea id="sentiment3d-text" placeholder="${isEN ? 'I feel joy and hope...\nThe darkness surrounds...\nRage burns like fire...' : 'Je ressens la joie et l\'espoir...\nL\'obscurité m\'entoure...\nLa colère brûle...'}" style="width:100%;height:100px;padding:10px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:12px;font-family:Inter,sans-serif;resize:none;margin-bottom:10px;line-height:1.5;"></textarea>

      <div id="sentiment3d-result" style="display:none;padding:10px;border-radius:8px;margin-bottom:10px;font-size:11px;font-weight:700;text-align:center;border:1px solid;"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Resolution' : 'Résolution'} <b id="sent-resv">40</b></div>
          <input type="range" id="sentiment3d-res" min="10" max="80" value="40" style="width:100%;accent-color:#8b5cf6;">
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Height Scale' : 'Amplitude'} <b id="sent-hv">1.0</b></div>
          <input type="range" id="sentiment3d-amp" min="0.2" max="3" step="0.1" value="1.0" style="width:100%;accent-color:#8b5cf6;">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Terrain Style' : 'Style Terrain'}</div>
          <select id="sentiment3d-style" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="smooth">${isEN ? 'Smooth Hills' : 'Collines Douces'}</option>
            <option value="sharp">${isEN ? 'Sharp Peaks' : 'Pics Acérés'}</option>
            <option value="waves">${isEN ? 'Wave Field' : 'Champ de Vagues'}</option>
            <option value="crystal">${isEN ? 'Crystal Shards' : 'Éclats Cristal'}</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Animation' : 'Animation'}</div>
          <select id="sentiment3d-anim" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="none">${isEN ? 'Static' : 'Statique'}</option>
            <option value="breathe">${isEN ? 'Breathing' : 'Respiration'}</option>
            <option value="wave">${isEN ? 'Wave Flow' : 'Flux de Vagues'}</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button id="sentiment3d-analyze" style="flex:1;padding:8px;background:linear-gradient(135deg,#7c3aed,#ec4899);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">
          🔍 ${isEN ? 'Analyze' : 'Analyser'}
        </button>
        <button id="sentiment3d-add" disabled style="flex:2;padding:8px;background:linear-gradient(135deg,#8b5cf6,#ec4899,#f59e0b);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:700;cursor:not-allowed;opacity:0.5;">
          📐 ${isEN ? 'ADD TO SCENE' : 'AJOUTER À LA SCÈNE'}
        </button>
      </div>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  let _lastResult = null;

  function _bindUI() {
    const resRange = _panel.querySelector('#sentiment3d-res');
    const ampRange = _panel.querySelector('#sentiment3d-amp');
    resRange.addEventListener('input', e => { _panel.querySelector('#sent-resv').textContent = e.target.value; });
    ampRange.addEventListener('input', e => { _panel.querySelector('#sent-hv').textContent = (+e.target.value).toFixed(1); });

    _panel.querySelector('#sentiment3d-analyze').onclick = () => {
      const text = _panel.querySelector('#sentiment3d-text').value;
      if (!text.trim()) return;
      const result = _analyze(text);
      _lastResult = result;
      const cfg = EMOTION_CONFIG[result.dominant];
      const isEN = (window.currentLang || 'en') !== 'fr';
      const resDiv = _panel.querySelector('#sentiment3d-result');
      resDiv.style.display = 'block';
      resDiv.style.background = cfg.bgColor;
      resDiv.style.borderColor = cfg.colorA;
      resDiv.style.color = cfg.colorA;
      resDiv.innerHTML = `Dominant emotion: <span style="font-size:16px;">${result.dominant === 'positive' ? '😊' : result.dominant === 'negative' ? '😢' : result.dominant === 'angry' ? '😡' : result.dominant === 'fear' ? '😨' : '⚡'}</span><br><b>${cfg.desc[isEN ? 'en' : 'fr']}</b><br><small style="color:#94a3b8;">+${result.counts.positive} pos | -${result.counts.negative} neg | ⚡${result.counts.energy} energy | 🔥${result.counts.angry} angry | 😱${result.counts.fear} fear</small>`;
      const addBtn = _panel.querySelector('#sentiment3d-add');
      addBtn.disabled = false; addBtn.style.cursor = 'pointer'; addBtn.style.opacity = '1';
    };

    _panel.querySelector('#sentiment3d-add').onclick = () => {
      if (!_lastResult) return;
      const res = +_panel.querySelector('#sentiment3d-res').value;
      const amp = +_panel.querySelector('#sentiment3d-amp').value;
      const terrainStyle = _panel.querySelector('#sentiment3d-style').value;
      const animMode = _panel.querySelector('#sentiment3d-anim').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('sentiment-landscape', {
          analysis: _lastResult, res, amp, terrainStyle, animMode
        });
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
