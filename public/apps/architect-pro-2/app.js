/**
 * Architect Pro 2 (v3.0) — Application Orchestrator & Studios-Pro Host Bridge
 * Fixes: Imperial ft->m wizard bug, House Type -> Floors sync, 2D->BOQ live sync,
 * 5-column BOQ table, stable custom price IDs, complete EN/FR i18n, and host contracts.
 */
const Eng = window.ArchEng;
const CAD = window.ArchCAD2D;

const STATE = {
  started: false,
  lang: 'en',
  unitSystem: 'metric', // 'metric' | 'imperial'
  activePhase: 0,
  activeFloor: 0,
  activeDeckTab: 'steps',
  boqScope: 'phase', // 'phase' | 'all'
  userTier: 'free',
  project: {
    houseType: 'single',
    length: 12,        // ALWAYS stored internally in METERS!
    width: 9,
    floorHeight: 2.85,
    floors: 1,
    foundationType: 'strip',
    roofType: 'hip',
    budget: 240000,
    region: 'temperate',
    layoutPreset: 'family3'
  },
  colors: {
    extWalls: '#e5d5c0',
    roof: '#b45309',
    winDoors: '#1e293b',
    intWalls: '#f1f5f9',
    floor: '#c8a882',
    ground: '#3f8f54'
  },
  floorPlans: [],
  completedSteps: {}, // { 'f1': true, ... }
  customPrices: {}    // { 'fnd_conc': 155, ... } keyed by STABLE material ID!
};

let _cachedStats = null;
let _cachedEng = null;
let _cachedThermal = null;
let _cachedBOQ = null;
let _cachedGantt = null;

// Pending quota-checked export callback for host postMessage bridge
let _pendingExport = null;

function $(id) { return document.getElementById(id); }

function showToast(msg) {
  const box = $('toast-box');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, 2800);
}

// =========================================================================
// 1. WIZARD POPULATION, PRESETS & ACCURATE METRIC/IMPERIAL CONVERSION
// =========================================================================

function populateWizardSelects() {
  const isFr = STATE.lang === 'fr';
  const T = Eng.getT(STATE.lang);

  const fillSel = (id, list, val) => {
    const sel = $(id);
    if (!sel) return;
    sel.innerHTML = list.map(it => `<option value="${it.id}">${isFr ? it.fr : it.en}</option>`).join('');
    sel.value = val;
  };

  fillSel('inp-type', Eng.HOUSE_TYPES, STATE.project.houseType);
  fillSel('inp-foundation', Eng.FOUNDATION_TYPES, STATE.project.foundationType);
  fillSel('inp-roof', Eng.ROOF_TYPES, STATE.project.roofType);
  fillSel('inp-region', Eng.REGIONS, STATE.project.region);

  const laySel = $('inp-layout');
  if (laySel) {
    laySel.innerHTML = ['family3', 'villa4', 'open', 'empty']
      .map(k => `<option value="${k}">${T.layoutOpts[k]}</option>`).join('');
    laySel.value = STATE.project.layoutPreset || 'family3';
  }

  // Render 4 Quick-Start Templates
  const pGrid = $('wiz-presets');
  if (pGrid) {
    pGrid.innerHTML = Eng.QUICK_PRESETS.map(pr => `
      <button type="button" class="preset-card" data-preset="${pr.id}">
        <div class="pr-top"><span>${pr.icon}</span><span>${isFr ? pr.fr : pr.en}</span></div>
        <div class="pr-meta">${isFr ? pr.metaFr : pr.metaEn}</div>
      </button>
    `).join('');
    pGrid.querySelectorAll('.preset-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const pr = Eng.QUICK_PRESETS.find(x => x.id === btn.dataset.preset);
        if (!pr) return;
        Object.assign(STATE.project, pr.config);
        syncWizardInputsFromProject();
        pGrid.querySelectorAll('.preset-card').forEach(b => b.classList.toggle('active', b === btn));
        launchWorkspace(true);
      });
    });
  }

  syncWizardInputsFromProject();
}

function syncWizardInputsFromProject() {
  const p = STATE.project;
  const u = STATE.unitSystem;
  const dec = u === 'imperial' ? 1 : 2;
  document.querySelectorAll('.unit-len-lbl').forEach(el => { el.textContent = u === 'imperial' ? 'ft' : 'm'; });

  if ($('inp-type')) $('inp-type').value = p.houseType;
  if ($('inp-layout')) $('inp-layout').value = p.layoutPreset || 'family3';
  if ($('inp-length')) $('inp-length').value = +Eng.fromMeters(p.length, u).toFixed(dec);
  if ($('inp-width')) $('inp-width').value = +Eng.fromMeters(p.width, u).toFixed(dec);
  if ($('inp-height')) $('inp-height').value = +Eng.fromMeters(p.floorHeight, u).toFixed(dec);
  if ($('inp-floors')) $('inp-floors').value = p.floors;
  if ($('inp-foundation')) $('inp-foundation').value = p.foundationType;
  if ($('inp-roof')) $('inp-roof').value = p.roofType;
  if ($('inp-budget')) $('inp-budget').value = p.budget;
  if ($('inp-region')) $('inp-region').value = p.region;
}

function readWizardIntoProject() {
  const u = STATE.unitSystem;
  // FIXED IMPERIAL BUG: Convert feet -> meters reliably via Eng.toMeters()!
  const rawL = Eng.toMeters($('inp-length').value, u);
  const rawW = Eng.toMeters($('inp-width').value, u);
  const rawH = Eng.toMeters($('inp-height').value, u);

  STATE.project.houseType = $('inp-type').value || 'single';
  STATE.project.layoutPreset = $('inp-layout').value || 'family3';
  STATE.project.length = +Math.max(4, Math.min(60, rawL || 12)).toFixed(2);
  STATE.project.width = +Math.max(4, Math.min(50, rawW || 9)).toFixed(2);
  STATE.project.floorHeight = +Math.max(2.2, Math.min(5.0, rawH || 2.85)).toFixed(2);
  STATE.project.floors = Math.max(1, Math.min(5, parseInt($('inp-floors').value, 10) || 1));
  STATE.project.foundationType = $('inp-foundation').value || 'strip';
  STATE.project.roofType = $('inp-roof').value || 'hip';
  STATE.project.budget = Math.max(25000, parseFloat($('inp-budget').value) || 240000);
  STATE.project.region = $('inp-region').value || 'temperate';
}

