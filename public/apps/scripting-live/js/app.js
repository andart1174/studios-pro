/**
 * app.js — Scripting Studio PRO v5.0 Main Controller
 * ===================================================
 * Wires:
 *  - Fast O(N) Syntax Highlighter + synced line numbers + Tab/Ctrl+Enter + Smart Formatter
 *  - AI Code-to-3D Prompt Bar + 17 Real Solid PBR Templates Gallery
 *  - Live Parameter Sliders (zero camera reset, zero History flood)
 *  - Safe XSS-free Console & Live REPL (adds geometry without scene duplication!)
 *  - FREE Local Projects + .spcode import/export
 *  - Complete Export Suite (GLB, STL, OBJ, AR Viewer 3D, Video 60fps + 360° Reel, PNG, HTML)
 *  - Firestore Collab Room protocol (preserves CREATE_COLLAB_ROOM / COLLAB_MSG / COLLAB_IFRAME_READY
 *    AND persists unsaved code across room reload via sessionStorage!)
 *  - EN / FR language toggle that NEVER overwrites user code!
 */

(function () {
    'use strict';

    // ── DOM References ───────────────────────────────────────────────────────
    const editorEl      = document.getElementById('code-editor');
    const highlightEl   = document.getElementById('code-highlight');
    const lineNumsEl    = document.getElementById('line-numbers');
    const consoleLogsEl = document.getElementById('console-logs');
    const replInputEl   = document.getElementById('console-repl-input');
    const statsPill     = document.getElementById('scene-stats-pill');
    const paramsCard    = document.getElementById('script-params-card');
    const paramsList    = document.getElementById('script-params-list');
    const htmlFrame     = document.getElementById('html-preview-frame');
    const viewport3d    = document.getElementById('viewport-3d');
    const viewportHud   = document.getElementById('viewport-hud');
    const exportDock    = document.getElementById('export-dock');
    const galleryModal  = document.getElementById('gallery-modal');
    const exportModal   = document.getElementById('export-modal');
    const htmlFullModal = document.getElementById('html-full-modal');

    // ── App State ────────────────────────────────────────────────────────────
    let currentLang = 'en';
    let currentName = 'planetary-gearbox';
    let isHtmlMode = false;
    const codeHistory = [];
    const replHistory = [];
    let replHistIdx = -1;

    // ── i18n (NEVER overwrites user code!) ───────────────────────────────────
    const I18N = {
        en: {
            backBtn: 'Back', appTitle: 'Scripting Studio',
            aiPlaceholder: 'AI Code-to-3D: Diamond Ring, 24-floor Tower, Sports Car...', aiBtn: 'AI Code',
            singleMode: 'Solo', exportBtn: 'Export', editorTitle: 'Script Editor',
            browseTemplates: 'Templates (20)', runBtn: 'Run', formatBtn: 'Format',
            drawBtn: 'Draw 3D', shareBtn: 'Share', collabBtn: 'Collab', fullHtmlBtn: 'Fullscreen',
            tabConsole: 'Console', tabToolbox: 'Toolbox', tabProjects: 'Projects', tabHistory: 'History',
            searchSnippets: 'Search CAD snippets (gear, tube, box, gold)...', projNamePh: 'Project name...',
            saveBtn: 'Save', liveParams: 'Live Parameters', sceneTitle: 'Scene & View',
            modelColor: 'Default Color', bgColor: 'Background', autoRot: 'Auto Rotate', fitView: 'Fit Camera',
            recBtn: 'REC', galleryTitle: 'Real 3D Parametric Templates', expSuiteTitle: 'Scripting Studio Export Suite',
        },
        fr: {
            backBtn: 'Retour', appTitle: 'Studio Scripting',
            aiPlaceholder: 'IA Code→3D : Bague Diamant, Tour 24 étages, Voiture...', aiBtn: 'IA Code',
            singleMode: 'Solo', exportBtn: 'Exporter', editorTitle: 'Éditeur de Script',
            browseTemplates: 'Modèles (20)', runBtn: 'Exécuter', formatBtn: 'Formater',
            drawBtn: 'Dessin 3D', shareBtn: 'Partager', collabBtn: 'Collab', fullHtmlBtn: 'Plein Écran',
            tabConsole: 'Console', tabToolbox: 'Outils', tabProjects: 'Projets', tabHistory: 'Historique',
            searchSnippets: 'Rechercher snippets (gear, tube, box, gold)...', projNamePh: 'Nom du projet...',
            saveBtn: 'Sauver', liveParams: 'Paramètres Live', sceneTitle: 'Scène & Vue',
            modelColor: 'Couleur Défaut', bgColor: 'Arrière-plan', autoRot: 'Rotation Auto', fitView: 'Recentrer',
            recBtn: 'ENR', galleryTitle: 'Modèles 3D Paramétriques Réels', expSuiteTitle: 'Suite Export Studio Scripting',
        }
    };

    function applyLang(lang) {
        currentLang = lang;
        const d = I18N[lang] || I18N.en;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const k = el.dataset.i18n;
            if (d[k]) el.textContent = d[k];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const k = el.dataset.i18nPlaceholder;
            if (d[k]) el.placeholder = d[k];
        });
        document.documentElement.lang = lang;
        renderGallery('all');
    }

    // ── Toast & Safe XSS-Free Console Logger ─────────────────────────────────
    let toastTimer = null;
    function showToast(msg, dur = 2600) {
        let el = document.getElementById('toast');
        if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), dur);
    }

    function logConsole(text, cls = '') {
        const line = document.createElement('div');
        line.className = 'log-line' + (cls ? ' ' + cls : '');
        const ts = new Date().toLocaleTimeString([], { hour12: false });
        line.textContent = `[${ts}] ${text}`;
        consoleLogsEl.appendChild(line);
        while (consoleLogsEl.children.length > 120) consoleLogsEl.removeChild(consoleLogsEl.firstChild);
        consoleLogsEl.scrollTop = consoleLogsEl.scrollHeight;
    }

    // ── Fast O(N) Syntax Highlighter & Line Numbers ──────────────────────────
    const TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|for|while|if|else|return|function|new|true|false|null|Math)\b|\b(api\.[A-Za-z0-9_]+)\b|\b(\d+(?:\.\d+)?)\b/g;

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlightCode(src) {
        let out = '';
        let last = 0;
        TOKEN_RE.lastIndex = 0;
        let m;
        while ((m = TOKEN_RE.exec(src)) !== null) {
            if (m.index > last) out += escapeHtml(src.slice(last, m.index));
            const raw = escapeHtml(m[0]);
            if (m[1]) out += `<span class="tok-cmt">${raw}</span>`;
            else if (m[2]) out += `<span class="tok-str">${raw}</span>`;
            else if (m[3]) out += `<span class="tok-kw">${raw}</span>`;
            else if (m[4]) out += `<span class="tok-api">${raw}</span>`;
            else if (m[5]) out += `<span class="tok-num">${raw}</span>`;
            else out += raw;
            last = TOKEN_RE.lastIndex;
        }
        if (last < src.length) out += escapeHtml(src.slice(last));
        return out + '\n';
    }

    function syncEditorVisuals() {
        const val = editorEl.value;
        highlightEl.innerHTML = highlightCode(val);
        const count = val.split('\n').length;
        let nums = '';
        for (let i = 1; i <= count; i++) nums += i + '\n';
        lineNumsEl.textContent = nums;
        highlightEl.scrollTop = editorEl.scrollTop;
        highlightEl.scrollLeft = editorEl.scrollLeft;
        lineNumsEl.scrollTop = editorEl.scrollTop;
    }

    editorEl.addEventListener('input', () => {
        syncEditorVisuals();
        broadcastCollabCode();
    });
    editorEl.addEventListener('scroll', () => {
        highlightEl.scrollTop = editorEl.scrollTop;
        highlightEl.scrollLeft = editorEl.scrollLeft;
        lineNumsEl.scrollTop = editorEl.scrollTop;
    });
    editorEl.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runCurrentCode({ keepCamera: false, pushHist: true });
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const s = editorEl.selectionStart, end = editorEl.selectionEnd;
            editorEl.value = editorEl.value.slice(0, s) + '  ' + editorEl.value.slice(end);
            editorEl.selectionStart = editorEl.selectionEnd = s + 2;
            syncEditorVisuals();
        }
    });

    // ── Smart Code Formatter (Handles {}, [], Strings & Multi-line Comments!) ─
    function formatScriptCode(src) {
        if (/^\s*<!doctype|^\s*<html/i.test(src)) return src.trim();
        const lines = src.split('\n');
        let indent = 0, inBlockComment = false;
        return lines.map(raw => {
            const line = raw.trim();
            if (!line) return '';
            if (inBlockComment) {
                if (line.includes('*/')) inBlockComment = false;
                return '  '.repeat(indent) + line;
            }
            if (line.startsWith('/*') && !line.includes('*/')) {
                inBlockComment = true;
                return '  '.repeat(indent) + line;
            }
            if (/^[}\]]/.test(line)) indent = Math.max(0, indent - 1);
            const formatted = '  '.repeat(indent) + line;
            const stripped = line.replace(/\/\/.*$/, '').replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '');
            const opens = (stripped.match(/[{\[]/g) || []).length;
            const closes = (stripped.match(/[}\]]/g) || []).length;
            if (/^[}\]]/.test(line)) indent = Math.max(0, indent + opens - Math.max(0, closes - 1));
            else indent = Math.max(0, indent + opens - closes);
            return formatted;
        }).join('\n');
    }

    // ── Execute Script (3D PBR Mode OR Sandboxed HTML5 Live Mode) ────────────
    function runCurrentCode(opts = {}) {
        const code = editorEl.value;
        isHtmlMode = /^\s*<!doctype|^\s*<html/i.test(code);

        if (opts.pushHist) pushHistory(code);

        if (isHtmlMode) {
            viewport3d.style.display = 'none';
            viewportHud.style.display = 'none';
            exportDock.style.display = 'none';
            htmlFrame.style.display = 'block';
            htmlFrame.srcdoc = code;
            document.getElementById('btn-html-full').style.display = 'inline-flex';
            statsPill.textContent = 'HTML5 Sandbox';
            logConsole('Rendered sandboxed HTML5 Live Preview.', 'ok');
            return;
        }

        htmlFrame.style.display = 'none';
        viewport3d.style.display = 'block';
        viewportHud.style.display = 'flex';
        exportDock.style.display = 'flex';
        document.getElementById('btn-html-full').style.display = 'none';

        const res = ScriptingEngine3D.runScript(code, {
            keepCamera: !!opts.keepCamera,
            resetParams: opts.resetParams !== false,
        });
        if (res.ok && res.stats) {
            logConsole(`Rendered ${res.stats.meshes} solid meshes (${res.stats.triangles.toLocaleString()} tris).`, 'ok');
        }
    }

    function renderLiveParams(paramList) {
        if (!paramList || paramList.length === 0) {
            paramsCard.style.display = 'none';
            paramsList.innerHTML = '';
            return;
        }
        paramsCard.style.display = 'flex';
        paramsList.innerHTML = '';
        paramList.forEach(p => {
            const row = document.createElement('div');
            row.className = 'hud-row';
            if (p.type === 'color') {
                const lbl = document.createElement('span'); lbl.textContent = p.name;
                const inp = document.createElement('input'); inp.type = 'color'; inp.value = p.value;
                inp.addEventListener('input', () => ScriptingEngine3D.setParamValue(p.name, inp.value));
                row.append(lbl, inp);
            } else {
                const lbl = document.createElement('span'); lbl.textContent = p.name; lbl.style.minWidth = '72px';
                const inp = document.createElement('input');
                inp.type = 'range'; inp.min = p.min; inp.max = p.max; inp.step = p.step; inp.value = p.value;
                const valEl = document.createElement('span');
                valEl.textContent = String(p.value);
                valEl.style.cssText = 'min-width:30px;text-align:right;color:#38bdf8;font-weight:700;';
                inp.addEventListener('input', () => {
                    const v = parseFloat(inp.value);
                    valEl.textContent = Number.isInteger(v) ? String(v) : v.toFixed(1);
                    ScriptingEngine3D.setParamValue(p.name, v);
                });
                row.append(lbl, inp, valEl);
            }
            paramsList.appendChild(row);
        });
    }

    // ── Initialize 3D Engine ─────────────────────────────────────────────────
    ScriptingEngine3D.init(viewport3d, {
        onParamsChanged: renderLiveParams,
        onLog: (txt, kind) => logConsole(txt, kind === 'error' ? 'err' : ''),
        onStats: (st) => {
            statsPill.textContent = `${st.meshes} meshes • ${st.triangles.toLocaleString()} tris`;
        },
    });
    ScriptingEngine3D.setAutoRotate(true);

    // ── Initialize Draw 3D Sketcher ──────────────────────────────────────────
    ScriptingSketcher.init({
        onCodeGenerated: (code) => {
            currentName = 'sketch-3d';
            editorEl.value = code;
            syncEditorVisuals();
            runCurrentCode({ resetParams: true, pushHist: true });
            showToast('✏️ 3D Sketch code generated!');
        }
    });

    // ── Templates Gallery Modal ──────────────────────────────────────────────
    function renderGallery(cat = 'all') {
        const grid = document.getElementById('gallery-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const list = ScriptingTemplates.getAll().filter(t => cat === 'all' || t.category === cat);
        list.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'tpl-card';
            btn.dataset.tplId = t.id;
            const title = currentLang === 'fr' ? t.name_fr : t.name_en;
            const desc  = currentLang === 'fr' ? t.desc_fr : t.desc_en;
            btn.innerHTML = `<span class="tpl-icon">${t.icon}</span><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>`;
            btn.addEventListener('click', () => {
                currentName = t.id;
                editorEl.value = t.code;
                syncEditorVisuals();
                galleryModal.classList.remove('open');
                runCurrentCode({ resetParams: true, pushHist: true });
                showToast(`${t.icon} ${title}`);
            });
            grid.appendChild(btn);
        });
    }

    document.querySelectorAll('#tpl-cat-bar .tpl-cat-btn').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('#tpl-cat-bar .tpl-cat-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            renderGallery(b.dataset.tcat);
        });
    });

    // ── AI Code-to-3D Prompt Bar ─────────────────────────────────────────────
    function handleAICodePrompt() {
        const inp = document.getElementById('ai-code-input');
        const prompt = (inp && inp.value || '').trim();
        const res = ScriptingTemplates.generateFromPrompt(prompt || 'Golden Twisted Skyscraper');
        currentName = 'ai-' + res.template.id;
        editorEl.value = res.code;
        syncEditorVisuals();
        runCurrentCode({ resetParams: true, pushHist: true });
        showToast(`✨ AI Code-to-3D: ${currentLang === 'fr' ? res.template.name_fr : res.template.name_en}`);
    }
    document.getElementById('btn-ai-code-go')?.addEventListener('click', handleAICodePrompt);
    document.getElementById('ai-code-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAICodePrompt(); });

    // ── Parametric CAD Toolbox ───────────────────────────────────────────────
    const TOOLBOX_ITEMS = [
        { name: 'api.addGear',      desc: 'Involute spur gear w/ bore', code: '\napi.addGear(0, 1, 0, 16, 2.8, 0.7, 0.7, { material: "gold", rx: Math.PI / 2 });' },
        { name: 'api.addRoundedBox',desc: 'Beveled solid CAD block',    code: '\napi.addRoundedBox(0, 1, 0, 4, 1.5, 2.5, 0.2, "chrome");' },
        { name: 'api.addBox',       desc: 'Non-uniform 3D box',         code: '\napi.addBox(0, 1, 0, 3, 2, 1.2, { material: "titanium", ry: 0.4 });' },
        { name: 'api.addTube',      desc: '3D solid swept curve pipe',  code: '\napi.addTube([[-3,0,0],[0,3,1],[3,0,0]], 0.25, { material: "copper" });' },
        { name: 'api.addLathe',     desc: 'Smooth 360° revolved solid', code: '\napi.addLathe([[0.1,0],[2,0],[1.2,2],[2.2,4],[0.1,4]], 40, { material: "gold" });' },
        { name: 'api.addExtrude',   desc: 'Beveled 2D->3D extrusion',   code: '\napi.addExtrude([[-2,-1],[2,-1],[0,2]], 0.8, true, { material: "emerald" });' },
        { name: 'api.addArch',      desc: 'Architectural Roman arch',   code: '\napi.addArch(0, 0, 0, 4.5, 5, 0.8, 0.6, "marble");' },
        { name: 'api.radialArray',  desc: 'Circular CAD array loop',    code: '\napi.radialArray(8, 4, (i) => {\n  api.addCylinder(0, 1.5, 0, 0.3, 0.35, 3, "ceramic");\n});' },
        { name: 'api.pushTransform',desc: 'Hierarchical transform group',code: '\napi.pushTransform(0, 2, 0, 0, 0.5, 0, 1);\napi.addBox(0, 0, 0, 2, 1, 1, "gold");\napi.popTransform();' },
        { name: 'api.param',        desc: 'Live interactive slider',    code: '\nconst size = api.param("Size", 2.0, 0.5, 6.0, 0.1);' },
        { name: 'api.addText3D',    desc: '3D engraved title plaque',   code: '\napi.addText3D("STUDIOS PRO", 0, 4, 0, { color: "#00f3ff" });' },
        { name: 'Materials PBR',    desc: 'gold, chrome, glass, neon…', code: '\n// Materials: "gold" "chrome" "titanium" "copper" "obsidian" "glass" "diamond" "emerald" "ruby" "wood" "marble" "neon"' },
    ];

    function renderToolbox(filter = '') {
        const list = document.getElementById('toolbox-list');
        if (!list) return;
        const q = filter.toLowerCase().trim();
        const grid = document.createElement('div');
        grid.className = 'toolbox-grid';
        TOOLBOX_ITEMS.filter(it => !q || it.name.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q)).forEach(it => {
            const btn = document.createElement('button');
            btn.className = 'tb-card';
            btn.innerHTML = `<strong>${escapeHtml(it.name)}</strong><span>${escapeHtml(it.desc)}</span>`;
            btn.addEventListener('click', () => {
                const pos = editorEl.selectionStart || editorEl.value.length;
                editorEl.value = editorEl.value.slice(0, pos) + it.code + editorEl.value.slice(pos);
                syncEditorVisuals();
                runCurrentCode({ keepCamera: true, pushHist: true });
                showToast(`➕ Inserted ${it.name}`);
            });
            grid.appendChild(btn);
        });
        list.innerHTML = '';
        list.appendChild(grid);
    }
    document.getElementById('toolbox-search')?.addEventListener('input', e => renderToolbox(e.target.value));

    // ── Local Projects (100% FREE — Never Paywalled!) ────────────────────────
    const PROJ_KEY = 'sp_scripting_projects_v5';
    function loadProjectsList() {
        try { return JSON.parse(localStorage.getItem(PROJ_KEY) || '[]'); } catch (_) { return []; }
    }
    function saveProjectsList(arr) {
        try { localStorage.setItem(PROJ_KEY, JSON.stringify(arr)); } catch (_) {}
    }
    function renderProjects() {
        const box = document.getElementById('projects-list');
        if (!box) return;
        const arr = loadProjectsList();
        box.innerHTML = '';
        if (arr.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#64748b;font-size:0.74rem;padding:12px;text-align:center;';
            empty.textContent = currentLang === 'fr' ? 'Aucun projet sauvegardé.' : 'No saved projects yet.';
            box.appendChild(empty);
            return;
        }
        arr.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'proj-row';
            const title = document.createElement('span');
            title.textContent = `${p.name} (${new Date(p.ts).toLocaleDateString()})`;
            const btns = document.createElement('div');
            btns.style.cssText = 'display:flex;gap:4px;';
            const ld = document.createElement('button'); ld.className = 'icon-btn'; ld.textContent = 'Load';
            ld.onclick = () => {
                currentName = p.name;
                editorEl.value = p.code;
                syncEditorVisuals();
                runCurrentCode({ resetParams: true, pushHist: true });
                showToast(`📂 Loaded "${p.name}"`);
            };
            const del = document.createElement('button'); del.className = 'icon-btn'; del.style.color = '#f87171'; del.textContent = '✕';
            del.onclick = () => {
                const next = loadProjectsList();
                next.splice(idx, 1);
                saveProjectsList(next);
                renderProjects();
            };
            btns.append(ld, del);
            row.append(title, btns);
            box.appendChild(row);
        });
    }

    function saveLocalProject() {
        const inp = document.getElementById('project-name-input');
        const name = (inp && inp.value || '').trim() || `${currentName}-${Date.now().toString().slice(-4)}`;
        const arr = loadProjectsList();
        arr.unshift({ name, code: editorEl.value, ts: Date.now() });
        if (arr.length > 25) arr.pop();
        saveProjectsList(arr);
        if (inp) inp.value = '';
        renderProjects();
        showToast(`💾 Saved project "${name}" (FREE)!`);
    }
    document.getElementById('btn-project-store')?.addEventListener('click', saveLocalProject);
    document.getElementById('project-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveLocalProject(); });

    document.getElementById('btn-spcode-export')?.addEventListener('click', () => {
        const res = ScriptingExport.exportCodeFile({ name: currentName, code: editorEl.value, style: ScriptingEngine3D.getSceneStyle() }, currentName);
        showToast(`💾 Exported ${currentName}.spcode (${Math.max(1, Math.round(res.bytes / 1024))} KB — FREE)!`);
    });
    const spImportInput = document.getElementById('spcode-import-input');
    document.getElementById('btn-spcode-import')?.addEventListener('click', () => spImportInput && spImportInput.click());
    spImportInput?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const parsed = JSON.parse(r.result);
                editorEl.value = parsed.code || String(r.result);
                if (parsed.name) currentName = parsed.name;
            } catch (_) {
                editorEl.value = String(r.result);
            }
            syncEditorVisuals();
            runCurrentCode({ resetParams: true, pushHist: true });
            showToast(`📂 Loaded ${file.name}`);
        };
        r.readAsText(file);
        spImportInput.value = '';
    });

    // ── History ──────────────────────────────────────────────────────────────
    function pushHistory(code) {
        if (codeHistory.length > 0 && codeHistory[0].code === code) return;
        codeHistory.unshift({ code, name: currentName, ts: Date.now() });
        if (codeHistory.length > 15) codeHistory.pop();
        renderHistory();
    }
    function renderHistory() {
        const box = document.getElementById('history-list');
        if (!box) return;
        box.innerHTML = '';
        codeHistory.forEach((h) => {
            const row = document.createElement('div');
            row.className = 'proj-row';
            const lbl = document.createElement('span');
            lbl.textContent = `${h.name} • ${new Date(h.ts).toLocaleTimeString([], { hour12: false })}`;
            const btn = document.createElement('button');
            btn.className = 'icon-btn'; btn.textContent = 'Restore';
            btn.onclick = () => {
                editorEl.value = h.code;
                syncEditorVisuals();
                runCurrentCode({ keepCamera: true });
            };
            row.append(lbl, btn);
            box.appendChild(row);
        });
    }

    // ── Console REPL (XSS-Free + No Scene Duplication!) ──────────────────────
    function runREPLCommand() {
        const cmd = (replInputEl.value || '').trim();
        if (!cmd) return;
        replHistory.unshift(cmd);
        replHistIdx = -1;
        replInputEl.value = '';

        if (cmd.startsWith('/say ')) {
            const msg = cmd.slice(5).trim();
            logConsole(`💬 You: ${msg}`, 'repl');
            sendCollabMsg({ type: 'CHAT', text: msg });
            return;
        }
        logConsole(`> ${cmd}`, 'repl');
        const res = ScriptingEngine3D.runREPL(cmd);
        if (res.ok) {
            if (res.value !== undefined && typeof res.value !== 'object') {
                logConsole(`← ${String(res.value)}`, 'ok');
            } else {
                logConsole(`✓ OK (${res.stats.meshes} meshes • ${res.stats.triangles.toLocaleString()} tris)`, 'ok');
            }
        } else {
            logConsole(`❌ ${res.error}`, 'err');
        }
    }
    document.getElementById('btn-repl-send')?.addEventListener('click', runREPLCommand);
    replInputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); runREPLCommand(); }
        else if (e.key === 'ArrowUp' && replHistory.length) {
            replHistIdx = Math.min(replHistory.length - 1, replHistIdx + 1);
            replInputEl.value = replHistory[replHistIdx];
        } else if (e.key === 'ArrowDown' && replHistory.length) {
            replHistIdx = Math.max(-1, replHistIdx - 1);
            replInputEl.value = replHistIdx >= 0 ? replHistory[replHistIdx] : '';
        }
    });

    // ── Drawer Tab Switching ─────────────────────────────────────────────────
    document.querySelectorAll('.dtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.dtab;
            document.querySelectorAll('.dtab-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.drawer-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tab}`));
            if (tab === 'toolbox') renderToolbox(document.getElementById('toolbox-search')?.value || '');
            if (tab === 'projects') renderProjects();
            if (tab === 'history') renderHistory();
        });
    });

    // ── Firestore + BroadcastChannel Collab Bridge ───────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    let collabRoomId = urlParams.get('room') || '';
    const collabUserId = 'u_' + Math.random().toString(36).slice(2, 8);
    let collabSyncTimer = null;

    function updateCollabBadge() {
        const badge = document.getElementById('collab-status-badge');
        const txt = document.getElementById('collab-status-text');
        const lockBtn = document.getElementById('btn-collab-lock');
        if (collabRoomId) {
            badge.classList.add('connected');
            txt.textContent = `Room ${collabRoomId.slice(0, 6)}`;
            if (lockBtn) lockBtn.style.display = 'inline-flex';
        } else {
            badge.classList.remove('connected');
            txt.textContent = I18N[currentLang].singleMode;
            if (lockBtn) lockBtn.style.display = 'none';
        }
    }

    function sendCollabMsg(payload) {
        if (!collabRoomId) return;
        const msg = { type: 'COLLAB_MSG', payload: { ...payload, userId: collabUserId } };
        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage(msg, '*'); } catch (_) {}
        }
    }

    function broadcastCollabCode() {
        if (!collabRoomId) return;
        clearTimeout(collabSyncTimer);
        collabSyncTimer = setTimeout(() => {
            sendCollabMsg({ type: 'CODE_SYNC', code: editorEl.value });
        }, 400);
    }

    window.addEventListener('message', (e) => {
        if (e.origin && e.origin !== window.location.origin) return;
        const d = e.data;
        if (!d || d.type !== 'COLLAB_MSG' || !d.payload || d.payload.userId === collabUserId) return;
        if (d.payload.type === 'CODE_SYNC' && typeof d.payload.code === 'string') {
            editorEl.value = d.payload.code;
            syncEditorVisuals();
            runCurrentCode({ keepCamera: true });
        } else if (d.payload.type === 'CHAT' && d.payload.text) {
            logConsole(`💬 Peer: ${String(d.payload.text)}`, 'repl');
        }
    });

    document.getElementById('btn-collab-start')?.addEventListener('click', () => {
        // Persist current code in sessionStorage so parent room URL update never loses code!
        try { sessionStorage.setItem('sp_scripting_draft_v5', editorEl.value); } catch (_) {}
        if (!collabRoomId) {
            collabRoomId = 'r' + Math.random().toString(36).slice(2, 8);
            updateCollabBadge();
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'CREATE_COLLAB_ROOM', payload: { roomId: collabRoomId } }, '*');
            }
        }
        const shareUrl = `${window.location.origin}/?ref=scripting&room=${collabRoomId}`;
        if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
        showToast(`👥 Collab Room ${collabRoomId} link copied!`);
        logConsole(`Collab room active: ${shareUrl}`, 'ok');
    });

    if (collabRoomId) {
        updateCollabBadge();
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'COLLAB_IFRAME_READY' }, '*');
        }
    }

    // ── Export Suite Handlers (GLB, STL, OBJ, AR, HTML, Video, Reel, PNG) ────
    function doGLB() {
        if (isHtmlMode) { showToast('Switch to a 3D script to export GLB'); return; }
        window.StudiosProGate.requireExport('glb', async () => {
            try {
                const res = await ScriptingExport.exportGLB(ScriptingEngine3D.getRootGroup(), currentName);
                showToast(`🗿 GLB exported (${Math.round(res.bytes / 1024)} KB • ${res.triangles.toLocaleString()} tris)!`);
                exportModal.classList.remove('open');
            } catch (e) { showToast('❌ GLB: ' + e.message); }
        });
    }

    function doSTL() {
        if (isHtmlMode) { showToast('Switch to a 3D script to export STL'); return; }
        window.StudiosProGate.requireExport('stl', () => {
            const res = ScriptingExport.exportSTL(ScriptingEngine3D.getRootGroup(), currentName);
            if (res.ok) {
                showToast(`🖨️ STL exported (${Math.round(res.bytes / 1024)} KB • ${res.triangles.toLocaleString()} tris)!`);
                exportModal.classList.remove('open');
            } else showToast('❌ STL: ' + res.error);
        });
    }

    function doOBJ() {
        if (isHtmlMode) { showToast('Switch to a 3D script to export OBJ'); return; }
        window.StudiosProGate.requireExport('obj', () => {
            const res = ScriptingExport.exportOBJ(ScriptingEngine3D.getRootGroup(), currentName);
            if (res.ok) {
                showToast(`📐 OBJ exported (${Math.round(res.bytes / 1024)} KB • ${res.triangles.toLocaleString()} tris)!`);
                exportModal.classList.remove('open');
            } else showToast('❌ OBJ: ' + res.error);
        });
    }

    async function doAR() {
        if (isHtmlMode) { showToast('Switch to a 3D script for AR Viewer'); return; }
        exportModal.classList.remove('open');
        showToast('📱 Sending solid PBR GLB to AR Viewer 3D…', 2200);
        try {
            const res = await ScriptingExport.openInARViewer(ScriptingEngine3D.getRootGroup(), currentName);
            showToast(`📱 Opened ${res.name} (${Math.round(res.bytes / 1024)} KB) in AR Viewer!`);
        } catch (e) { showToast('❌ AR error: ' + e.message); }
    }

    function doHTML() {
        if (isHtmlMode) {
            const blob = new Blob([editorEl.value], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${currentName}.html`; a.dataset.bypassed = 'true';
            a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
            showToast('🌐 HTML5 page downloaded!');
            return;
        }
        window.StudiosProGate.requireExport('html', async () => {
            try {
                const res = await ScriptingExport.exportInteractiveHTML(ScriptingEngine3D.getRootGroup(), currentName, currentName);
                showToast(`🌐 Interactive HTML exported (${Math.round(res.bytes / 1024)} KB)!`);
                exportModal.classList.remove('open');
            } catch (e) { showToast('❌ HTML: ' + e.message); }
        });
    }

    function doPNG(scale = 2, transparent = false) {
        if (isHtmlMode) { showToast('Switch to 3D mode for PNG snapshot'); return; }
        window.StudiosProGate.requireExport('png', () => {
            const res = ScriptingExport.exportPNG(ScriptingEngine3D, { scale, transparent, baseName: currentName });
            showToast(`📸 PNG ${res.width}×${res.height}${transparent ? ' Alpha' : ''} saved!`);
            exportModal.classList.remove('open');
        });
    }

    function toggleVideo(turntable = false) {
        const recBtn = document.getElementById('dock-rec');
        if (ScriptingExport.isRecording()) {
            ScriptingExport.stopVideo();
            recBtn?.classList.remove('recording');
            return;
        }
        window.StudiosProGate.requireExport('video', () => {
            exportModal.classList.remove('open');
            const ok = ScriptingExport.startVideo(ScriptingEngine3D, currentName, { turntable }, (info) => {
                recBtn?.classList.remove('recording');
                showToast(`🎬 Video exported (${Math.round(info.bytes / 1024)} KB .${info.ext})!`);
            });
            if (ok) {
                recBtn?.classList.add('recording');
                showToast(turntable ? '🎥 Recording 6s 360° Turntable Reel…' : '🔴 Recording 60fps Video… Click REC to stop.');
                if (turntable) {
                    setTimeout(() => { if (ScriptingExport.isRecording()) ScriptingExport.stopVideo(); }, 6000);
                }
            }
        });
    }

    // ── Wire All Buttons & View Controls ─────────────────────────────────────
    document.getElementById('back-btn')?.addEventListener('click', () => window.StudiosProGate.closeStudio());
    document.getElementById('btn-lang')?.addEventListener('click', () => applyLang(currentLang === 'en' ? 'fr' : 'en'));
    document.getElementById('btn-run')?.addEventListener('click', () => runCurrentCode({ keepCamera: false, pushHist: true }));
    document.getElementById('btn-format')?.addEventListener('click', () => {
        editorEl.value = formatScriptCode(editorEl.value);
        syncEditorVisuals();
        showToast('✨ Code formatted!');
    });
    document.getElementById('btn-sketch-open')?.addEventListener('click', () => ScriptingSketcher.open());
    document.getElementById('btn-gallery-open')?.addEventListener('click', () => { renderGallery('all'); galleryModal.classList.add('open'); });
    document.getElementById('btn-gallery-close')?.addEventListener('click', () => galleryModal.classList.remove('open'));
    galleryModal?.addEventListener('click', e => { if (e.target === galleryModal) galleryModal.classList.remove('open'); });

    document.getElementById('btn-open-export')?.addEventListener('click', () => exportModal.classList.add('open'));
    document.getElementById('btn-export-close')?.addEventListener('click', () => exportModal.classList.remove('open'));
    exportModal?.addEventListener('click', e => { if (e.target === exportModal) exportModal.classList.remove('open'); });

    document.getElementById('dock-glb')?.addEventListener('click', doGLB);
    document.getElementById('btn-exp-glb')?.addEventListener('click', doGLB);
    document.getElementById('dock-stl')?.addEventListener('click', doSTL);
    document.getElementById('btn-exp-stl')?.addEventListener('click', doSTL);
    document.getElementById('dock-obj')?.addEventListener('click', doOBJ);
    document.getElementById('btn-exp-obj')?.addEventListener('click', doOBJ);
    document.getElementById('btn-ar-quick')?.addEventListener('click', doAR);
    document.getElementById('dock-ar')?.addEventListener('click', doAR);
    document.getElementById('btn-exp-ar')?.addEventListener('click', doAR);
    document.getElementById('dock-html')?.addEventListener('click', doHTML);
    document.getElementById('btn-exp-html')?.addEventListener('click', doHTML);
    document.getElementById('dock-png')?.addEventListener('click', () => doPNG(2, false));
    document.getElementById('btn-exp-png')?.addEventListener('click', () => {
        const sc = parseInt(document.getElementById('png-scale-sel')?.value || '2', 10);
        const tr = !!document.getElementById('png-alpha-chk')?.checked;
        doPNG(sc, tr);
    });
    document.getElementById('dock-rec')?.addEventListener('click', () => toggleVideo(false));
    document.getElementById('btn-exp-reel')?.addEventListener('click', () => toggleVideo(true));

    // Share Link -> viewer.html#state=...
    document.getElementById('btn-share')?.addEventListener('click', () => {
        try {
            const payload = {
                c: editorEl.value,
                mc: document.getElementById('model-color')?.value || '#38bdf8',
                bc: document.getElementById('bg-color')?.value || '#0b1122',
                ar: !!document.getElementById('auto-rotate')?.checked,
                st: ScriptingEngine3D.getSceneStyle(),
            };
            const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
            const base = window.location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
            const shareUrl = `${base}viewer.html#state=${b64}`;
            if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
            showToast('🔗 Shareable 3D Viewer link copied!');
            logConsole(`Share link ready (${shareUrl.length} chars).`, 'ok');
        } catch (e) { showToast('❌ Share failed: ' + e.message); }
    });

    // HTML Fullscreen Preview (NEVER paywalled!)
    document.getElementById('btn-html-full')?.addEventListener('click', () => {
        document.getElementById('html-full-frame').srcdoc = editorEl.value;
        htmlFullModal.classList.add('open');
    });
    document.getElementById('btn-html-refresh')?.addEventListener('click', () => {
        document.getElementById('html-full-frame').srcdoc = editorEl.value;
    });
    document.getElementById('btn-html-exit')?.addEventListener('click', () => htmlFullModal.classList.remove('open'));

    // Scene & View Controls
    document.getElementById('ambient-preset')?.addEventListener('change', e => ScriptingEngine3D.applySceneStyle(e.target.value));
    document.getElementById('model-color')?.addEventListener('input', e => ScriptingEngine3D.setDefaultModelColor(e.target.value));
    document.getElementById('bg-color')?.addEventListener('input', e => ScriptingEngine3D.setBackgroundColor(e.target.value));
    document.getElementById('auto-rotate')?.addEventListener('change', e => ScriptingEngine3D.setAutoRotate(e.target.checked));
    document.getElementById('btn-reset-cam')?.addEventListener('click', () => ScriptingEngine3D.fitCameraToRoot());

    window.addEventListener('resize', () => ScriptingEngine3D.resize());
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            galleryModal.classList.remove('open');
            exportModal.classList.remove('open');
            htmlFullModal.classList.remove('open');
            ScriptingSketcher.close();
        }
    });

    window.ScriptingStudioTeardown = () => {
        ScriptingExport.stopVideo();
        ScriptingEngine3D.teardown();
    };

    // ── Boot Sequence (Restore Share State / Collab Draft / Default Gearbox!) ─
    function boot() {
        applyLang('en');
        renderToolbox('');
        renderProjects();

        let initialCode = null;
        if (window.location.hash && window.location.hash.startsWith('#state=')) {
            try {
                const decoded = JSON.parse(decodeURIComponent(escape(atob(window.location.hash.slice(7)))));
                if (decoded && decoded.c) initialCode = decoded.c;
            } catch (_) {}
        }
        if (!initialCode && collabRoomId) {
            try {
                const draft = sessionStorage.getItem('sp_scripting_draft_v5');
                if (draft) { initialCode = draft; sessionStorage.removeItem('sp_scripting_draft_v5'); }
            } catch (_) {}
        }
        if (!initialCode) {
            const defTpl = ScriptingTemplates.getById('planetaryGearbox');
            currentName = defTpl.id;
            initialCode = defTpl.code;
        }

        editorEl.value = initialCode;
        syncEditorVisuals();
        logConsole('Scripting Studio PRO v5.0 ready (Solid PBR CAD Engine + Loop Guard).', 'ok');
        runCurrentCode({ resetParams: true, pushHist: true });
    }

    boot();
})();
