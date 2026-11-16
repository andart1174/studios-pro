// ==========================================
// PHOTO SHOWCASE STUDIO & VIRAL SHARE MODAL
// ==========================================

let currentStudioScene = 'frame';
let currentMatColor = '#f8f6f0';
let studioExportWidth = 1920;
let studioExportHeight = 1080;
let studioCameraAngle = 'topdown';
let studioOrthoCam = null;

function closeAllModals() {
    ['export-modal', 'photo-studio-modal', 'batch-tables-modal', 'share-design-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function openShareDesignModal(fromExport = false) {
    closeAllModals();
    const modal = document.getElementById('share-design-modal');
    if (!modal) return;

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
        const img = document.getElementById('share-snapshot-img');
        if (img) img.src = renderer.domElement.toDataURL('image/png');
    }

    const badge = document.getElementById('share-coaster-badge');
    if (badge) {
        const shapeName = (typeof currentShape !== 'undefined' ? currentShape : '3D').toUpperCase();
        badge.innerText = currentLang === 'fr'
            ? `Sous-Verre ${shapeName} • Code QR Scannable`
            : `3D ${shapeName} Coaster • Scannable QR`;
    }

    const shareUrl = 'https://studios-pro.com/tools/3d-qr-wifi-coaster-generator';
    const inputUrl = document.getElementById('share-input-url');
    if (inputUrl) inputUrl.value = shareUrl;

    const redditTitle = currentLang === 'fr'
        ? "Regardez ce sous-verre QR / Wi-Fi 3D imprimable généré avec Studios-Pro !"
        : "Check out this 3D printable Wi-Fi & QR Coaster made online with Studios-Pro!";
    const whatsAppText = currentLang === 'fr'
        ? "Regarde ce sous-verre 3D scannable créé avec Studios-Pro :"
        : "Check out this scannable 3D coaster I made with Studios-Pro:";
    const tweetText = currentLang === 'fr'
        ? "Générez vos propres sous-verres 3D avec QR code Wi-Fi et menu sur @studios_pro ! #3DPrinting #BambuLab"
        : "Generate custom 3D printed Wi-Fi & QR coasters on @studios_pro! #3DPrinting #BambuLab";

    const setHref = (id, url) => { const el = document.getElementById(id); if (el) el.href = url; };
    setHref('share-link-reddit', `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(redditTitle)}`);
    setHref('share-link-whatsapp', `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppText + ' ' + shareUrl)}`);
    setHref('share-link-twitter', `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(tweetText)}`);
    setHref('share-link-facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
    setHref('share-link-pinterest', `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent('https://studios-pro.com/og_3d_qr_coaster.jpg')}&description=${encodeURIComponent(tweetText)}`);

    const titleEl = document.getElementById('share-modal-title');
    const subEl = document.getElementById('share-modal-sub');
    if (fromExport && titleEl && subEl) {
        titleEl.innerText = currentLang === 'fr' ? '🎉 Export Sous-Verre Réussi !' : '🎉 Coaster Export Complete!';
        subEl.innerText = currentLang === 'fr' ? 'Partagez votre sous-verre personnalisé avec vos amis ou clients !' : 'Share your custom coaster with friends, clients, or makers!';
    } else if (titleEl && subEl) {
        titleEl.innerText = t('shareModalTitle');
        subEl.innerText = t('shareModalSub');
    }

    modal.style.display = 'flex';
    refreshIcons();
}

function closeShareDesignModal() {
    const modal = document.getElementById('share-design-modal');
    if (modal) modal.style.display = 'none';
}

function downloadShareSnapshot() {
    if (!renderer || !scene || !camera) return;
    try {
        renderer.render(scene, camera);
        const tempCanvas = document.createElement('canvas');
        const srcCanvas = renderer.domElement;
        tempCanvas.width = srcCanvas.width;
        tempCanvas.height = srcCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(srcCanvas, 0, 0);

        const barH = Math.max(40, Math.round(tempCanvas.height * 0.07));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, tempCanvas.height - barH, tempCanvas.width, barH);
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.round(barH * 0.42)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Studios-Pro.com', 20, tempCanvas.height - barH / 2);
        ctx.fillStyle = '#f8fafc';
        ctx.font = `${Math.round(barH * 0.36)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Free 3D Wi-Fi & QR Coaster Generator', tempCanvas.width - 20, tempCanvas.height - barH / 2);

        tempCanvas.toBlob((blob) => {
            if (!blob) return;
            downloadBlob(blob, 'StudiosPro_3D_Coaster_Design.png');
            showToast(t('toastSnapshotSaved', 'HD Coaster photo saved!'));
        }, 'image/png');
    } catch (e) {
        console.error('Snapshot failed:', e);
    }
}

function copyShareLink() {
    const input = document.getElementById('share-input-url');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const btnTxt = document.getElementById('txt-copy-share-link');
        if (btnTxt) {
            btnTxt.innerText = currentLang === 'fr' ? '✓ Copié !' : '✓ Copied!';
            setTimeout(() => { btnTxt.innerText = t('btnCopyLink', 'Copy'); }, 2000);
        }
        showToast(t('toastLinkCopied'));
    }).catch(() => {});
}

function triggerNativeShare() {
    const url = document.getElementById('share-input-url')?.value || 'https://studios-pro.com/tools/3d-qr-wifi-coaster-generator';
    const title = currentLang === 'fr' ? 'Sous-Verre 3D QR & Wi-Fi - Studios-Pro' : '3D QR & Wi-Fi Coaster - Studios-Pro';
    if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
    } else {
        copyShareLink();
    }
}

function openPhotoStudioModal() {
    closeAllModals();
    const modal = document.getElementById('photo-studio-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            renderStudioMockup();
            refreshIcons();
        }, 50);
    }
}

function closePhotoStudioModal() {
    const modal = document.getElementById('photo-studio-modal');
    if (modal) modal.style.display = 'none';
}

function setStudioScene(sceneName) {
    currentStudioScene = sceneName;
    ['frame', 'bistro', 'marble', 'desk', 'specsheet'].forEach(s => {
        const el = document.getElementById('scene-' + s);
        if (el) el.classList.toggle('active', s === sceneName);
    });
    const frameCtrl = document.getElementById('studio-frame-controls');
    if (frameCtrl) frameCtrl.style.display = (sceneName === 'frame') ? 'block' : 'none';
    renderStudioMockup();
}

function setStudioMatColor(color) {
    currentMatColor = color;
    const inp = document.getElementById('studio-mat-color');
    if (inp) inp.value = color;
    renderStudioMockup();
}

function updateStudioResolution() {
    const val = document.getElementById('studio-resolution-select')?.value || 'fhd';
    if (val === '4k') { studioExportWidth = 3840; studioExportHeight = 2160; }
    else if (val === 'square') { studioExportWidth = 3000; studioExportHeight = 3000; }
    else { studioExportWidth = 1920; studioExportHeight = 1080; }
    const badge = document.getElementById('studio-dim-badge');
    if (badge) badge.innerText = `${studioExportWidth} x ${studioExportHeight} px`;
    renderStudioMockup();
}

function setStudioAngle(angle) {
    studioCameraAngle = angle;
    document.getElementById('angle-topdown')?.classList.toggle('active', angle === 'topdown');
    document.getElementById('angle-perspective')?.classList.toggle('active', angle === 'perspective');
    renderStudioMockup();
}

function getStudioOrthoCamera(sizeVal) {
    const half = sizeVal * 0.58;
    if (!studioOrthoCam) {
        studioOrthoCam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 1000);
    } else {
        studioOrthoCam.left = -half;
        studioOrthoCam.right = half;
        studioOrthoCam.top = half;
        studioOrthoCam.bottom = -half;
        studioOrthoCam.updateProjectionMatrix();
    }
    studioOrthoCam.position.set(0, 200, 0);
    studioOrthoCam.up.set(0, 0, -1);
    studioOrthoCam.lookAt(0, 0, 0);
    return studioOrthoCam;
}

function captureStudioCoasterSquare(isTopDown) {
    if (!renderer || !scene || !camera) return null;
    const squareDim = 1200;
    const prevBg = scene.background;
    const prevPos = camera.position.clone();
    const prevUp = camera.up.clone();
    const prevTarget = controls.target.clone();
    const gridVis = grid ? grid.visible : true;
    const groundVis = ground ? ground.visible : true;
    const prevClearColor = new THREE.Color();
    const prevClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(prevClearColor);

    try {
        scene.background = null;
        renderer.setClearColor(0x000000, 0);
        if (grid) grid.visible = false;
        if (ground) ground.visible = false;
        renderer.setSize(squareDim, squareDim, false);

        const sizeVal = parseFloat(document.getElementById('slider-size')?.value || 100);
        let renderCam;
        if (isTopDown) {
            renderCam = getStudioOrthoCamera(sizeVal);
        } else {
            camera.aspect = 1.0;
            camera.updateProjectionMatrix();
            const dist = sizeVal * 1.5;
            camera.position.set(0, dist * 0.9, dist * 0.9);
            camera.up.set(0, 1, 0);
            camera.lookAt(0, 0, 0);
            renderCam = camera;
        }
        renderer.render(scene, renderCam);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = squareDim;
        tempCanvas.height = squareDim;
        tempCanvas.getContext('2d').drawImage(renderer.domElement, 0, 0);
        return tempCanvas;
    } catch (err) {
        console.error('captureStudioCoasterSquare error:', err);
        return null;
    } finally {
        scene.background = prevBg;
        renderer.setClearColor(prevClearColor, prevClearAlpha);
        if (grid) grid.visible = gridVis;
        if (ground) ground.visible = groundVis;
        camera.position.copy(prevPos);
        camera.up.copy(prevUp);
        controls.target.copy(prevTarget);
        controls.update();

        const container = document.getElementById('viewport-container');
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.render(scene, camera);
        }
    }
}

function drawShapeAccurateShadow(ctx, cx, cy, cSize, shapeType) {
    const r = cSize * 0.44;
    ctx.beginPath();
    if (shapeType === 'squircle' || shapeType === 'stand') {
        const s = r * 1.9;
        const rad = s * 0.14;
        const x = cx - s / 2, y = cy - s / 2;
        if (ctx.roundRect) ctx.roundRect(x, y, s, s, rad);
        else ctx.rect(x, y, s, s);
    } else if (shapeType === 'hexagon' || shapeType === 'octagon') {
        const sides = shapeType === 'hexagon' ? 6 : 8;
        const off = shapeType === 'hexagon' ? 0 : Math.PI / 8;
        for (let i = 0; i < sides; i++) {
            const a = off + (i * Math.PI * 2) / sides;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.fill();
}

function renderStudioMockup() {
    const canvas = document.getElementById('studio-mockup-canvas');
    if (!canvas) return;
    canvas.width = studioExportWidth;
    canvas.height = studioExportHeight;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const brandTitle = (document.getElementById('studio-brand-title')?.value || 'LE PETIT BISTRO').trim();
    const brandSub = (document.getElementById('studio-brand-sub')?.value || 'SCAN FOR MENU & FREE WI-FI').trim();
    const frameType = document.getElementById('studio-frame-type')?.value || 'oak';
    const plaqueStyle = document.getElementById('studio-plaque-style')?.value || 'brass';
    const fontChoice = document.getElementById('studio-font-family')?.value || 'luxury';
    const matPaddingMm = parseInt(document.getElementById('slider-mat-padding')?.value || '45', 10);
    const matMarginScale = Math.max(0.42, Math.min(0.78, 0.84 - (matPaddingMm - 20) * 0.005));

    const coasterCanvas = captureStudioCoasterSquare(studioCameraAngle === 'topdown');
    if (!coasterCanvas) return;

    if (currentStudioScene === 'frame') {
        const wallGrad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
        wallGrad.addColorStop(0, '#111827');
        wallGrad.addColorStop(1, '#030712');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, W, H);

        const fw = Math.min(W * 0.88, H * 0.88 * (W / H));
        const fh = H * 0.84;
        const fx = (W - fw) / 2, fy = (H - fh) / 2;
        const frameThick = 44 * (W / 1920);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 50 * (W / 1920);
        ctx.shadowOffsetY = 25 * (W / 1920);
        ctx.fillStyle = '#000';
        ctx.fillRect(fx, fy, fw, fh);
        ctx.restore();

        if (frameType === 'oak') {
            const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
            g.addColorStop(0, '#c89658'); g.addColorStop(0.5, '#e5b87c'); g.addColorStop(1, '#a6733a');
            ctx.fillStyle = g;
        } else if (frameType === 'walnut') {
            const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
            g.addColorStop(0, '#3e2723'); g.addColorStop(0.5, '#5d4037'); g.addColorStop(1, '#2e1c14');
            ctx.fillStyle = g;
        } else if (frameType === 'gold') {
            const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
            g.addColorStop(0, '#b45309'); g.addColorStop(0.3, '#fef08a'); g.addColorStop(0.7, '#d4af37'); g.addColorStop(1, '#78350f');
            ctx.fillStyle = g;
        } else if (frameType === 'acrylic') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        } else {
            ctx.fillStyle = '#18181b';
        }
        ctx.fillRect(fx, fy, fw, fh);

        const mx = fx + frameThick, my = fy + frameThick;
        const mw = fw - frameThick * 2, mh = fh - frameThick * 2;
        ctx.fillStyle = document.getElementById('studio-mat-color')?.value || currentMatColor;
        ctx.fillRect(mx, my, mw, mh);

        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 3;
        ctx.strokeRect(mx, my, mw, mh);

        const cSize = Math.min(mw, mh) * matMarginScale;
        const cx = W / 2 - cSize / 2;
        const cy = my + (mh - cSize) / 2 - 34 * (W / 1920);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 30 * (W / 1920);
        ctx.shadowOffsetY = 15 * (W / 1920);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        drawShapeAccurateShadow(ctx, cx + cSize / 2, cy + cSize / 2, cSize, currentShape);
        ctx.restore();

        ctx.drawImage(coasterCanvas, cx, cy, cSize, cSize);
        drawStudioPlaque(ctx, W / 2, my + mh - 70 * (W / 1920), brandTitle, brandSub, plaqueStyle, fontChoice, W);
    } else if (currentStudioScene === 'bistro') {
        const plankCount = 6, plankH = H / plankCount;
        for (let i = 0; i < plankCount; i++) {
            const pGrad = ctx.createLinearGradient(0, i * plankH, 0, (i + 1) * plankH);
            pGrad.addColorStop(0, i % 2 === 0 ? '#78350f' : '#854d0e');
            pGrad.addColorStop(1, i % 2 === 0 ? '#451a03' : '#5b2806');
            ctx.fillStyle = pGrad;
            ctx.fillRect(0, i * plankH, W, plankH);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, (i + 1) * plankH - 2, W, 2);
        }
        const cSize = Math.min(W * 0.48, H * 0.72);
        const cx = W / 2 - cSize / 2, cy = H / 2 - cSize / 2 - 20;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 45; ctx.shadowOffsetY = 22;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        drawShapeAccurateShadow(ctx, cx + cSize / 2, cy + cSize / 2, cSize, currentShape);
        ctx.restore();
        ctx.drawImage(coasterCanvas, cx, cy, cSize, cSize);
        drawStudioPlaque(ctx, W / 2, H - 70, brandTitle, brandSub, 'brass', fontChoice, W);
    } else if (currentStudioScene === 'marble') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, H * 0.3); ctx.bezierCurveTo(W * 0.4, H * 0.2, W * 0.6, H * 0.7, W, H * 0.5); ctx.stroke();
        const cSize = Math.min(W * 0.48, H * 0.72);
        const cx = W / 2 - cSize / 2, cy = H / 2 - cSize / 2 - 20;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        drawShapeAccurateShadow(ctx, cx + cSize / 2, cy + cSize / 2, cSize, currentShape);
        ctx.restore();
        ctx.drawImage(coasterCanvas, cx, cy, cSize, cSize);
        drawStudioPlaque(ctx, W / 2, H - 70, brandTitle, brandSub, 'silver', fontChoice, W);
    } else if (currentStudioScene === 'desk') {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#1e293b'); g.addColorStop(1, '#0f172a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const cSize = Math.min(W * 0.48, H * 0.72);
        const cx = W / 2 - cSize / 2, cy = H / 2 - cSize / 2 - 20;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 35; ctx.shadowOffsetY = 18;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        drawShapeAccurateShadow(ctx, cx + cSize / 2, cy + cSize / 2, cSize, currentShape);
        ctx.restore();
        ctx.drawImage(coasterCanvas, cx, cy, cSize, cSize);
        drawStudioPlaque(ctx, W / 2, H - 70, brandTitle, brandSub, 'minimal', fontChoice, W);
    } else {
        // Architectural specsheet
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);
        ctx.fillStyle = '#38bdf8';
        ctx.font = `700 ${Math.round(20 * (W / 1920))}px "Inter", monospace`;
        ctx.fillText('STUDIOS-PRO 3D CAD SPECIFICATION SHEET // ' + brandTitle.toUpperCase(), 60, 75);

        const cSize = Math.min(W * 0.44, H * 0.65);
        ctx.drawImage(coasterCanvas, W / 2 - cSize / 2, H / 2 - cSize / 2, cSize, cSize);

        const sizeVal = document.getElementById('slider-size')?.value || 100;
        const baseVal = document.getElementById('slider-base-thick')?.value || 3.2;
        ctx.fillStyle = '#f8fafc';
        ctx.font = `600 ${Math.round(16 * (W / 1920))}px "Inter", monospace`;
        ctx.fillText(`DIAMETER / WIDTH: ${sizeVal} mm`, 60, H - 120);
        ctx.fillText(`BASE THICKNESS: ${baseVal} mm`, 60, H - 95);
        ctx.fillText(`PRINT MODE: ${isFaceDownMode ? 'FACE-DOWN PEI' : printStyle.toUpperCase()}`, 60, H - 70);
    }
}

function drawStudioPlaque(ctx, cx, cy, title, sub, style, font, W) {
    const scale = W / 1920;
    const pw = 580 * scale, ph = 64 * scale;
    const px = cx - pw / 2, py = cy - ph / 2;
    ctx.save();
    if (style === 'brass') {
        const b = ctx.createLinearGradient(px, py, px + pw, py + ph);
        b.addColorStop(0, '#ca8a04'); b.addColorStop(0.5, '#fef08a'); b.addColorStop(1, '#a16207');
        ctx.fillStyle = b; ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = '#1e1b18';
    } else if (style === 'silver') {
        const s = ctx.createLinearGradient(px, py, px + pw, py + ph);
        s.addColorStop(0, '#94a3b8'); s.addColorStop(0.5, '#f8fafc'); s.addColorStop(1, '#64748b');
        ctx.fillStyle = s; ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = '#0f172a';
    } else if (style === 'emboss') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    } else {
        ctx.fillStyle = '#ffffff';
    }
    const fontFam = font === 'luxury' ? '"Cinzel", Georgia, serif' : (font === 'mono' ? 'monospace' : '"Outfit", "Inter", sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(19 * scale)}px ${fontFam}`;
    ctx.fillText(title, cx, cy - 10 * scale);
    ctx.font = `600 ${Math.round(11 * scale)}px ${fontFam}`;
    ctx.fillText(sub, cx, cy + 12 * scale);
    ctx.restore();
}

async function copyStudioPhotoToClipboard() {
    const canvas = document.getElementById('studio-mockup-canvas');
    if (!canvas) return;
    canvas.toBlob(async blob => {
        try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast(t('toastPhotoCopied'));
        } catch (_) {
            downloadStudioPhoto();
        }
    });
}

function downloadStudioPhoto() {
    const canvas = document.getElementById('studio-mockup-canvas');
    if (!canvas) return;
    canvas.toBlob(blob => {
        if (!blob) return;
        downloadBlob(blob, `StudiosPro_Showcase_${currentStudioScene}_${Date.now()}.png`);
        showToast(t('toastPhotoDownloaded'));
    }, 'image/png');
}