function rebuildFloorPlans(preset) {
  const p = STATE.project;
  STATE.floorPlans = [];
  for (let f = 0; f < p.floors; f++) {
    STATE.floorPlans.push(Eng.generatePartitionLayout(p.length, p.width, preset || p.layoutPreset, f, p.floors));
  }
  STATE.activeFloor = 0;
}

function launchWorkspace(rebuildPlans) {
  if (!rebuildPlans) readWizardIntoProject();
  if (rebuildPlans || STATE.floorPlans.length !== STATE.project.floors) {
    rebuildFloorPlans(STATE.project.layoutPreset);
  }
  STATE.started = true;
  $('wizard-overlay').classList.add('hidden');
  $('app-workspace').classList.remove('hidden');
  $('btn-wiz-close').classList.remove('hidden');

  CAD.init($('cad-canvas'), STATE, {
    onChange: () => {
      recalcAndRenderAll(true);
    },
    onSelect: () => {
      renderCadOptionsBar();
    }
  });

  if (window.Arch3D) {
    window.Arch3D.init($('viewport-3d'), STATE);
    window.Arch3D.setPhase(STATE.activePhase);
  }

  applyTranslations();
  recalcAndRenderAll(false);
}

// =========================================================================
// 2. LIVE CALCULATION & SYNCHRONIZED UI RENDERING
// =========================================================================

function recalcAll() {
  _cachedStats = Eng.computeFloorPlanStats(STATE.project, STATE.floorPlans);
  _cachedEng = Eng.computeStructuralEngineering(STATE.project, _cachedStats);
  _cachedThermal = Eng.computeThermalEnergy(STATE.project, _cachedStats);
  _cachedBOQ = Eng.computeBOQ(STATE.project, _cachedStats, _cachedEng, _cachedThermal, STATE.customPrices);
  _cachedGantt = Eng.computeGanttSchedule(STATE.project, _cachedBOQ);
}

function recalcAndRenderAll(rebuild3D) {
  recalcAll();
  renderHeaderAndKPIs();
  renderSidebarPhases();
  renderFloorTabs();
  renderCadOptionsBar();
  renderDeckContent();
  if (rebuild3D && window.Arch3D) window.Arch3D.rebuild();
}

function renderHeaderAndKPIs() {
  const p = STATE.project;
  const u = STATE.unitSystem;
  const T = Eng.getT(STATE.lang);
  const fndMeta = Eng.getFoundationMeta(p.foundationType);

  $('top-proj-summary').textContent =
    `${Eng.fmtLen(p.length, u, 1)} × ${Eng.fmtLen(p.width, u, 1)} · ${p.floors}F · ${STATE.lang === 'fr' ? fndMeta.fr : fndMeta.en}`;

  $('kpi-area').textContent = Eng.fmtArea(_cachedStats.totalArea, u);
  $('kpi-mat').textContent = Eng.fmtMoney(_cachedBOQ.matTotal);
  $('kpi-labor').textContent = Eng.fmtMoney(_cachedBOQ.laborTotal);
  $('kpi-total').textContent = Eng.fmtMoney(_cachedBOQ.grandTotal);
  $('kpi-duration').textContent = `${_cachedGantt.totalWeeks} ${T.weeks}`;

  const eBadge = $('kpi-energy-badge');
  eBadge.textContent = _cachedThermal.energyClass;
  eBadge.style.background = _cachedThermal.badgeColor;
  $('kpi-energy-kwh').textContent = `${_cachedThermal.energyIntensity} kWh/m²`;

  // Budget Tracker
  const pct = Math.min(100, Math.round((_cachedBOQ.grandTotal / Math.max(1, p.budget)) * 100));
  const over = _cachedBOQ.grandTotal > p.budget;
  $('budget-est').textContent = Eng.fmtMoney(_cachedBOQ.grandTotal);
  $('budget-target').textContent = `/ ${Eng.fmtMoney(p.budget)}`;
  const bar = $('budget-bar');
  bar.style.width = `${pct}%`;
  bar.classList.toggle('over', over);
  const bSt = $('budget-status');
  bSt.textContent = `${over ? T.overBudget : T.underBudget} (${Math.round((_cachedBOQ.grandTotal / Math.max(1, p.budget)) * 100)}%)`;
  bSt.classList.toggle('over', over);

  // Overall Progress Ring
  const doneCount = Object.values(STATE.completedSteps).filter(Boolean).length;
  const pctDone = Math.round((doneCount / 42) * 100);
  $('progress-pct').textContent = `${pctDone}%`;
  $('progress-sub').textContent = `${doneCount} / 42`;
  const circ = 163.36;
  $('progress-ring-fill').style.strokeDashoffset = (circ * (1 - pctDone / 100)).toFixed(2);

  // Active 2D floor quick stats
  const fp = STATE.floorPlans[STATE.activeFloor] || { walls: [], windows: [], doors: [] };
  const rooms = Eng.detectRooms(p.length, p.width, fp.walls, STATE.lang);
  $('cad-stats-badge').textContent =
    `${rooms.length} ${STATE.lang === 'fr' ? 'pièces' : 'rooms'} · ${fp.walls.length} ${STATE.lang === 'fr' ? 'cloisons' : 'walls'} · ${fp.windows.length}W / ${fp.doors.length}D`;
}

function renderSidebarPhases() {
  const isFr = STATE.lang === 'fr';
  const nav = $('phase-nav');
  if (!nav) return;
  nav.innerHTML = Eng.PHASES_META.map((pm, idx) => {
    const steps = Eng.STEPS_DB[idx];
    const done = steps.filter(s => STATE.completedSteps[s.id]).length;
    const isAll = done === steps.length;
    return `
      <button type="button" class="phase-item ${STATE.activePhase === idx ? 'active' : ''}" data-phase="${idx}">
        <div class="phase-item-l">
          <span>${pm.icon}</span>
          <span class="phase-item-name">${idx + 1}. ${isFr ? pm.fr : pm.en}</span>
        </div>
        <span class="phase-badge ${isAll ? 'done' : ''}">${done}/${steps.length}</span>
      </button>
    `;
  }).join('');

  nav.querySelectorAll('.phase-item').forEach(btn => {
    btn.addEventListener('click', () => selectPhase(parseInt(btn.dataset.phase, 10)));
  });

  // Update 3D HUD & Deck header phase titles
  const pm = Eng.PHASES_META[STATE.activePhase];
  const phLabel = isFr ? pm.fr : pm.en;
  $('hud-phase-pill').textContent = `${isFr ? 'Phase' : 'Phase'} ${STATE.activePhase + 1}/7 · ${phLabel}`;
  $('deck-phase-icon').textContent = pm.icon;
  $('deck-phase-title').textContent = `${STATE.activePhase + 1}. ${phLabel}`;
  $('deck-phase-sub').textContent = `${isFr ? 'Phase' : 'Phase'} ${STATE.activePhase + 1} / 7 · ${Eng.fmtMoney(_cachedBOQ.phases[STATE.activePhase].total)}`;
}

