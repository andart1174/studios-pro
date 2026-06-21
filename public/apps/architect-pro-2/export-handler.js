/**
 * ArchitectPro — Export Handler (Print & PDF File)
 * Strictly adds new export functionality without modifying original files.
 */

/**
 * Standard browser print dialog
 */
function exportToPrint() {
    window.print();
}

/**
 * Generate and download a PDF file using html2pdf.js
 */
async function exportToPDF() {
    const element = document.getElementById('main-content');
    const projectName = typeof project !== 'undefined' ? `ArchitectPro_${new Date().toISOString().split('T')[0]}` : 'ArchitectPro_Project';

    // Toast notification
    if (typeof showToast === 'function') {
        showToast(typeof lang !== 'undefined' && lang === 'fr' ? '⏳ Générant le PDF haute qualité...' : '⏳ Generating high-quality PDF...', 'info');
    }

    // 1. Capture Canvases as Images (Essential for 3D and to prevent black screens)
    const canvases = element.querySelectorAll('canvas');
    const tempImages = [];

    canvases.forEach(canvas => {
        try {
            // Special handling for 3D Canvas: Force a render frame right now
            if (canvas.id === 'canvas-3d' && window._three3DRenderer && window._three3DScene && window._three3DCamera) {
                window._three3DRenderer.render(window._three3DScene, window._three3DCamera);
            }

            const imgData = canvas.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = imgData;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.className = 'temp-pdf-img';

            // Store original display and insert image
            canvas.style.display = 'none';
            canvas.parentNode.insertBefore(img, canvas);
            tempImages.push({ canvas, img });
        } catch (e) {
            console.warn("Could not capture canvas for PDF:", e);
        }
    });

    // 2. Enforce Vertical Stack and Page Breaks
    const originalStyle = element.getAttribute('style') || '';
    element.classList.add('pdf-export-mode');

    const opt = {
        margin: [10, 10],
        filename: `${projectName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            allowTaint: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        // Generate PDF
        await html2pdf().set(opt).from(element).save();

        if (typeof showToast === 'function') {
            showToast(typeof lang !== 'undefined' && lang === 'fr' ? '✅ PDF prêt!' : '✅ PDF ready!', 'success');
        }
    } catch (err) {
        console.error("PDF Generation error:", err);
        if (typeof showToast === 'function') {
            showToast('❌ PDF export failed', 'error');
        }
    } finally {
        // 3. Cleanup
        element.classList.remove('pdf-export-mode');
        tempImages.forEach(({ canvas, img }) => {
            canvas.style.display = '';
            if (img.parentNode) img.parentNode.removeChild(img);
        });
    }
}

/**
 * Exporter functions for 3D model formats
 */
function exportGLB() {
    if (!window.THREE || !window.THREE.GLTFExporter) {
        alert('GLTFExporter not loaded.');
        return;
    }
    if (!window._three3DScene) {
        alert('3D scene not ready.');
        return;
    }
    const exporter = new THREE.GLTFExporter();
    const options = { binary: true };
    const callback = function (result) {
        const blob = (result instanceof ArrayBuffer) ?
            new Blob([result], { type: 'application/octet-stream' }) :
            new Blob([JSON.stringify(result)], { type: 'application/json' });
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = URL.createObjectURL(blob);
        link.download = 'architect_project.glb';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const onError = function (err) {
        console.error(err);
    };

    if (exporter.parse.length === 4 || (window.THREE.REVISION && parseInt(window.THREE.REVISION) >= 135)) {
        exporter.parse(window._three3DScene, callback, onError, options);
    } else {
        exporter.parse(window._three3DScene, callback, options);
    }
}

function exportSTL() {
    if (!window.THREE || !window.THREE.STLExporter) {
        alert('STLExporter not loaded.');
        return;
    }
    if (!window._three3DScene) {
        alert('3D scene not ready.');
        return;
    }
    const exporter = new THREE.STLExporter();
    const stlString = exporter.parse(window._three3DScene);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = URL.createObjectURL(blob);
    link.download = 'architect_project.stl';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportOBJ() {
    if (!window.THREE || !window.THREE.OBJExporter) {
        alert('OBJExporter not loaded.');
        return;
    }
    if (!window._three3DScene) {
        alert('3D scene not ready.');
        return;
    }
    const exporter = new THREE.OBJExporter();
    const result = exporter.parse(window._three3DScene);
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = URL.createObjectURL(blob);
    link.download = 'architect_project.obj';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
