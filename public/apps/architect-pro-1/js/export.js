// export.js

window.Exporter = {

    saveFile(blob, filename) {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportGLB() {
        if (!window.THREE || !window.THREE.GLTFExporter) {
            alert('GLTFExporter not loaded.');
            return;
        }
        const exporter = new THREE.GLTFExporter();
        exporter.parse(
            Engine3D.scene,
            function (gltf) {
                const blob = new Blob([gltf], { type: 'application/octet-stream' });
                Exporter.saveFile(blob, 'architect_project.glb');
            },
            { binary: true }
        );
    },

    exportSTL() {
        if (!window.THREE || !window.THREE.STLExporter) {
            alert('STLExporter not loaded.');
            return;
        }
        const exporter = new THREE.STLExporter();
        const stlString = exporter.parse(Engine3D.scene);
        const blob = new Blob([stlString], { type: 'text/plain' });
        Exporter.saveFile(blob, 'architect_project.stl');
    },

    exportOBJ() {
        if (!window.THREE || !window.THREE.OBJExporter) {
            alert('OBJExporter not loaded.');
            return;
        }
        const exporter = new THREE.OBJExporter();
        const result = exporter.parse(Engine3D.scene);
        const blob = new Blob([result], { type: 'text/plain' });
        Exporter.saveFile(blob, 'architect_project.obj');
    },

    exportJSON(stateElements) {
        const dataStr = JSON.stringify(stateElements, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        Exporter.saveFile(blob, 'architect_project.json');
    },

    async exportPDF() {
        if (!window.jspdf) {
            alert('jsPDF library not loaded.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4'); // A4 landscape

        // Title and Date
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("Professional Architecture Quote", 20, 20);

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

        // Fetch Total Quote
        let total = "0.00";
        if (window.PricingEngine) {
            total = document.getElementById('totalPriceBadge').innerText || '$0.00';
        }

        doc.setFontSize(16);
        doc.setTextColor(16, 185, 129); // Green tint
        doc.text(`Total Estimated Cost: ${total}`, 20, 40);

        // Force a fresh render
        if (window.Editor2D) Editor2D.draw();
        if (window.Engine3D) Engine3D.render();

        try {
            // Grab 2D Canvas Image
            const canvas2D = document.getElementById('canvas2D');
            const img2D = canvas2D.toDataURL('image/png');

            // Grab 3D Canvas Image
            const canvas3D = document.getElementById('canvas3D');
            const img3D = canvas3D.toDataURL('image/png');

            // Draw Images side by side (A4 landscape is 297 x 210 mm)
            // Left half for 2D, Right half for 3D
            doc.addImage(img2D, 'PNG', 15, 50, 130, 100);
            doc.rect(15, 50, 130, 100); // border

            doc.addImage(img3D, 'PNG', 155, 50, 130, 100);
            doc.rect(155, 50, 130, 100); // border

            // Details/Disclaimer
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text("This document is a generated estimate and 3D preview. Final costs may vary.", 20, 160);

            doc.save('architect_quote.pdf');

        } catch (e) {
            console.error(e);
            alert("Could not generate PDF images. Please try again.");
        }
    },

    async exportHighResRender() {
        if (!window.Engine3D) return;

        // Save old settings
        const originalPixelRatio = Engine3D.renderer.getPixelRatio();
        const width = Engine3D.container.clientWidth;
        const height = Engine3D.container.clientHeight;

        // Temporarily boost pixel ratio to render at 4x resolution
        Engine3D.renderer.setPixelRatio(4.0);
        // Ensure standard shadows are baked properly
        Engine3D.render();

        // Extract PNG
        const canvas3D = document.getElementById('canvas3D');
        const imgData = canvas3D.toDataURL('image/png', 1.0);

        // Restore original settings
        Engine3D.renderer.setPixelRatio(originalPixelRatio || window.devicePixelRatio || 1);
        Engine3D.render();

        try {
            // Convert to Blob and download
            const res = await fetch(imgData);
            const blob = await res.blob();
            Exporter.saveFile(blob, 'architect_high_res_render.png');
        } catch (e) {
            console.error(e);
            alert("Failed to export High-Res render.");
        }
    },

    async exportVideoTour() {
        if (!window.Engine3D || !window.Editor2D) return;

        const nodes = STATE.elements.filter(e => e.type === 'cameraNode');
        if (nodes.length < 2) {
            alert('Please add at least 2 Camera Nodes (Tour Path tool) to the project first.');
            return;
        }

        // Hide export modal to see recording
        const exportModal = document.getElementById('exportModal');
        if (exportModal) exportModal.style.display = 'none';

        // Trigger engine3d recording process
        Engine3D.startVideoTour(nodes);
    }

};

// Bind Export Buttons UI
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('doExportGLB')?.addEventListener('click', () => Exporter.exportGLB());
    document.getElementById('doExportSTL')?.addEventListener('click', () => Exporter.exportSTL());
    document.getElementById('doExportOBJ')?.addEventListener('click', () => Exporter.exportOBJ());
    document.getElementById('doExportHR')?.addEventListener('click', () => Exporter.exportHighResRender());
    document.getElementById('doExportVideo')?.addEventListener('click', () => Exporter.exportVideoTour());
    document.getElementById('doExportJSON')?.addEventListener('click', () => Exporter.exportJSON(STATE.elements));
    document.getElementById('doExportPDF')?.addEventListener('click', () => Exporter.exportPDF());
});