function selectPhase(idx) {
  STATE.activePhase = Math.max(0, Math.min(6, idx));
  if (window.Arch3D) {
    window.Arch3D.setPhase(STATE.activePhase);
    // Highlight MEP X-Ray button state cleanly when entering Phase 5
    const flags = window.Arch3D.getStateFlags();
    $('btn-mep-xray').classList.toggle('active', flags.mepXray || STATE.activePhase === 5);
  }
  renderSidebarPhases();
  renderDeckContent();
}

function renderFloorTabs() {
  const T = Eng.getT(STATE.lang);
  const el = $('floor-tabs');
  if (!el) return;
  let html = '';
  for (let f = 0; f < STATE.project.floors; f++) {
    const lbl = f === 0 ? T.groundFloor : `${T.floorLabel} ${f + 1}`;
    html += `<button type="button" class="floor-tab ${STATE.activeFloor === f ? 'active' : ''}" data-floor="${f}">${lbl}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.floor-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.activeFloor = parseInt(btn.dataset.floor, 10);
      CAD.clearSelection();
      CAD.render();
      renderFloorTabs();
      renderHeaderAndKPIs();
    });
  });
}

// =========================================================================
// 3. CONTEXTUAL 2D OPTIONS BAR & SELECTED ELEMENT INSPECTOR (EN/FR + IMPERIAL!)
// =========================================================================

function renderCadOptionsBar() {
  const bar = $('cad-options-bar');
  if (!bar) return;
  const T = Eng.getT(STATE.lang);
  const u = STATE.unitSystem;
  const sel = CAD.getSelected();
  const cfg = CAD.getToolCfg();

  // If an element is selected, show live bilingual Inspector!
  if (sel) {
    const el = CAD.getElementBySelection(sel);
    if (el) {
      let controls = `<strong style="color:var(--accent)">${T.propTitle}:</strong>`;
      if (sel.type === 'wall') {
        const len = Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
        controls += `<span>${T.propLen}: <b>${Eng.fmtLen(len, u)}</b></span>`;
        controls += `<label class="opt-field">${T.propThick} (${u === 'imperial' ? 'in' : 'cm'}):
          <input type="number" id="insp-thick" value="${u === 'imperial' ? Math.round((el.thickness || 0.15) * Eng.M_TO_IN) : Math.round((el.thickness || 0.15) * 100)}" min="5" max="45" />
        </label>`;
      } else if (sel.type === 'window') {
        controls += `<label class="opt-field">${T.propWidth} (${u === 'imperial' ? 'ft' : 'm'}):
          <input type="number" step="0.1" id="insp-w" value="${+Eng.fromMeters(el.width, u).toFixed(2)}" min="0.4" max="18" />
        </label>`;
        controls += `<label class="opt-field">${T.propHeight}:
          <input type="number" step="0.1" id="insp-h" value="${+Eng.fromMeters(el.height, u).toFixed(2)}" min="0.4" max="12" />
        </label>`;
        controls += `<label class="opt-field">${T.propSill}:
          <input type="number" step="0.1" id="insp-sill" value="${+Eng.fromMeters(el.sill, u).toFixed(2)}" min="0" max="8" />
        </label>`;
      } else if (sel.type === 'door') {
        controls += `<label class="opt-field">${T.propWidth} (${u === 'imperial' ? 'ft' : 'm'}):
          <input type="number" step="0.05" id="insp-w" value="${+Eng.fromMeters(el.width, u).toFixed(2)}" min="0.6" max="10" />
        </label>`;
        controls += `<label class="opt-field">${T.propSwing}:
          <select id="insp-swing">
            ${['in-left', 'in-right', 'out-left', 'out-right'].map(s => `<option value="${s}" ${el.swing === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </label>`;
      } else if (sel.type === 'column') {
        controls += `<label class="opt-field">${T.propSize} (${u === 'imperial' ? 'in' : 'cm'}):
          <input type="number" id="insp-size" value="${u === 'imperial' ? Math.round((el.size || 0.30) * Eng.M_TO_IN) : Math.round((el.size || 0.30) * 100)}" min="15" max="80" />
        </label>`;
      } else if (sel.type === 'stairs') {
        controls += `<label class="opt-field">${T.propDir}:
          <select id="insp-dir">
            ${['right', 'left', 'up', 'down'].map(d => `<option value="${d}" ${el.dir === d ? 'selected' : ''}>${d.toUpperCase()}</option>`).join('')}
          </select>
        </label>`;
        controls += `<label class="opt-field">${T.propStyle}:
          <select id="insp-style">
            <option value="straight" ${el.style !== 'u-shape' ? 'selected' : ''}>Straight</option>
            <option value="u-shape" ${el.style === 'u-shape' ? 'selected' : ''}>U-Shape</option>
          </select>
        </label>`;
        controls += `<label class="opt-field">${T.propSteps}:
          <input type="number" id="insp-steps" value="${el.steps || 16}" min="8" max="24" />
        </label>`;
      }
      controls += `<button type="button" id="btn-del-sel" class="btn btn-sm" style="margin-left:auto;border-color:var(--danger);color:#fca5a5">🗑 ${T.deleteEl}</button>`;
      bar.innerHTML = controls;

      const bindNum = (id, prop, isSmall) => {
        const inp = $(id);
        if (!inp) return;
        inp.addEventListener('change', () => {
          let v = parseFloat(inp.value);
          if (!Number.isFinite(v)) return;
          if (isSmall) v = u === 'imperial' ? v / Eng.M_TO_IN : v / 100;
          else v = Eng.toMeters(v, u);
          CAD.updateSelectedProp(prop, +Math.max(0.05, v).toFixed(3));
        });
      };
      bindNum('insp-thick', 'thickness', true);
      bindNum('insp-size', 'size', true);
      bindNum('insp-w', 'width', false);
      bindNum('insp-h', 'height', false);
      bindNum('insp-sill', 'sill', false);

      if ($('insp-swing')) $('insp-swing').addEventListener('change', e => CAD.updateSelectedProp('swing', e.target.value));
      if ($('insp-dir')) $('insp-dir').addEventListener('change', e => CAD.updateSelectedProp('dir', e.target.value));
      if ($('insp-style')) $('insp-style').addEventListener('change', e => CAD.updateSelectedProp('style', e.target.value));
      if ($('insp-steps')) $('insp-steps').addEventListener('change', e => CAD.updateSelectedProp('steps', Math.max(8, Math.min(24, parseInt(e.target.value, 10) || 16))));
      if ($('btn-del-sel')) $('btn-del-sel').addEventListener('click', () => CAD.deleteSelection());
      return;
    }
  }

  // Otherwise show active tool options + localized hint
  const tool = CAD.getTool();
  let extra = '';
  if (tool === 'stairs') {
    extra = `
      <label class="opt-field">${T.propDir}:
        <select id="cfg-st-dir">${['right', 'left', 'up', 'down'].map(d => `<option value="${d}" ${cfg.stairDir === d ? 'selected' : ''}>${d.toUpperCase()}</option>`).join('')}</select>
      </label>
      <label class="opt-field">${T.propStyle}:
        <select id="cfg-st-style">
          <option value="straight" ${cfg.stairStyle !== 'u-shape' ? 'selected' : ''}>Straight</option>
          <option value="u-shape" ${cfg.stairStyle === 'u-shape' ? 'selected' : ''}>U-Shape</option>
        </select>
      </label>`;
  } else if (tool === 'window') {
    extra = `<label class="opt-field">${T.propWidth} (${u === 'imperial' ? 'ft' : 'm'}):
      <input type="number" step="0.1" id="cfg-win-w" value="${+Eng.fromMeters(cfg.windowWidth, u).toFixed(2)}" />
    </label>`;
  } else if (tool === 'door') {
    extra = `<label class="opt-field">${T.propSwing}:
      <select id="cfg-dr-swing">${['in-left', 'in-right', 'out-left', 'out-right'].map(s => `<option value="${s}" ${cfg.doorSwing === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    </label>`;
  }

  bar.innerHTML = `${extra}<span>${T.hints[tool] || ''}</span>`;
  if ($('cfg-st-dir')) $('cfg-st-dir').addEventListener('change', e => { cfg.stairDir = e.target.value; });
  if ($('cfg-st-style')) $('cfg-st-style').addEventListener('change', e => { cfg.stairStyle = e.target.value; });
  if ($('cfg-win-w')) $('cfg-win-w').addEventListener('change', e => { cfg.windowWidth = Math.max(0.5, Eng.toMeters(e.target.value, u)); });
  if ($('cfg-dr-swing')) $('cfg-dr-swing').addEventListener('change', e => { cfg.doorSwing = e.target.value; });
}

// =========================================================================
// 4. DECK TABS: STEPS, 5-COL BOQ, STRUCTURAL/THERMAL, GANTT + CASH-FLOW
// =========================================================================

function renderDeckContent() {
  renderStepsTab();
  renderBOQTab();
  renderStructuralTab();
  renderGanttTab();
}

function renderStepsTab() {
  const grid = $('steps-grid');
  if (!grid) return;
  const T = Eng.getT(STATE.lang);
  const langKey = STATE.lang === 'fr' ? 'fr' : 'en';
  const steps = Eng.STEPS_DB[STATE.activePhase];

  grid.innerHTML = steps.map((st, idx) => {
    const loc = st[langKey];
    const done = !!STATE.completedSteps[st.id];
    return `
      <article class="step-card ${done ? 'completed' : ''}">
        <div class="step-top">
          <div>
            <div class="step-title">${STATE.activePhase + 1}.${idx + 1} ${loc.title}</div>
            <div class="step-meta">
              <span class="meta-pill">⏱ ~${st.durDays}d</span>
              <span class="meta-pill">📐 ${T.standard}: ${loc.std}</span>
            </div>
          </div>
          <button type="button" class="btn btn-sm ${done ? 'btn-primary' : 'btn-ghost'}" data-step-id="${st.id}">
            ${done ? T.stepCompleted : T.stepDone}
          </button>
        </div>
        <p class="step-desc">${loc.desc}</p>
        <div class="step-callout tip"><strong>💡 ${T.proTip}:</strong> ${loc.tip}</div>
        <div class="step-callout warn"><strong>⚠ ${T.warning}:</strong> ${loc.warn}</div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-step-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.stepId;
      STATE.completedSteps[id] = !STATE.completedSteps[id];
      renderHeaderAndKPIs();
      renderSidebarPhases();
      renderStepsTab();
    });
  });
}

