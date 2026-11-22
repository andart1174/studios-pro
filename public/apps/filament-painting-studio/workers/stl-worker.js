// ==========================================
// OFF-THREAD BINARY STL WORKER (32-BIT FLOAT TRANSFERABLE PACKER)
// ==========================================

function writeStlTriangle(view, offset, x1, y1, z1, x2, y2, z2, x3, y3, z3) {
    const ux = x2 - x1, uy = y2 - y1, uz = z2 - z1;
    const vx = x3 - x1, vy = y3 - y1, vz = z3 - z1;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-12) { nx /= len; ny /= len; nz /= len; }
    else { nx = 0; ny = 0; nz = 1; }

    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);

    view.setFloat32(offset + 12, x1, true);
    view.setFloat32(offset + 16, y1, true);
    view.setFloat32(offset + 20, z1, true);

    view.setFloat32(offset + 24, x2, true);
    view.setFloat32(offset + 28, y2, true);
    view.setFloat32(offset + 32, z2, true);

    view.setFloat32(offset + 36, x3, true);
    view.setFloat32(offset + 40, y3, true);
    view.setFloat32(offset + 44, z3, true);

    view.setUint16(offset + 48, 0, true);
}

self.onmessage = function(e) {
    const msg = e.data || {};
    if (msg.type !== 'PACK_STL') return;

    try {
        const { id, headerStr, triCount, frameCount, positions, indices, frameFlat } = msg;
        const totalTris = (triCount || 0) + (frameCount || 0);
        const buffer = new ArrayBuffer(84 + totalTris * 50);
        const view = new DataView(buffer);

        const hdr = String(headerStr || 'Studios-Pro 3D Filament Painting');
        for (let i = 0; i < hdr.length && i < 80; i++) {
            view.setUint8(i, hdr.charCodeAt(i) & 0x7F);
        }
        view.setUint32(80, totalTris, true);

        let offset = 84;
        for (let f = 0; f < triCount; f++) {
            const iA = indices[f * 3] * 3;
            const iB = indices[f * 3 + 1] * 3;
            const iC = indices[f * 3 + 2] * 3;
            writeStlTriangle(
                view, offset,
                positions[iA], positions[iA + 1], positions[iA + 2],
                positions[iB], positions[iB + 1], positions[iB + 2],
                positions[iC], positions[iC + 1], positions[iC + 2]
            );
            offset += 50;
        }

        for (let fi = 0; fi < frameCount; fi++) {
            const k = fi * 9;
            writeStlTriangle(
                view, offset,
                frameFlat[k], frameFlat[k + 1], frameFlat[k + 2],
                frameFlat[k + 3], frameFlat[k + 4], frameFlat[k + 5],
                frameFlat[k + 6], frameFlat[k + 7], frameFlat[k + 8]
            );
            offset += 50;
        }

        self.postMessage({ id, ok: true, buffer }, [buffer]);
    } catch (err) {
        self.postMessage({ id: msg.id, ok: false, error: String(err && err.message ? err.message : err) });
    }
};
