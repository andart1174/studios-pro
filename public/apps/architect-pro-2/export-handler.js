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
