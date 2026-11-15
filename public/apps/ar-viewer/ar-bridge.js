/**
 * Studios-Pro Unified AR Bridge (`window.StudiosProAR`)
 * Connects any studio in `/apps/*` to AR Viewer 3D cleanly using zero-copy binary buffers,
 * placement hints (`wall` | `floor`), physical dimensions (mm), and automatic GLTF/STL extraction.
 */
(function (global) {
  'use strict';

  function toArrayBufferOrBlob(data) {
    if (!data) return null;
    if (typeof Blob !== 'undefined' && data instanceof Blob) return data;
    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) return data;
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(data)) {
      if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
        return data.buffer;
      }
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    return data;
  }

  function makeTransferId(prefix) {
    return (prefix || 'ar') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function postOpenARViewer(options) {
    const opts = options || {};
    const raw = toArrayBufferOrBlob(opts.modelData);
    if (!raw) {
      console.warn('[StudiosProAR] Missing modelData payload');
      return false;
    }

    const transferId = opts.transferId || makeTransferId(opts.sourceStudio || 'studio');
    const extension = (opts.extension || (typeof raw === 'string' ? 'obj' : 'glb')).toLowerCase();
    const isBinary = opts.isBinary !== undefined ? !!opts.isBinary : (typeof raw !== 'string');
    const name = opts.name || ('StudiosPro_Model.' + extension);
    const placement = opts.placement === 'wall' ? 'wall' : 'floor';
    const dimensionsMm = opts.dimensionsMm || null;
    const autoScale = opts.autoScale === 'fixed' ? 'fixed' : 'auto';
    const sourceStudio = opts.sourceStudio || '';

    const message = {
      type: 'OPEN_AR_VIEWER',
      payload: {
        transferId,
        modelData: raw,
        name,
        extension,
        isBinary,
        placement,
        dimensionsMm,
        autoScale,
        sourceStudio
      }
    };

    const inIframe = (global.parent && global.parent !== global);
    if (inIframe) {
      // Do NOT duplicate via BroadcastChannel AND parent.postMessage simultaneously;
      // App.jsx handles OPEN_AR_VIEWER and forwards cleanly once ready.
      try {
        if (typeof global.studiosProPostToHost === 'function') {
          global.studiosProPostToHost(message);
        } else {
          global.parent.postMessage(message, '*');
        }
        return true;
      } catch (err) {
        console.warn('[StudiosProAR] postMessage failed, trying fallback:', err);
      }
    }

    // Standalone window fallback: store via BroadcastChannel or trigger direct file download
    const blob = raw instanceof Blob
      ? raw
      : new Blob([raw], { type: extension === 'glb' ? 'model/gltf-binary' : 'application/octet-stream' });

    try {
      const ch = new BroadcastChannel('studios_pro_channel');
      const win = global.open('/apps/ar-viewer/index.html?placement=' + encodeURIComponent(placement), '_blank');
      if (win) {
        let sent = false;
        const push = () => {
          if (sent) return;
          sent = true;
          ch.postMessage({
            type: 'LOAD_EXTERNAL_FILE',
            payload: { transferId, name, extension, data: raw, isBinary, placement, dimensionsMm, autoScale, sourceStudio }
          });
          setTimeout(() => ch.close(), 1500);
        };
        ch.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'AR_VIEWER_READY') push();
        };
        setTimeout(push, 700);
        return true;
      }
      ch.close();
    } catch (_) {}

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }

  function isHelperObject(obj) {
    if (!obj) return false;
    if (obj.isGridHelper || obj.isAxesHelper || obj.isBoxHelper || obj.isCamera || obj.isLight || obj.isTransformControls) return true;
    if (obj.userData && obj.userData.isHelper) return true;
    const n = (obj.name || '').toLowerCase();
    return n.includes('helper') || n.includes('grid') || n.includes('gizmo');
  }

  function cloneCleanMeshTree(sourceObj) {
    const cleanRoot = new global.THREE.Group();
    sourceObj.updateMatrixWorld(true);
    sourceObj.traverse((child) => {
      if (!child.isMesh || !child.geometry || !child.visible) return;
      let p = child;
      while (p) {
        if (p.visible === false || isHelperObject(p)) return;
        p = p.parent;
      }
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);
      const mat = Array.isArray(child.material)
        ? child.material.map(m => (m && m.clone ? m.clone() : m))
        : (child.material && child.material.clone ? child.material.clone() : new global.THREE.MeshStandardMaterial({ color: 0xcccccc }));
      const mesh = new global.THREE.Mesh(geo, mat);
      mesh.name = child.name || 'part';
      cleanRoot.add(mesh);
    });
    cleanRoot.updateMatrixWorld(true);
    return cleanRoot;
  }

  function measureObjectMm(root, unit) {
    if (!global.THREE || !root) return null;
    try {
      const cleanTree = cloneCleanMeshTree(root);
      const target = cleanTree.children.length > 0 ? cleanTree : root;
      target.updateMatrixWorld(true);
      const box = new global.THREE.Box3().setFromObject(target);
      if (box.isEmpty()) return null;
      const sz = new global.THREE.Vector3();
      box.getSize(sz);
      const maxD = Math.max(sz.x, sz.y, sz.z);
      const mul = unit === 'm' ? 1000 : (unit === 'mm' ? 1 : (maxD > 5.0 ? 1 : 1000));
      return {
        x: Math.round(sz.x * mul * 10) / 10,
        y: Math.round(sz.y * mul * 10) / 10,
        z: Math.round(sz.z * mul * 10) / 10
      };
    } catch (_) {
      return null;
    }
  }

  function normalizeGroupForGLB(sourceObj, unit) {
    const cleanTree = cloneCleanMeshTree(sourceObj);
    const clone = cleanTree.children.length > 0 ? cleanTree : sourceObj.clone(true);
    clone.updateMatrixWorld(true);
    const box = new global.THREE.Box3().setFromObject(clone);
    if (box.isEmpty()) return clone;
    const size = new global.THREE.Vector3();
    const center = new global.THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxD = Math.max(size.x, size.y, size.z, 0.001);
    const scale = unit === 'm' ? 1.0 : (unit === 'mm' ? 0.001 : (maxD > 5.0 ? 0.001 : 1.0));

    const wrapper = new global.THREE.Group();
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.scale.multiplyScalar(scale);
    wrapper.add(clone);
    wrapper.updateMatrixWorld(true);
    return wrapper;
  }

  function exportSceneAndOpenAR(targetObject, options) {
    const opts = options || {};
    if (!targetObject) {
      alert('No 3D model available in scene for AR preview.');
      return Promise.resolve(false);
    }

    const unit = opts.unit || 'auto';
    const dimsMm = opts.dimensionsMm || measureObjectMm(targetObject, unit);

    if (global.THREE && global.THREE.GLTFExporter) {
      return new Promise((resolve) => {
        try {
          const exporter = new global.THREE.GLTFExporter();
          const exportObj = opts.skipNormalize ? targetObject : normalizeGroupForGLB(targetObject, unit);
          const gltfOpts = { binary: true };

          const onSuccess = (res) => {
            const isBin = (res instanceof ArrayBuffer) || (res && typeof res.byteLength === 'number');
            const modelData = isBin ? res : JSON.stringify(res);
            const ext = isBin ? 'glb' : 'gltf';
            const ok = postOpenARViewer({
              modelData,
              extension: ext,
              isBinary: isBin,
              name: (opts.name || 'StudiosPro_AR_Model').replace(/\.(glb|gltf|stl|obj)$/i, '') + '.' + ext,
              placement: opts.placement || 'floor',
              dimensionsMm: dimsMm,
              autoScale: opts.autoScale || 'auto',
              sourceStudio: opts.sourceStudio || ''
            });
            resolve(ok);
          };

          const onError = (err) => {
            console.warn('[StudiosProAR] GLTFExporter failed, trying STLExporter:', err);
            resolve(fallbackSTL(targetObject, dimsMm, opts));
          };

          if (exporter.parse.length === 4 || (global.THREE.REVISION && parseInt(global.THREE.REVISION, 10) >= 135)) {
            exporter.parse(exportObj, onSuccess, onError, gltfOpts);
          } else {
            exporter.parse(exportObj, onSuccess, gltfOpts);
          }
        } catch (err) {
          console.warn('[StudiosProAR] export error:', err);
          resolve(fallbackSTL(targetObject, dimsMm, opts));
        }
      });
    }

    return Promise.resolve(fallbackSTL(targetObject, dimsMm, opts));
  }

  function fallbackSTL(targetObject, dimsMm, opts) {
    if (global.THREE && global.THREE.STLExporter) {
      try {
        const stlExporter = new global.THREE.STLExporter();
        const raw = stlExporter.parse(targetObject, { binary: true });
        return postOpenARViewer({
          modelData: toArrayBufferOrBlob(raw),
          extension: 'stl',
          isBinary: true,
          name: (opts.name || 'StudiosPro_AR_Model').replace(/\.(glb|gltf|stl|obj)$/i, '') + '.stl',
          placement: opts.placement || 'floor',
          dimensionsMm: dimsMm,
          autoScale: opts.autoScale || 'auto',
          sourceStudio: opts.sourceStudio || ''
        });
      } catch (err) {
        console.error('[StudiosProAR] STLExporter fallback failed:', err);
      }
    }
    return false;
  }

  global.StudiosProAR = {
    sendModel: postOpenARViewer,
    exportSceneAndOpenAR: exportSceneAndOpenAR,
    measureObjectMm: measureObjectMm
  };
})(window);
