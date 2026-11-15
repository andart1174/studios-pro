// ==========================================
// ⚙️ WEB WORKER: OFF-THREAD BINARY STL PACKING
// ==========================================
function writeStlTriangleToDataView(view, offset, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-12) {
        nx /= len; ny /= len; nz /= len;
    } else {
        nx = 0; ny = 0; nz = 1;
    }
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    view.setFloat32(offset + 12, ax, true);
    view.setFloat32(offset + 16, ay, true);
    view.setFloat32(offset + 20, az, true);
    view.setFloat32(offset + 24, bx, true);
    view.setFloat32(offset + 28, by, true);
    view.setFloat32(offset + 32, bz, true);
    view.setFloat32(offset + 36, cx, true);
    view.setFloat32(offset + 40, cy, true);
    view.setFloat32(offset + 44, cz, true);
    view.setUint16(offset + 48, 0, true);
}

function packBinaryStlBuffer(headerStr, triCount, frameCount, positions, indices, frameFlat) {
    const finalTriCount = triCount + frameCount;
    const buffer = new ArrayBuffer(84 + finalTriCount * 50);
    const view = new DataView(buffer);

    const hdr = String(headerStr || 'Studios-Pro 3D Ultra-HD Watertight Filament Painting').slice(0, 80);
    for (let i = 0; i < hdr.length; i++) view.setUint8(i, hdr.charCodeAt(i));
    view.setUint32(80, finalTriCount, true);

    let offset = 84;
    for (let f = 0; f < triCount; f++) {
        const iA = indices[f * 3] * 3;
        const iB = indices[f * 3 + 1] * 3;
        const iC = indices[f * 3 + 2] * 3;
        writeStlTriangleToDataView(
            view, offset,
            positions[iA], positions[iA + 1], positions[iA + 2],
            positions[iB], positions[iB + 1], positions[iB + 2],
            positions[iC], positions[iC + 1], positions[iC + 2]
        );
        offset += 50;
    }

    for (let fi = 0; fi < frameCount; fi++) {
        const k = fi * 9;
        writeStlTriangleToDataView(
            view, offset,
            frameFlat[k], frameFlat[k + 1], frameFlat[k + 2],
            frameFlat[k + 3], frameFlat[k + 4], frameFlat[k + 5],
            frameFlat[k + 6], frameFlat[k + 7], frameFlat[k + 8]
        );
        offset += 50;
    }

    return buffer;
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.onmessage = function (e) {
        const d = e && e.data;
        if (!d || d.type !== 'PACK_STL') return;
        try {
            const buffer = packBinaryStlBuffer(
                d.headerStr,
                d.triCount || 0,
                d.frameCount || 0,
                d.positions,
                d.indices,
                d.frameFlat
            );
            self.postMessage({ ok: true, id: d.id, buffer }, [buffer]);
        } catch (err) {
            self.postMessage({ ok: false, id: d.id, error: err && err.message ? err.message : String(err) });
        }
    };
}
