(function() {
    if (typeof window.lucide === 'undefined') {
        window.lucide = { createIcons: function() {} };
    }
    const _crcTable = (function() {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c >>> 0;
        }
        return t;
    })();
    function _crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = _crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function _toBytes(data, opts) {
        if (data instanceof Uint8Array) return data;
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        if (typeof data === 'string') {
            if (opts && opts.base64) {
                const bin = atob(data);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                return arr;
            }
            return new TextEncoder().encode(data);
        }
        return new Uint8Array(0);
    }
    class MinimalStoreZip {
        constructor(prefix = '', root = null) {
            this._prefix = prefix;
            this._root = root || this;
            if (!root) this._entries = [];
        }
        folder(name) {
            const clean = String(name || '').replace(/^\/+|\/+$/g, '');
            return new MinimalStoreZip(clean ? `${this._prefix}${clean}/` : this._prefix, this._root);
        }
        file(name, data, opts) {
            const fullPath = `${this._prefix}${String(name || '')}`;
            const bytes = _toBytes(data, opts);
            this._root._entries.push({ pathBytes: new TextEncoder().encode(fullPath), bytes, crc: _crc32(bytes) });
            return this;
        }
        async generateAsync(options) {
            const entries = this._root._entries || [];
            const localParts = [];
            const centralParts = [];
            let offset = 0;
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                const nLen = e.pathBytes.length;
                const dLen = e.bytes.length;
                const lh = new Uint8Array(30 + nLen);
                const lv = new DataView(lh.buffer);
                lv.setUint32(0, 0x04034B50, true);
                lv.setUint16(4, 20, true);
                lv.setUint16(6, 0x0800, true);
                lv.setUint16(8, 0, true);
                lv.setUint32(14, e.crc, true);
                lv.setUint32(18, dLen, true);
                lv.setUint32(22, dLen, true);
                lv.setUint16(26, nLen, true);
                lh.set(e.pathBytes, 30);
                localParts.push(lh, e.bytes);

                const ch = new Uint8Array(46 + nLen);
                const cv = new DataView(ch.buffer);
                cv.setUint32(0, 0x02014B50, true);
                cv.setUint16(4, 20, true);
                cv.setUint16(6, 20, true);
                cv.setUint16(8, 0x0800, true);
                cv.setUint16(10, 0, true);
                cv.setUint32(16, e.crc, true);
                cv.setUint32(20, dLen, true);
                cv.setUint32(24, dLen, true);
                cv.setUint16(28, nLen, true);
                cv.setUint32(42, offset, true);
                ch.set(e.pathBytes, 46);
                centralParts.push(ch);

                offset += lh.length + dLen;
            }
            let cSize = 0;
            for (let i = 0; i < centralParts.length; i++) cSize += centralParts[i].length;
            const eocd = new Uint8Array(22);
            const ev = new DataView(eocd.buffer);
            ev.setUint32(0, 0x06054B50, true);
            ev.setUint16(8, entries.length, true);
            ev.setUint16(10, entries.length, true);
            ev.setUint32(12, cSize, true);
            ev.setUint32(16, offset, true);

            const allParts = [...localParts, ...centralParts, eocd];
            if (options && options.type === 'uint8array') {
                const total = allParts.reduce((s, p) => s + p.length, 0);
                const out = new Uint8Array(total);
                let p = 0;
                allParts.forEach(part => { out.set(part, p); p += part.length; });
                return out;
            }
            return new Blob(allParts, { type: 'application/zip' });
        }
    }
    window.MinimalStoreZip = MinimalStoreZip;
})();