function renderBOQTab() {
  const tbody = $('boq-tbody');
  const tfoot = $('boq-tfoot');
  if (!tbody || !tfoot) return;
  const T = Eng.getT(STATE.lang);
  const isFr = STATE.lang === 'fr';
  const isImp = STATE.unitSystem === 'imperial';

  const phasesToRender = STATE.boqScope === 'all'
    ? _cachedBOQ.phases
    : [_cachedBOQ.phases[STATE.activePhase]];

  let rowsHtml = '';
  let sumMat = 0, sumLabor = 0;

  phasesToRender.forEach(ph => {
    sumMat += ph.matTotal;
    sumLabor += ph.laborTotal;
    if (STATE.boqScope === 'all') {
      rowsHtml += `<tr class="phase-sep"><td colspan="5">${ph.icon} ${ph.idx + 1}. ${isFr ? ph.fr : ph.en}</td></tr>`;
    }
    ph.items.forEach(it => {
      const qty = isImp ? it.qtyImperial : it.qtyMetric;
      const unit = isImp ? it.unitImperial : it.unitMetric;
      const dispPrice = isImp ? it.unitPriceImperial : it.unitPriceMetric;
      rowsHtml += `
        <tr>
          <td>${isFr ? it.fr : it.en}</td>
          <td class="num">${qty}</td>
          <td class="num">${unit}</td>
          <td class="num"><input type="number" class="price-input" step="0.25" min="0" data-mat-id="${it.id}" data-conv="${it.conv}" value="${dispPrice}" /></td>
          <td class="num"><strong>${Eng.fmtMoney(it.total)}</strong></td>
        </tr>
      `;
    });
  });

  tbody.innerHTML = rowsHtml;
  tfoot.innerHTML = `
    <tr><td colspan="4">${T.phaseMatSub}</td><td class="num">${Eng.fmtMoney(sumMat)}</td></tr>
    <tr><td colspan="4">${T.phaseLaborSub}</td><td class="num">${Eng.fmtMoney(sumLabor)}</td></tr>
    <tr><td colspan="4" style="color:var(--accent)">${T.phaseTotalSub}</td><td class="num" style="color:var(--accent)">${Eng.fmtMoney(sumMat + sumLabor)}</td></tr>
  `;

  // Bind stable-ID unit price inputs (ZERO apostrophe injection bug & accurate in both Metric & Imperial!)
  tbody.querySelectorAll('.price-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const id = inp.dataset.matId;
      const conv = parseFloat(inp.dataset.conv) || 1;
      const v = Math.max(0, parseFloat(inp.value) || 0);
      STATE.customPrices[id] = isImp ? +(v * conv).toFixed(4) : v;
      recalcAndRenderAll(false);
    });
  });
}

