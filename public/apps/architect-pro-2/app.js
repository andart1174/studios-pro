// ArchitectPro v2 — Main Application
"use strict";

let lang = 'en', unitSystem = 'metric', currentPhase = 0, project = {};
let completedSteps = {}, colors = { ...DEFAULT_COLORS };
let totalMatCost = 0, totalLabCost = 0;

/* ── UNITS ───────────────────────────────────────── */
function setUnitSystem(sys) {
    unitSystem = sys;
    localStorage.setItem('architectpro-units', sys);
    document.querySelectorAll('[id^="wiz-unit-"], [id^="app-unit-"]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[id$="-unit-${sys}"]`).forEach(b => b.classList.add('active'));

    // Update labels and display if app is running
    if (document.getElementById('app-screen').classList.contains('visible')) {
        updateOverview();
        if (typeof drawEditor === 'function') drawEditor();
    } else {
        updateWizardLang();
    }
}

function fmtLen(meters, hideUnit = false) {
    if (unitSystem === 'imperial') {
        const totalInches = Math.round(meters * 39.3701);
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        if (hideUnit) return `${feet}'${inches}"`;
        return `${feet}' ${inches}"`;
    }
    // Metric
    if (hideUnit) return meters.toFixed(2);
    return meters >= 1 ? `${meters.toFixed(2)}m` : `${(meters * 100).toFixed(0)}cm`;
}

function parseLen(valStr) {
    // Try to parse out feet and inches, e.g. "5'3"" or "5.5"
    if (unitSystem === 'imperial') {
        let ft = 0, inc = 0;
        const ftMatch = valStr.match(/(\d+)'/);
        const inMatch = valStr.match(/(\d+)"/);
        if (ftMatch) ft = parseInt(ftMatch[1]);
        if (inMatch) inc = parseInt(inMatch[1]);
        if (!ftMatch && !inMatch && !isNaN(parseFloat(valStr))) {
            ft = parseFloat(valStr); // fallback pure numbers to feet if imperial
        }
        return (ft + inc / 12) / 3.28084;
    }
    return parseFloat(valStr);
}

/* ── LANGUAGE ────────────────────────────────────── */
function setLang(l) {
    lang = l; localStorage.setItem('architectpro-lang', l);
    document.querySelectorAll('.lang-btn:not([id*="unit"])').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[id$="-lang-${l}"]`).forEach(b => b.classList.add('active'));
    if (document.getElementById('wizard-screen').style.display !== 'none') { updateWizardLang(); }
    if (document.getElementById('app-screen').classList.contains('visible')) { applyI18n(); renderPhase(currentPhase); }
}

function applyI18n() {
    const T = LANG[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (T[k]) el.textContent = T[k];
    });
}

function updateWizardLang() {
    const T = LANG[lang], W = T.wizard;
    document.getElementById('wiz-title').textContent = T.appName;
    document.getElementById('wiz-subtitle').textContent = T.appTagline;
    document.getElementById('wiz-btn-text').textContent = W.start;

    const uStr = unitSystem === 'imperial' ? ' (ft)' : ' (m)';
    const wLen = W.length.replace(' (m)', uStr);
    const wWid = W.width.replace(' (m)', uStr);
    const wFh = W.floorHeight.replace(' (m)', uStr);

    const ids = [['wiz-label-type', W.houseType], ['wiz-label-length', wLen], ['wiz-label-width', wWid],
    ['wiz-label-fh', wFh], ['wiz-label-floors', W.floors], ['wiz-label-foundation', W.foundation],
    ['wiz-label-roof', W.roofType], ['wiz-label-budget', W.budget], ['wiz-label-region', W.region]];
    ids.forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.textContent = v; });
    [['inp-type', W.types], ['inp-foundation', W.foundations], ['inp-roof', W.roofs], ['inp-region', W.regions]]
        .forEach(([sel, opts]) => { const el = document.getElementById(sel); if (el) Array.from(el.options).forEach((o, i) => { if (opts[i]) o.textContent = opts[i]; }); });
}

/* ── CALC PARAMS ─────────────────────────────────── */
function calcParams(l, w, floors, fH, ft, rt) {
    const footprint = l * w, perimeter = 2 * (l + w);
    const wallArea = perimeter * fH * floors;
    const roofPitch = rt === 0 ? 1 : rt === 1 ? 1.15 : 1.25;
    return {
        length: l, width: w, floors, floorHeight: fH, footprint, perimeter, wallArea,
        extWallArea: wallArea * 1.1, roofArea: footprint * roofPitch, openings: Math.round(footprint / 12),
        roofType: rt, foundationType: ft
    };
}

/* ── START APP ───────────────────────────────────── */
function startApp() {
    const l = parseFloat(document.getElementById('inp-length').value) || 10;
    const w = parseFloat(document.getElementById('inp-width').value) || 8;
    const floors = parseInt(document.getElementById('inp-floors').value) || 1;
    const fH = parseFloat(document.getElementById('inp-floor-height').value) || 2.8;
    const ft = parseInt(document.getElementById('inp-foundation').value);
    const rt = parseInt(document.getElementById('inp-roof').value);
    const budget = parseFloat(document.getElementById('inp-budget').value) || 200000;
    const region = parseInt(document.getElementById('inp-region').value);
    project = { ...calcParams(l, w, floors, fH, ft, rt), budget, region, customPrices: {} };
    completedSteps = {}; currentPhase = 0;

    computeTotalCosts();
    document.getElementById('wizard-screen').style.display = 'none';
    document.getElementById('app-screen').classList.add('visible');
    applyI18n(); buildColorGrid(); renderPhaseList(); renderPhase(0); updateBudget(); updateProgress(); updateOverview();

    const dimStr = unitSystem === 'imperial' ? `${fmtLen(l, true)} × ${fmtLen(w, true)}` : `${l}m × ${w}m`;
    document.getElementById('hdr-dims').textContent = `${dimStr} • ${floors} floor${floors > 1 ? 's' : ''}`;

    // Init editor + 3D after layout
    setTimeout(() => {
        resizeEditorCanvas();
        initEditor();
        init3D();
    }, 120);
}

function resetApp() {
    document.getElementById('wizard-screen').style.display = '';
    document.getElementById('app-screen').classList.remove('visible');
    completedSteps = {};
    if (window._three3DRenderer) { window._three3DRenderer.dispose(); window._three3DRenderer = null; _renderer = null; }
}

/* ── COSTS ───────────────────────────────────────── */
function computeTotalCosts() {
    const rm = REGION_MULTIPLIER[project.region] || 1;
    totalMatCost = 0; totalLabCost = 0;
    PHASES_DATA[lang].forEach(ph => {
        const mt = ph.materials(project).reduce((s, m) => {
            const price = (project.customPrices && project.customPrices[m.name] !== undefined) ? project.customPrices[m.name] : m.unitPrice;
            return s + m.qty * price;
        }, 0);
        totalMatCost += mt; totalLabCost += mt * ph.laborPercent * rm;
    });
}

function getPhaseCost(idx) {
    const ph = PHASES_DATA[lang][idx]; const rm = REGION_MULTIPLIER[project.region] || 1;
    const mt = ph.materials(project).reduce((s, m) => {
        const price = (project.customPrices && project.customPrices[m.name] !== undefined) ? project.customPrices[m.name] : m.unitPrice;
        return s + m.qty * price;
    }, 0);
    const lt = mt * ph.laborPercent * rm; return { matTotal: mt, labTotal: lt, total: mt + lt };
}

/* ── OVERVIEW ────────────────────────────────────── */
function updateOverview() {
    const tot = totalMatCost + totalLabCost;
    let areaStr = project.footprint.toFixed(0) + ' m²';
    if (unitSystem === 'imperial') {
        areaStr = (project.footprint * 10.764).toFixed(0) + ' sq ft';
    }
    document.getElementById('ov-area').textContent = areaStr;
    document.getElementById('ov-mat-cost').textContent = fmtDollar(totalMatCost);
    document.getElementById('ov-lab-cost').textContent = fmtDollar(totalLabCost);
    document.getElementById('ov-total').textContent = fmtDollar(tot);
    document.getElementById('ov-total').className = 'ov-val ' + (tot > project.budget ? 'red' : 'green');
}

/* ── BUDGET ──────────────────────────────────────── */
function updateBudget() {
    const tot = totalMatCost + totalLabCost;
    const pct = Math.min((tot / project.budget) * 100, 150);
    document.getElementById('budget-spent-val').textContent = fmtDollar(tot);
    document.getElementById('budget-total-val').textContent = fmtDollar(project.budget);
    document.getElementById('budget-fill').style.width = Math.min(pct, 100) + '%';
    document.getElementById('budget-fill').classList.toggle('over', pct > 100);
    document.getElementById('budget-pct-text').textContent = pct.toFixed(0) + '%';
    document.getElementById('budget-over').style.display = pct > 100 ? 'block' : 'none';
}

/* ── PROGRESS ────────────────────────────────────── */
function updateProgress() {
    const phs = PHASES_DATA[lang];
    const tot = phs.reduce((s, p) => s + p.steps.length, 0);
    const done = Object.values(completedSteps).filter(Boolean).length;
    const pct = tot > 0 ? (done / tot) * 100 : 0;
    const circ = 2 * Math.PI * 28;
    document.getElementById('progress-arc').style.strokeDashoffset = circ - (pct / 100) * circ;
    document.getElementById('progress-pct').textContent = Math.round(pct) + '%';
    renderPhaseList();
}

/* ── PHASE LIST ──────────────────────────────────── */
function renderPhaseList() {
    const T = LANG[lang], phs = PHASES_DATA[lang];
    const list = document.getElementById('phase-list'); list.innerHTML = '';
    phs.forEach((ph, i) => {
        const tot = ph.steps.length, done = ph.steps.filter((_, si) => completedSteps[`${i}-${si}`]).length;
        const st = done === tot ? 'done' : done > 0 ? 'partial' : 'todo';
        const lbl = done === tot ? '✓' : done > 0 ? done : '○';
        const item = document.createElement('div');
        item.className = 'phase-item' + (i === currentPhase ? ' active' : '');
        item.innerHTML = `<div class="phase-icon">${T.phaseIcons[i]}</div><div class="phase-name">${T.phaseNames[i]}</div><div class="phase-status ${st}">${lbl}</div>`;
        item.onclick = () => { currentPhase = i; renderPhase(i); renderPhaseList(); update3DPhase(i); };
        list.appendChild(item);
    });
}

/* ── PHASE RENDER ────────────────────────────────── */
function renderPhase(idx) {
    const T = LANG[lang], phs = PHASES_DATA[lang], ph = phs[idx]; if (!ph) return;
    document.getElementById('ph-icon').textContent = T.phaseIcons[idx];
    document.getElementById('ph-name').textContent = T.phaseNames[idx];
    document.getElementById('ph-sub').textContent = (lang === 'fr' ? `Phase ${idx + 1} sur 7` : `Phase ${idx + 1} of 7`);
    document.getElementById('steps-phase-name').textContent = T.phaseNames[idx];

    const grid = document.getElementById('steps-grid'); grid.innerHTML = '';
    ph.steps.forEach((step, si) => {
        const key = `${idx}-${si}`, done = !!completedSteps[key];
        const card = document.createElement('div');
        card.className = 'step-card fade-in' + (done ? ' completed' : '');
        card.id = `step-${idx}-${si}`;
        card.innerHTML = `<div class="step-header" onclick="toggleStep(${idx},${si})">
      <div class="step-number">${done ? '✓' : si + 1}</div>
      <div class="step-title">${step.title}</div>
      <div class="step-toggle">▼</div></div>
      <div class="step-body">
      <p class="step-desc">${step.desc}</p>
      ${step.tip ? `<div class="step-callout tip"><strong>${T.proTip}</strong>${step.tip}</div>` : ''}
      ${step.warning ? `<div class="step-callout warn"><strong>${T.warning}</strong>${step.warning}</div>` : ''}
      ${step.norm ? `<div class="step-callout norm"><strong>${T.norm}</strong>${step.norm}</div>` : ''}
      <button class="step-complete-btn" onclick="toggleComplete(${idx},${si})">
        ${done ? '✓ ' + (lang === 'fr' ? 'Terminé' : 'Completed') : '◎ ' + T.stepDone}</button></div>`;
        grid.appendChild(card);
    });
    renderMaterials(idx); renderCosts(idx);
    const tips = document.getElementById('tips-row'); tips.innerHTML = '';
    (ph.tips || []).forEach(t => { const b = document.createElement('div'); b.className = 'tip-badge fade-in'; b.textContent = '💡 ' + t; tips.appendChild(b); });
    update3DPhase(idx);
}

function toggleStep(pi, si) { const c = document.getElementById(`step-${pi}-${si}`); if (c) c.classList.toggle('expanded'); }

function toggleComplete(pi, si) {
    const key = `${pi}-${si}`; completedSteps[key] = !completedSteps[key];
    renderPhase(pi); updateProgress(); updateBudget(); renderPhaseList();
    if (completedSteps[key]) showToast((lang === 'fr' ? '✅ Étape terminée!' : '✅ Step completed!'), 'success');
}

function changePhase(dir) {
    const n = currentPhase + dir; if (n < 0 || n > 6) return;
    currentPhase = n; renderPhase(n); renderPhaseList();
}

/* ── MATERIALS ───────────────────────────────────── */
function renderMaterials(idx) {
    const ph = PHASES_DATA[lang][idx], mats = ph.materials(project);
    const tbody = document.getElementById('mat-tbody'); tbody.innerHTML = '';
    mats.forEach(m => {
        const tr = document.createElement('tr');
        const price = (project.customPrices && project.customPrices[m.name] !== undefined) ? project.customPrices[m.name] : m.unitPrice;
        tr.innerHTML = `
            <td>${m.name} <span class="cat-badge">${m.category}</span></td>
            <td>${m.qty.toLocaleString()}</td>
            <td>${m.unit}</td>
            <td>
                <div class="price-edit-wrap">
                    <span class="currency-sym">$</span>
                    <input type="number" class="price-input" data-mat="${m.name}" value="${price}" min="0" step="0.1" onchange="updateMatPrice('${m.name}', this.value)" />
                </div>
            </td>
            <td>${fmtDollar(m.qty * price)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateMatPrice(matName, val) {
    if (!project.customPrices) project.customPrices = {};
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
        project.customPrices[matName] = parsed;
    }
    computeTotalCosts();
    updateBudget();
    updateOverview();
    renderPhase(currentPhase);
}

/* ── COSTS ───────────────────────────────────────── */
function renderCosts(idx) {
    const T = LANG[lang], { matTotal, labTotal, total } = getPhaseCost(idx);
    const pct = (PHASE_COST_WEIGHT[idx] * 100).toFixed(0);
    document.getElementById('cost-rows').innerHTML = `
    <div class="cost-row"><span class="label">📦 ${T.materialCost}</span><span class="val">${fmtDollar(matTotal)}</span></div>
    <div class="cost-row"><span class="label">👷 ${T.laborCost}</span><span class="val">${fmtDollar(labTotal)}</span></div>
    <div class="cost-row total"><span class="label">${T.phaseCost}</span><span class="val">${fmtDollar(total)}</span></div>
    <div class="cost-bar-wrap"><div style="font-size:0.73rem;color:var(--text-faint)">~${pct}% of total build cost</div>
    <div class="cost-bar"><div class="cost-bar-mat" style="width:${(matTotal / total * 100).toFixed(0)}%"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-faint);margin-top:3px">
      <span>📦 ${(matTotal / total * 100).toFixed(0)}%</span><span>👷 ${(labTotal / total * 100).toFixed(0)}%</span></div></div>`;
}

/* ── COLORS ──────────────────────────────────────── */
function buildColorGrid() {
    const T = LANG[lang], grid = document.getElementById('color-grid'); grid.innerHTML = '';
    const keys = Object.keys(DEFAULT_COLORS), labels = Object.values(T.colors);
    keys.forEach((key, i) => {
        const wrap = document.createElement('div'); wrap.className = 'color-item';
        wrap.innerHTML = `<label>${labels[i]}</label><div class="color-swatch-wrap" onclick="document.getElementById('clr-${key}').click()">
      <input type="color" class="color-swatch" id="clr-${key}" value="${colors[key]}"/>
      <span class="color-hex" id="clrhex-${key}">${colors[key]}</span></div>`;
        grid.appendChild(wrap);
        wrap.querySelector(`#clr-${key}`).addEventListener('input', function () {
            colors[key] = this.value; document.getElementById('clrhex-${key}').textContent = this.value;
            update3DColors(colors); drawEditor();
        });
    });
}

/* ── UTILS ───────────────────────────────────────── */
function fmtDollar(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

let _toastTimer = null;
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast ' + type + ' show';
    clearTimeout(_toastTimer); _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// Init language and units on load
(function () {
    const s = localStorage.getItem('architectpro-lang') || 'en'; setLang(s);
    const u = localStorage.getItem('architectpro-units') || 'metric'; setUnitSystem(u);
})();
