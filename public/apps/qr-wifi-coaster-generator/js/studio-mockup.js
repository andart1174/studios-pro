// ==========================================
// PHOTO SHOWCASE STUDIO V2 (ALPHA SHADOWS, AUTO-FRAMING, FRONT+BACK, 6 SOCIAL FORMATS) & VIRAL SHARE
// ==========================================

let currentStudioScene = 'frame';
let currentMatColor = '#f8f6f0';
let studioExportWidth = 1920;
let studioExportHeight = 1080;
let studioCameraAngle = 'topdown';
let studioShowBothSides = false;
let studioOrthoCam = null;

function closeAllModals() {
    ['export-modal', 'photo-studio-modal', 'batch-tables-modal', 'share-design-modal', 'project-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// ==========================================
// VIRAL SHARE MODAL (FREE WATERMARKED SNAPSHOT!)
// ==========================================

function openShareDesignModal(fromExport = false) {
    closeAllModals();
    const modal = document.getElementById('share-design-modal');
    if (!modal) return;

    if (renderer && scene && camera) {
        const prevClip = renderer.localClippingEnabled;
        renderer.localClippingEnabled = false;
        renderer.render(scene, camera);
        const img = document.getElementById('share-snapshot-img');
        if (img) img.src = renderer.domElement.toDataURL('image/png');
        renderer.localClippingEnabled = prevClip;
        renderer.render(scene, camera);
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
        const prevClip = renderer.localClippingEnabled;
        renderer.localClippingEnabled = false;
        renderer.render(scene, camera);
        const tempCanvas = document.createElement('canvas');
        const srcCanvas = renderer.domElement;
        tempCanvas.width = srcCanvas.width;
        tempCanvas.height = srcCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(srcCanvas, 0, 0);
        renderer.localClippingEnabled = prevClip;
        renderer.render(scene, camera);

        const barH = Math.max(40, Math.round(tempCanvas.height * 0.07));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(0, tempCanvas.height - barH, tempCanvas.width, barH);
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.round(barH * 0.42)}px "Outfit", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Studios-Pro.com', 20, tempCanvas.height - barH / 2);
        ctx.fillStyle = '#f8fafc';
        ctx.font = `${Math.round(barH * 0.36)}px "Inter", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Free 3D Wi-Fi & QR Coaster Generator', tempCanvas.width - 20, tempCanvas.height - barH / 2);

        tempCanvas.toBlob((blob) => {
            if (!blob) return;
            downloadBlob(blob, 'StudiosPro_3D_Coaster_Design.png');
            showToast(t('toastSnapshotSaved'));
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

// ==========================================
// SHOWCASE STUDIO MODAL & CONTROLS
// ==========================================

function openPhotoStudioModal() {
    closeAllModals();
    const modal = document.getElementById('photo-studio-modal');
    if (modal) {
        const dualWrap = document.getElementById('studio-both-sides-wrap');
        if (dualWrap) dualWrap.style.display = (isDualSided || currentShape === 'tent') ? 'block' : 'none';
        if (!isDualSided && currentShape !== 'tent') {
            studioShowBothSides = false;
            const chk = document.getElementById('chk-studio-both-sides');
            if (chk) chk.checked = false;
        }
        // Auto-select perspective for standing objects (Desk Stand, Table Tent, Caddy)
        if (['stand', 'tent', 'caddy'].includes(currentShape) && studioCameraAngle === 'topdown') {
            setStudioAngle('perspective', true);
        }
        modal.style.display = 'flex';
        setTimeout(() => {
            renderStudioMockup();
            refreshIcons();
        }, 40);
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

function setStudioMatColor(color, clickedEl = null) {
    currentMatColor = color;
    const inp = document.getElementById('studio-mat-color');
    if (inp) inp.value = color;
    document.querySelectorAll('.color-dot-choice').forEach(dot => {
        const bg = dot.dataset.color || '';
        dot.classList.toggle('active', clickedEl ? (dot === clickedEl) : (bg.toLowerCase() === color.toLowerCase()));
    });
    renderStudioMockup();
}

function toggleStudioBothSides(enabled) {
    studioShowBothSides = !!enabled;
    renderStudioMockup();
}

function updateStudioResolution() {
    const val = document.getElementById('studio-resolution-select')?.value || 'fhd';
    const presets = {
        fhd: [1920, 1080],
        '4k': [3840, 2160],
        square: [3000, 3000],
        etsy: [2400, 1800],
        story: [1080, 1920],
        pinterest: [1600, 2400]
    };
    const [w, h] = presets[val] || [1920, 1080];
    studioExportWidth = w;
    studioExportHeight = h;
    const badge = document.getElementById('studio-dim-badge');
    if (badge) badge.innerText = `${studioExportWidth} × ${studioExportHeight} px`;
    renderStudioMockup();
}

function setStudioAngle(angle, skipRender = false) {
    studioCameraAngle = angle;
    document.getElementById('angle-topdown')?.classList.toggle('active', angle === 'topdown');
    document.getElementById('angle-perspective')?.classList.toggle('active', angle === 'perspective');
    if (!skipRender) renderStudioMockup();
}

// ==========================================
// AUTO-FRAMED WEBGL CAPTURE (SUPPORTS FRONT & BACK SIDES + ALL 10 SHAPES!)
// ==========================================

function getModelBoundingSphereAndCenter() {
    const box = new THREE.Box3();
    [baseMeshGroup, quietZoneMeshGroup, qrMeshGroup, textMeshGroup, badgeMeshGroup].forEach(grp => {
        if (!grp) return;
        grp.updateMatrixWorld(true);
        grp.traverse(c => {
            if (c.userData && c.userData.isPreviewOnly) return;
            if (c.isMesh && c.geometry) {
                c.geometry.computeBoundingBox();
                if (c.geometry.boundingBox) {
                    box.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld));
                }
            }
        });
    });
    if (box.isEmpty()) return { center: new THREE.Vector3(), size: new THREE.Vector3(100, 4, 100), maxDim: 100 };
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    return { center, size, maxDim: Math.max(size.x, size.y, size.z, 20) };
}

function captureStudioCoasterSquare(isTopDown, viewSide = 'A') {
    if (!renderer || !scene || !camera) return null;
    const squareDim = 1200;
    const prevBg = scene.background;
    const prevPos = camera.position.clone();
    const prevUp = camera.up.clone();
    const prevTarget = controls.target.clone();
    const prevClip = renderer.localClippingEnabled;
    const gridVis = grid ? grid.visible : true;
    const groundVis = ground ? ground.visible : true;
    const prevClearColor = new THREE.Color();
    const prevClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(prevClearColor);

    // Temporarily hide preview-only decals
    const hiddenDecals = [];
    if (baseMeshGroup) {
        baseMeshGroup.traverse(c => {
            if (c.userData && c.userData.isPreviewOnly && c.visible) {
                c.visible = false;
                hiddenDecals.push(c);
            }
        });
    }

    try {
        renderer.localClippingEnabled = false;
        scene.background = null;
        renderer.setClearColor(0x000000, 0);
        if (grid) grid.visible = false;
        if (ground) ground.visible = false;
        renderer.setSize(squareDim, squareDim, false);

        const { center, size, maxDim } = getModelBoundingSphereAndCenter();
        const isStanding = (currentShape === 'stand' || currentShape === 'tent' || currentShape === 'caddy');
        const effectiveTopDown = isTopDown && !isStanding;

        let renderCam;
        if (effectiveTopDown) {
            const half = Math.max(size.x, size.z) * 0.57;
            if (!studioOrthoCam) {
                studioOrthoCam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 1200);
            } else {
                studioOrthoCam.left = -half;
                studioOrthoCam.right = half;
                studioOrthoCam.top = half;
                studioOrthoCam.bottom = -half;
                studioOrthoCam.updateProjectionMatrix();
            }
            if (viewSide === 'B') {
                const flipHoriz = (currentShape === 'keychain' || currentShape === 'shield');
                studioOrthoCam.position.set(center.x, center.y - 220, center.z);
                studioOrthoCam.up.set(0, 0, flipHoriz ? -1 : 1);
            } else {
                studioOrthoCam.position.set(center.x, center.y + 220, center.z);
                studioOrthoCam.up.set(0, 0, -1);
            }
            studioOrthoCam.lookAt(center);
            renderCam = studioOrthoCam;
        } else {
            camera.aspect = 1.0;
            camera.updateProjectionMatrix();
            const dist = maxDim * 1.62;
            if (currentShape === 'tent') {
                const zSign = (viewSide === 'B') ? -1 : 1;
                camera.position.set(center.x + dist * 0.28 * zSign, center.y + dist * 0.35, center.z + dist * 0.92 * zSign);
                camera.up.set(0, 1, 0);
            } else if (isStanding) {
                camera.position.set(center.x + dist * 0.25, center.y + dist * 0.42, center.z + dist * 0.92);
                camera.up.set(0, 1, 0);
            } else if (viewSide === 'B') {
                const flipHoriz = (currentShape === 'keychain' || currentShape === 'shield');
                camera.position.set(center.x, center.y - dist * 0.85, center.z + (flipHoriz ? dist * 0.72 : -dist * 0.72));
                camera.up.set(0, -1, 0);
            } else {
                camera.position.set(center.x, center.y + dist * 0.85, center.z + dist * 0.72);
                camera.up.set(0, 1, 0);
            }
            camera.lookAt(center);
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
        hiddenDecals.forEach(c => { c.visible = true; });
        renderer.localClippingEnabled = prevClip;
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

// ==========================================
// PROPORTIONAL COMPOSITOR (ALL SCENES + REAL ALPHA SHADOWS + FRONT/BACK!)
// ==========================================

function drawCoasterWithAlphaShadow(ctx, imgA, imgB, regionX, regionY, regionW, regionH, scale, shadowAlpha = 0.45) {
    const drawOne = (img, cx, cy, sz, badgeTxt) => {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.shadowBlur = 38 * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20 * scale;
        ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
        ctx.restore();

        if (badgeTxt) {
            ctx.save();
            const pw = 110 * scale, ph = 26 * scale;
            const bx = cx - pw / 2, by = cy + sz * 0.47;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(bx, by, pw, ph, 13 * scale);
            else ctx.rect(bx, by, pw, ph);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.font = `700 ${Math.round(12 * scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeTxt, cx, by + ph / 2);
            ctx.restore();
        }
    };

    if (imgB) {
        const isPortrait = regionH > regionW * 1.15;
        if (isPortrait) {
            const sz = Math.min(regionW * 0.84, regionH * 0.44);
            drawOne(imgA, regionX + regionW * 0.5, regionY + regionH * 0.27, sz, currentLang === 'fr' ? 'FACE A' : 'FRONT');
            drawOne(imgB, regionX + regionW * 0.5, regionY + regionH * 0.73, sz, currentLang === 'fr' ? 'FACE B' : 'BACK');
        } else {
            const sz = Math.min(regionW * 0.45, regionH * 0.86);
            drawOne(imgA, regionX + regionW * 0.27, regionY + regionH * 0.5, sz, currentLang === 'fr' ? 'FACE A' : 'FRONT');
            drawOne(imgB, regionX + regionW * 0.73, regionY + regionH * 0.5, sz, currentLang === 'fr' ? 'FACE B' : 'BACK');
        }
    } else {
        const sz = Math.min(regionW, regionH) * 0.92;
        drawOne(imgA, regionX + regionW * 0.5, regionY + regionH * 0.5, sz, null);
    }
}

function renderStudioMockup() {
    const canvas = document.getElementById('studio-mockup-canvas');
    if (!canvas) return;
    canvas.width = studioExportWidth;
    canvas.height = studioExportHeight;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const scale = Math.min(W, H) / 1080;

    const brandTitle = (document.getElementById('studio-brand-title')?.value || 'LE PETIT BISTRO').trim();
    const brandSub = (document.getElementById('studio-brand-sub')?.value || 'SCAN FOR MENU & INSTANT WI-FI').trim();
    const frameType = document.getElementById('studio-frame-type')?.value || 'oak';
    const plaqueStyle = document.getElementById('studio-plaque-style')?.value || 'brass';
    const fontChoice = document.getElementById('studio-font-family')?.value || 'luxury';
    const matPaddingMm = parseInt(document.getElementById('slider-mat-padding')?.value || '45', 10);
    const matMarginScale = Math.max(0.46, Math.min(0.84, 0.88 - (matPaddingMm - 20) * 0.005));

    const coasterA = captureStudioCoasterSquare(studioCameraAngle === 'topdown', 'A');
    if (!coasterA) return;
    const showDual = studioShowBothSides && (isDualSided || currentShape === 'tent');
    const coasterB = showDual ? captureStudioCoasterSquare(studioCameraAngle === 'topdown', 'B') : null;

    const plaqueY = H - 78 * scale;

    if (currentStudioScene === 'frame') {
        const wallGrad = ctx.createRadialGradient(W / 2, H / 2, 80 * scale, W / 2, H / 2, Math.max(W, H) * 0.7);
        wallGrad.addColorStop(0, '#111827');
        wallGrad.addColorStop(1, '#030712');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, W, H);

        const fw = W * 0.86;
        const fh = H * 0.86;
        const fx = (W - fw) / 2, fy = (H - fh) / 2;
        const frameThick = 42 * scale;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
        ctx.shadowBlur = 54 * scale;
        ctx.shadowOffsetY = 26 * scale;
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
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.strokeRect(mx, my, mw, mh);

        const regionH = (mh - 120 * scale) * matMarginScale;
        const regionW = mw * matMarginScale;
        const rx = mx + (mw - regionW) / 2;
        const ry = my + ((mh - 110 * scale) - regionH) / 2;

        drawCoasterWithAlphaShadow(ctx, coasterA, coasterB, rx, ry, regionW, regionH, scale, 0.38);
        drawStudioPlaque(ctx, W / 2, my + mh - 66 * scale, brandTitle, brandSub, plaqueStyle, fontChoice, scale, W);
    } else if (currentStudioScene === 'bistro') {
        const plankCount = 7, plankH = H / plankCount;
        for (let i = 0; i < plankCount; i++) {
            const pGrad = ctx.createLinearGradient(0, i * plankH, 0, (i + 1) * plankH);
            pGrad.addColorStop(0, i % 2 === 0 ? '#78350f' : '#854d0e');
            pGrad.addColorStop(1, i % 2 === 0 ? '#451a03' : '#5b2806');
            ctx.fillStyle = pGrad;
            ctx.fillRect(0, i * plankH, W, plankH);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, (i + 1) * plankH - Math.max(2, 2 * scale), W, Math.max(2, 2 * scale));
        }
        // Soft studio vignette spotlight
        const spot = ctx.createRadialGradient(W / 2, H * 0.45, 50 * scale, W / 2, H * 0.45, Math.max(W, H) * 0.65);
        spot.addColorStop(0, 'rgba(255,255,255,0.06)');
        spot.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, W, H);

        drawCoasterWithAlphaShadow(ctx, coasterA, coasterB, W * 0.08, H * 0.06, W * 0.84, H * 0.76, scale, 0.55);
        drawStudioPlaque(ctx, W / 2, plaqueY, brandTitle, brandSub, plaqueStyle, fontChoice, scale, W);
    } else if (currentStudioScene === 'marble') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.beginPath(); ctx.moveTo(0, H * 0.28); ctx.bezierCurveTo(W * 0.35, H * 0.16, W * 0.65, H * 0.72, W, H * 0.48); ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.beginPath(); ctx.moveTo(W * 0.1, H); ctx.bezierCurveTo(W * 0.4, H * 0.6, W * 0.7, H * 0.3, W, H * 0.1); ctx.stroke();

        drawCoasterWithAlphaShadow(ctx, coasterA, coasterB, W * 0.08, H * 0.06, W * 0.84, H * 0.76, scale, 0.72);
        drawStudioPlaque(ctx, W / 2, plaqueY, brandTitle, brandSub, plaqueStyle, fontChoice, scale, W);
    } else if (currentStudioScene === 'desk') {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#1e293b'); g.addColorStop(1, '#0f172a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        drawCoasterWithAlphaShadow(ctx, coasterA, coasterB, W * 0.08, H * 0.06, W * 0.84, H * 0.76, scale, 0.50);
        drawStudioPlaque(ctx, W / 2, plaqueY, brandTitle, brandSub, plaqueStyle, fontChoice, scale, W);
    } else {
        // Architectural CAD Spec Sheet (100% proportionally scaled for 4K, Square, Portrait & Landscape!)
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, W, H);
        const gridStep = Math.max(28, Math.round(44 * scale));
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
        ctx.lineWidth = Math.max(1, 1.2 * scale);
        for (let x = 0; x < W; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        const pad = 42 * scale;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(2, 2.5 * scale);
        ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `700 ${Math.round(22 * scale)}px "Space Mono", "Inter", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('STUDIOS-PRO 3D CAD SPEC SHEET // ' + brandTitle.toUpperCase(), pad + 24 * scale, pad + 22 * scale);

        drawCoasterWithAlphaShadow(ctx, coasterA, coasterB, pad + 30 * scale, pad + 80 * scale, W - (pad + 30 * scale) * 2, H - pad * 2 - 220 * scale, scale, 0.45);

        const m = lastModelMetrics || {};
        ctx.fillStyle = '#f8fafc';
        ctx.font = `600 ${Math.round(16 * scale)}px "Space Mono", "Inter", monospace`;
        const lineH = 26 * scale;
        const baseY = H - pad - lineH * 3.8;
        ctx.fillText(`DIMENSIONS : ${(m.widthMm || 100).toFixed(1)} × ${(m.depthMm || 100).toFixed(1)} × ${(m.heightMm || 3.2).toFixed(1)} mm`, pad + 24 * scale, baseY);
        ctx.fillText(`PRINT MODE : ${isFaceDownMode ? 'FACE-DOWN PEI' : printStyle.toUpperCase()}${useWhiteQuietZone ? ' + WHITE QUIET ZONE' : ''}`, pad + 24 * scale, baseY + lineH);
        ctx.fillText(`ESTIMATE   : ~${(m.gramsTotal || 0).toFixed(1)}g PLA • ~${m.estMinutes || 20} min • ${brandSub}`, pad + 24 * scale, baseY + lineH * 2);
    }
}

function drawStudioPlaque(ctx, cx, cy, title, sub, style, font, scale, canvasW) {
    const pw = Math.min(canvasW * 0.84, 640 * scale);
    const ph = 72 * scale;
    const px = cx - pw / 2, py = cy - ph / 2;
    ctx.save();
    if (style === 'brass') {
        const b = ctx.createLinearGradient(px, py, px + pw, py + ph);
        b.addColorStop(0, '#ca8a04'); b.addColorStop(0.5, '#fef08a'); b.addColorStop(1, '#a16207');
        ctx.fillStyle = b;
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.strokeRect(px + 4 * scale, py + 4 * scale, pw - 8 * scale, ph - 8 * scale);
        ctx.fillStyle = '#1e1b18';
    } else if (style === 'silver') {
        const s = ctx.createLinearGradient(px, py, px + pw, py + ph);
        s.addColorStop(0, '#94a3b8'); s.addColorStop(0.5, '#f8fafc'); s.addColorStop(1, '#64748b');
        ctx.fillStyle = s;
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(15,23,42,0.25)';
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.strokeRect(px + 4 * scale, py + 4 * scale, pw - 8 * scale, ph - 8 * scale);
        ctx.fillStyle = '#0f172a';
    } else if (style === 'emboss') {
        ctx.fillStyle = (currentStudioScene === 'frame' && getHexLuminanceSafe(currentMatColor) > 0.4)
            ? 'rgba(15, 23, 42, 0.72)'
            : 'rgba(248, 250, 252, 0.82)';
    } else {
        ctx.fillStyle = (currentStudioScene === 'frame' && getHexLuminanceSafe(currentMatColor) > 0.5)
            ? '#0f172a'
            : '#ffffff';
    }

    const fontFam = font === 'luxury'
        ? '"Cinzel", Georgia, serif'
        : (font === 'mono' ? '"Space Mono", monospace' : '"Outfit", "Inter", sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(22 * scale)}px ${fontFam}`;
    ctx.fillText(title, cx, cy - 11 * scale);
    ctx.font = `600 ${Math.round(12 * scale)}px ${fontFam}`;
    ctx.fillText(sub, cx, cy + 15 * scale);
    ctx.restore();
}

function getHexLuminanceSafe(hex) {
    const clean = String(hex || '#000000').replace('#', '');
    const rgb = parseInt(clean, 16) || 0;
    const r = ((rgb >> 16) & 255) / 255;
    const g = ((rgb >> 8) & 255) / 255;
    const b = (rgb & 255) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function copyStudioPhotoToClipboard() {
    const canvas = document.getElementById('studio-mockup-canvas');
    if (!canvas) return;
    canvas.toBlob(async blob => {
        if (!blob) return;
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showToast(t('toastPhotoCopied'));
            } else {
                downloadStudioPhoto();
            }
        } catch (_) {
            downloadStudioPhoto();
        }
    }, 'image/png');
}

function downloadStudioPhoto() {
    const canvas = document.getElementById('studio-mockup-canvas');
    if (!canvas) return;
    canvas.toBlob(blob => {
        if (!blob) return;
        downloadBlob(blob, `StudiosPro_Showcase_${currentStudioScene}_${studioExportWidth}x${studioExportHeight}.png`);
        showToast(t('toastPhotoDownloaded'));
    }, 'image/png');
}