function renderStructuralTab() {
  const el = $('structural-dashboard');
  if (!el) return;
  const T = Eng.getT(STATE.lang);
  const isFr = STATE.lang === 'fr';
  const u = STATE.unitSystem;
  const e = _cachedEng;
  const th = _cachedThermal;
  const reg = Eng.getRegionMeta(STATE.project.region);
  const fnd = Eng.getFoundationMeta(STATE.project.foundationType);

  const warnHtml = th.warnings.length
    ? th.warnings.map(w => `<div class="warn-item">⚠ ${isFr ? w.fr : w.en}</div>`).join('')
    : `<div class="ok-item">✓ ${isFr ? 'Configuration structurelle & thermique optimale pour cette zone climatique.' : 'Structural & thermal configuration is well-balanced for this climate zone.'}</div>`;

  el.innerHTML = `
    <div class="eng-card">
      <h3>🏗️ ${T.structTitle}</h3>
      <div class="stat-rows">
        <div class="stat-row"><span>${isFr ? 'Système de Fondations' : 'Foundation System'}</span><strong>${isFr ? fnd.fr : fnd.en}</strong></div>
        <div class="stat-row"><span>${isFr ? 'Profondeur Hors-Gel / Fouille' : 'Frost / Excavation Depth'}</span><strong>${Eng.fmtLen(e.frostDepthM, u)}</strong></div>
        ${e.pileCount > 0 ? `<div class="stat-row"><span>${isFr ? 'Pieux Forés Calculés' : 'Engineered Drilled Piles'}</span><strong>${e.pileCount} pcs</strong></div>` : ''}
        <div class="stat-row"><span>${isFr ? 'Terrassement Total' : 'Total Excavation Volume'}</span><strong>${Eng.fmtVol(e.excavationM3, u)}</strong></div>
        <div class="stat-row"><span>${isFr ? 'Béton Fondations / Superstructure' : 'Concrete (Foundation / Frame)'}</span><strong>${Eng.fmtVol(e.fndConcreteM3, u)} / ${Eng.fmtVol(e.structConcreteM3, u)}</strong></div>
        <div class="stat-row"><span>${isFr ? 'Masse Totale Béton' : 'Total Concrete Volume & Mass'}</span><strong>${Eng.fmtVol(e.totalConcreteM3, u)} (${e.totalConcreteTons} t)</strong></div>
        <div class="stat-row"><span>${isFr ? 'Poteaux Porteurs / Surface Toiture' : 'Structural Columns / Roof Area'}</span><strong>${e.totalStructCols} cols · ${Eng.fmtArea(e.roofAreaM2, u)}</strong></div>
        <div class="stat-row"><span>${isFr ? 'Charge de Neige Normée' : 'Design Snow Load'}</span><strong>${e.snowLoadKpa} kPa (${e.snowTotalKn} kN total)</strong></div>
      </div>
      <div class="rebar-bars">
        <div class="rebar-chip"><span>${isFr ? 'Barres HA ∅16' : 'Main Rebar ∅16'}</span><strong>${Eng.fmtMass(e.rebar16Kg, u)}</strong></div>
        <div class="rebar-chip"><span>${isFr ? 'Barres HA ∅12' : 'Sec. Rebar ∅12'}</span><strong>${Eng.fmtMass(e.rebar12Kg, u)}</strong></div>
        <div class="rebar-chip"><span>${isFr ? 'Cadres / Étriers ∅8' : 'Stirrups ∅8'}</span><strong>${Eng.fmtMass(e.rebar08Kg, u)}</strong></div>
      </div>
    </div>

    <div class="eng-card">
      <h3>🌡️ ${T.thermalTitle}</h3>
      <div class="stat-rows">
        <div class="stat-row"><span>${isFr ? 'Classe Énergétique Estimée' : 'Estimated Energy Class'}</span><strong><span class="energy-pill" style="background:${th.badgeColor}">${th.energyClass}</span> ${th.energyIntensity} kWh/m²·yr</strong></div>
        <div class="stat-row"><span>${isFr ? 'Mur Extérieur (ITE)' : 'Exterior Wall U-Value'}</span><strong>${th.uWall} W/m²K (${th.wallInsMm} mm)</strong></div>
        <div class="stat-row"><span>${isFr ? 'Toiture Isolée' : 'Roof Envelope U-Value'}</span><strong>${th.uRoof} W/m²K (${th.roofInsMm} mm)</strong></div>
        <div class="stat-row"><span>${isFr ? 'Menuiseries Vitrées' : 'Glazing U-Value'}</span><strong>${th.uWin} W/m²K (${_cachedStats.extWindowCount} pcs)</strong></div>
        <div class="stat-row"><span>${isFr ? 'Ratio Vitrage / Façade (WWR)' : 'Window-to-Wall Ratio (WWR)'}</span><strong>${th.wwrPct}% (${Eng.fmtArea(_cachedStats.extWindowArea, u)})</strong></div>
        <div class="stat-row"><span>${isFr ? 'Note Climatique' : 'Climate Engineering Note'}</span><strong style="max-width:58%;text-align:right">${isFr ? reg.noteFr : reg.noteEn}</strong></div>
      </div>
      <div class="warn-list">${warnHtml}</div>
    </div>
  `;
}

function renderGanttTab() {
  const el = $('gantt-container');
  if (!el) return;
  const T = Eng.getT(STATE.lang);
  const isFr = STATE.lang === 'fr';
  const g = _cachedGantt;
  const maxW = Math.max(1, g.totalWeeks);

  const rowsHtml = g.tasks.map(t => {
    const leftPct = (t.startWeek / maxW) * 100;
    const widthPct = Math.max(5, (t.durationWeeks / maxW) * 100);
    return `
      <div class="gantt-row">
        <div class="gantt-lbl">${t.icon} ${t.phaseIdx + 1}. ${isFr ? t.fr : t.en}</div>
        <div class="gantt-track">
          <div class="gantt-bar" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;background:${t.color}">
            W${Math.floor(t.startWeek) + 1}–W${Math.ceil(t.endWeek)} (${t.durationWeeks}w)
          </div>
        </div>
        <div class="gantt-cost">${Eng.fmtMoney(t.cost)}</div>
      </div>
    `;
  }).join('');

  // Build SVG Cumulative Cash-Flow Curve vs Target Budget line
  const cf = g.weeklyCashFlow;
  const maxMoney = Math.max(STATE.project.budget * 1.08, _cachedBOQ.grandTotal * 1.08, 10000);
  const svgW = 640, svgH = 140, padL = 56, padR = 14, padT = 14, padB = 22;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const mx = w => padL + ((w - 1) / Math.max(1, cf.length - 1)) * plotW;
  const my = v => padT + plotH - (v / maxMoney) * plotH;

  const pts = cf.map(c => `${mx(c.week).toFixed(1)},${my(c.cumulative).toFixed(1)}`).join(' ');
  const areaPts = `${padL},${padT + plotH} ${pts} ${(padL + plotW).toFixed(1)},${padT + plotH}`;
  const budgetY = my(STATE.project.budget).toFixed(1);

  el.innerHTML = `
    <div class="gantt-summary">
      <h3 style="color:var(--accent);font-size:13.5px">📅 ${T.ganttTitle}</h3>
      <span class="meta-pill" style="color:#38bdf8;border-color:#38bdf8">⏱ ${g.totalWeeks} ${T.weeks} (~${g.totalMonths} ${isFr ? 'mois' : 'months'}) · ${Eng.fmtMoney(_cachedBOQ.grandTotal)}</span>
    </div>
    <div class="gantt-rows">${rowsHtml}</div>
    <div class="cashflow-box">
      <div class="muted-xs" style="margin-bottom:4px">${isFr ? 'Courbe de Trésorerie Cumulée vs Budget Cible (ligne pointillée)' : 'Cumulative Cash-Flow Curve vs Target Budget (dashed line)'}</div>
      <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
        <polygon points="${areaPts}" fill="rgba(245,158,11,0.16)" />
        <polyline points="${pts}" fill="none" stroke="#f59e0b" stroke-width="2.4" />
        <line x1="${padL}" y1="${budgetY}" x2="${svgW - padR}" y2="${budgetY}" stroke="#10b981" stroke-width="1.4" stroke-dasharray="5 4" />
        <text x="${padL + 4}" y="${Math.max(12, Number(budgetY) - 4)}" fill="#10b981" font-size="10" font-weight="700">${isFr ? 'Budget' : 'Budget'}: ${Eng.fmtMoney(STATE.project.budget)}</text>
        <text x="${padL - 5}" y="${padT + 6}" fill="#94a3b8" font-size="9" text-anchor="end">${Eng.fmtMoney(maxMoney)}</text>
        <text x="${padL - 5}" y="${padT + plotH}" fill="#94a3b8" font-size="9" text-anchor="end">$0</text>
        <text x="${padL}" y="${svgH - 5}" fill="#94a3b8" font-size="9">W1</text>
        <text x="${svgW - padR}" y="${svgH - 5}" fill="#94a3b8" font-size="9" text-anchor="end">W${g.totalWeeks}</text>
      </svg>
    </div>
  `;
}

// =========================================================================
// 5. FULL BILINGUAL TRANSLATION & UNIT SWITCHING
// =========================================================================

function applyTranslations() {
  const T = Eng.getT(STATE.lang);
  document.documentElement.lang = STATE.lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = key.includes('.')
      ? key.split('.').reduce((acc, k) => acc && acc[k], T)
      : T[key];
    if (typeof val === 'string') el.textContent = val;
  });

  document.querySelectorAll('[data-tool-lbl]').forEach(el => {
    const k = el.dataset.toolLbl;
    if (T.tools[k]) el.textContent = T.tools[k];
  });

  if ($('wiz-title')) $('wiz-title').textContent = T.wizTitle;
  if ($('wiz-sub')) $('wiz-sub').textContent = T.wizSub;

  // Sync segmented active buttons
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === STATE.lang));
  document.querySelectorAll('[data-unit]').forEach(b => b.classList.toggle('active', b.dataset.unit === STATE.unitSystem));

  populateWizardSelects();
  if (STATE.started) {
    recalcAndRenderAll(false);
    CAD.render();
  }
}

function setLanguage(lang) {
  STATE.lang = lang === 'fr' ? 'fr' : 'en';
  applyTranslations();
}

function setUnitSystem(unit) {
  STATE.unitSystem = unit === 'imperial' ? 'imperial' : 'metric';
  document.querySelectorAll('[data-unit]').forEach(b => b.classList.toggle('active', b.dataset.unit === STATE.unitSystem));
  syncWizardInputsFromProject();
  if (STATE.started) {
    recalcAndRenderAll(false);
    CAD.render();
  }
}

// =========================================================================
// 6. HOST INTEGRATION (QUOTA GATE, CLOSE_STUDIO, REMIX, TIER)
// =========================================================================

function requestExport(kind, fn) {
  const inIframe = window.parent && window.parent !== window;
  if (!inIframe) {
    Promise.resolve(fn()).catch(err => showToast('Export error: ' + err.message));
    return;
  }
  _pendingExport = { kind, fn };
  window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', studio: 'architect-pro-2', format: kind }, '*');

  // Graceful fallback if host doesn't answer within 650ms (e.g. direct preview/iframe test)
  setTimeout(() => {
    if (_pendingExport && _pendingExport.fn === fn) {
      const cb = _pendingExport.fn;
      _pendingExport = null;
      Promise.resolve(cb()).catch(err => showToast('Export error: ' + err.message));
    }
  }, 650);
}

window.addEventListener('message', ev => {
    if (ev.origin !== window.location.origin) return;
  const d = ev.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'SET_LANG' && d.lang) setLanguage(d.lang);
  if (d.type === 'USER_TIER_STATUS' && d.tier) STATE.userTier = d.tier;
  if (d.type === 'EXPORT_ALLOWED' && _pendingExport) {
    const cb = _pendingExport.fn;
    _pendingExport = null;
    Promise.resolve(cb()).catch(err => showToast('Export error: ' + err.message));
  }
  if (d.type === 'SHOW_PAYWALL_MODAL' || d.type === 'EXPORT_BLOCKED') {
    _pendingExport = null;
  }
});

// Host Remix & State Contracts
window.getAppState = () => ({
  format: 'studios-pro-arch2-v3',
  project: STATE.project,
  unitSystem: STATE.unitSystem,
  lang: STATE.lang,
  colors: STATE.colors,
  floorPlans: STATE.floorPlans,
  completedSteps: STATE.completedSteps,
  customPrices: STATE.customPrices
});

window.getAppTags = () => [
  'architect-pro-2',
  'structural-engineering',
  STATE.project.foundationType,
  STATE.project.roofType,
  `${STATE.project.floors}-floors`
];

function closeStudioToHost() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
  } else {
    window.history.back();
  }
}

// =========================================================================
// 7. EVENT WIRING & INITIALIZATION
// =========================================================================

function bindEvents() {
  // Back buttons
  $('btn-back-studios').addEventListener('click', closeStudioToHost);
  $('btn-wiz-back-studio').addEventListener('click', closeStudioToHost);

  // Wizard: House Type automatically syncs Floors! (FIXED dead #inp-type bug!)
  $('inp-type').addEventListener('change', () => {
    const ht = Eng.HOUSE_TYPES.find(x => x.id === $('inp-type').value);
    if (ht) $('inp-floors').value = ht.floors;
  });

  $('btn-start-app').addEventListener('click', () => {
    const prevDims = `${STATE.project.length}x${STATE.project.width}x${STATE.project.floors}x${STATE.project.layoutPreset}`;
    readWizardIntoProject();
    const newDims = `${STATE.project.length}x${STATE.project.width}x${STATE.project.floors}x${STATE.project.layoutPreset}`;
    launchWorkspace(!STATE.started || prevDims !== newDims);
  });

  $('btn-open-wizard').addEventListener('click', () => {
    syncWizardInputsFromProject();
    $('wizard-overlay').classList.remove('hidden');
  });
  $('btn-wiz-close').addEventListener('click', () => {
    $('wizard-overlay').classList.add('hidden');
  });

  // Language & Unit Segmented Toggles (both Wizard and Topbar)
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
  document.querySelectorAll('[data-unit]').forEach(btn => {
    btn.addEventListener('click', () => setUnitSystem(btn.dataset.unit));
  });

  // 2D CAD Tools
  $('cad-tool-group').querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('cad-tool-group').querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CAD.setTool(btn.dataset.tool);
      renderCadOptionsBar();
    });
  });

  $('sel-quick-layout').addEventListener('change', e => {
    const preset = e.target.value;
    if (!preset) return;
    CAD.pushUndo();
    STATE.floorPlans[STATE.activeFloor] = Eng.generatePartitionLayout(
      STATE.project.length, STATE.project.width, preset, STATE.activeFloor, STATE.project.floors
    );
    CAD.clearSelection();
    CAD.render();
    recalcAndRenderAll(true);
    e.target.value = '';
    showToast(STATE.lang === 'fr' ? 'Plan 2D généré & métré recalculé !' : '2D Layout applied & BOQ synced!');
  });

  $('btn-cad-undo').addEventListener('click', () => CAD.undo());
  $('btn-cad-redo').addEventListener('click', () => CAD.redo());
  $('btn-cad-grid').addEventListener('click', () => {
    const next = !CAD.getGrid();
    CAD.setGrid(next);
    $('btn-cad-grid').classList.toggle('active', next);
  });
  $('btn-cad-fit').addEventListener('click', () => CAD.resetView());

  // 3D Simulator Controls
  $('btn-timelapse').addEventListener('click', () => {
    if (!window.Arch3D) return;
    const T = Eng.getT(STATE.lang);
    if (window.Arch3D.isTimelapsePlaying()) {
      window.Arch3D.stopTimelapse();
      $('btn-timelapse').innerHTML = `▶ <span>${T.timelapse}</span>`;
      $('btn-timelapse').classList.remove('active');
    } else {
      $('btn-timelapse').innerHTML = `⏹ <span>${T.stopTimelapse}</span>`;
      $('btn-timelapse').classList.add('active');
      window.Arch3D.startTimelapse(
        phase => {
          STATE.activePhase = phase;
          renderSidebarPhases();
          renderDeckContent();
        },
        () => {
          $('btn-timelapse').innerHTML = `▶ <span>${T.timelapse}</span>`;
          $('btn-timelapse').classList.remove('active');
        }
      );
    }
  });

  $('btn-mep-xray').addEventListener('click', () => {
    if (!window.Arch3D) return;
    const next = !window.Arch3D.getStateFlags().mepXray;
    window.Arch3D.setMepXray(next);
    $('btn-mep-xray').classList.toggle('active', next || STATE.activePhase === 5);
  });

  $('btn-cutaway').addEventListener('click', () => {
    if (!window.Arch3D) return;
    const next = !window.Arch3D.getStateFlags().cutaway;
    window.Arch3D.setCutaway(next);
    $('btn-cutaway').classList.toggle('active', next);
  });

  $('btn-wireframe').addEventListener('click', () => {
    if (!window.Arch3D) return;
    const next = !window.Arch3D.getStateFlags().wireframe;
    window.Arch3D.setWireframe(next);
    $('btn-wireframe').classList.toggle('active', next);
  });

  document.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => window.Arch3D && window.Arch3D.setCameraPreset(btn.dataset.cam));
  });

  $('inp-sun-hour').addEventListener('input', e => {
    const h = parseFloat(e.target.value);
    const hrs = Math.floor(h);
    const mins = (h % 1) >= 0.5 ? '30' : '00';
    $('sun-time-lbl').textContent = `${String(hrs).padStart(2, '0')}:${mins}`;
    if (window.Arch3D) window.Arch3D.setSunHour(h);
  });

  // Color Customizers
  ['extWalls', 'roof', 'winDoors', 'intWalls', 'floor', 'ground'].forEach(k => {
    const inp = $('col-' + k);
    if (!inp) return;
    inp.addEventListener('input', () => {
      STATE.colors[k] = inp.value;
      CAD.render();
      if (window.Arch3D) window.Arch3D.rebuild();
    });
  });

  // Phase Prev/Next & Deck Tabs
  $('btn-prev-phase').addEventListener('click', () => selectPhase(STATE.activePhase - 1));
  $('btn-next-phase').addEventListener('click', () => selectPhase(STATE.activePhase + 1));

  $('deck-tabs').querySelectorAll('.deck-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.activeDeckTab = btn.dataset.tab;
      $('deck-tabs').querySelectorAll('.deck-tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.deck-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + STATE.activeDeckTab));
    });
  });

  $('boq-scope-group').querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.boqScope = btn.dataset.scope;
      $('boq-scope-group').querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderBOQTab();
    });
  });

  $('btn-reset-prices').addEventListener('click', () => {
    STATE.customPrices = {};
    recalcAndRenderAll(false);
    showToast(STATE.lang === 'fr' ? 'Prix unitaires réinitialisés.' : 'Unit prices reset to defaults.');
  });

  $('btn-quick-csv').addEventListener('click', () => {
    requestExport('csv', () => {
      window.ArchExports.exportBOQCSV(STATE, _cachedBOQ);
      showToast('BOQ Excel (.CSV) exported!');
    });
  });

  // Save / Load Project (.sparch2 — FREE!)
  $('btn-save-proj').addEventListener('click', () => {
    window.ArchExports.saveProjectFile(STATE);
    showToast(STATE.lang === 'fr' ? 'Projet sauvegardé (.sparch2)' : 'Project saved (.sparch2)');
  });
  $('btn-load-proj').addEventListener('click', () => $('inp-load-file').click());
  $('inp-load-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        restoreStateFromPayload(data);
        showToast(STATE.lang === 'fr' ? 'Projet chargé avec succès !' : 'Project loaded successfully!');
      } catch (err) {
        showToast('Invalid project file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Export & AR Modals
  $('btn-open-export').addEventListener('click', () => $('modal-export').classList.remove('hidden'));
  $('btn-open-ar').addEventListener('click', () => $('modal-ar').classList.remove('hidden'));
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => $(btn.dataset.close).classList.add('hidden'));
  });
  document.querySelectorAll('.modal-backdrop').forEach(bg => {
    bg.addEventListener('click', e => { if (e.target === bg) bg.classList.add('hidden'); });
  });

  // Export cards handler
  document.querySelectorAll('[data-exp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.exp;
      $('modal-export').classList.add('hidden');
      const E = window.ArchExports;
      if (kind === 'sparch2') { E.saveProjectFile(STATE); showToast('Project saved (.sparch2)'); return; }
      if (kind === 'png') { E.exportPNG(STATE.project); showToast('3D Render (.PNG) saved'); return; }
      if (kind === 'print') { window.print(); return; }
      if (kind === 'ar') { $('modal-ar').classList.remove('hidden'); return; }

      requestExport(kind, async () => {
        if (kind === 'pdf') { E.exportPDFDossier(STATE, _cachedStats, _cachedEng, _cachedThermal, _cachedBOQ, _cachedGantt); showToast('Engineering PDF Dossier exported!'); }
        else if (kind === 'csv') { E.exportBOQCSV(STATE, _cachedBOQ); showToast('BOQ Excel (.CSV) exported!'); }
        else if (kind === 'dxf') { E.exportDXF2D(STATE); showToast('AutoCAD 2D (.DXF) exported!'); }
        else if (kind === 'svg') { E.exportSVG2D(STATE); showToast('Blueprint (.SVG) exported!'); }
        else if (kind === 'glb') { await E.exportGLB(STATE.project); showToast('Clean 3D (.GLB) exported!'); }
        else if (kind === 'stl') { E.exportSTL(STATE.project); showToast('3D Print Maquette (.STL 1:100) exported!'); }
        else if (kind === 'obj') { E.exportOBJ(STATE.project); showToast('3D (.OBJ) exported!'); }
        else if (kind === 'html') { await E.exportStandaloneHTML(STATE.project); showToast('Interactive 3D (.HTML) exported!'); }
      });
    });
  });

  // AR Scale Choices (FREE!)
  $('btn-ar-tabletop').addEventListener('click', async () => {
    $('modal-ar').classList.add('hidden');
    try { await window.ArchExports.openARViewer('tabletop', STATE.project); }
    catch (err) { showToast('AR error: ' + err.message); }
  });
  $('btn-ar-real').addEventListener('click', async () => {
    $('modal-ar').classList.add('hidden');
    try { await window.ArchExports.openARViewer('real', STATE.project); }
    catch (err) { showToast('AR error: ' + err.message); }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (!STATE.started) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); CAD.undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); CAD.redo(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { CAD.deleteSelection(); }
    else if (e.key === 'Escape') {
      $('modal-export').classList.add('hidden');
      $('modal-ar').classList.add('hidden');
      CAD.setTool('select');
      $('cad-tool-group').querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === 'select'));
      renderCadOptionsBar();
    }
  });
}

function restoreStateFromPayload(data) {
  if (!data || !data.project) return;
  Object.assign(STATE.project, data.project);
  if (data.unitSystem) STATE.unitSystem = data.unitSystem;
  if (data.lang) STATE.lang = data.lang;
  if (data.colors) {
    Object.assign(STATE.colors, data.colors);
    Object.keys(STATE.colors).forEach(k => { if ($('col-' + k)) $('col-' + k).value = STATE.colors[k]; });
  }
  if (Array.isArray(data.floorPlans) && data.floorPlans.length) STATE.floorPlans = data.floorPlans;
  if (data.completedSteps) STATE.completedSteps = data.completedSteps;
  if (data.customPrices) STATE.customPrices = data.customPrices;
  launchWorkspace(false);
}

// =========================================================================
// BOOTSTRAP
// =========================================================================

function boot() {
  populateWizardSelects();
  bindEvents();

  // Check URL lang or Studios-Pro remix state
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'fr') setLanguage('fr');
  try {
    const remixRaw = sessionStorage.getItem('sp_remix_state') || localStorage.getItem('sp_remix_state');
    if (remixRaw) {
      const parsed = JSON.parse(remixRaw);
      if (parsed && parsed.format === 'studios-pro-arch2-v3') {
        restoreStateFromPayload(parsed);
      }
    }
  } catch (_) {}
}

boot();
