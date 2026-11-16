/**
 * Dedicated Web Worker for New 3D 4D Studio Ultra
 * Executes high-resolution distance-field & super-sampled sculpting off the UI thread
 * with zero-copy Transferable ArrayBuffer results.
 */
'use strict';

importScripts('../engine3d.js');

self.onmessage = function (e) {
  const { id, imageData, opts } = e.data;
  try {
    const result = Engine3D.generate(imageData, opts, (prog, msg) => {
      self.postMessage({ type: 'progress', id, prog, msg });
    });

    const transferList = [
      result.stlBuffer,
      result.hmap.buffer,
      result.mesh.verts.buffer,
      result.mesh.baseFlatVerts.buffer,
      result.mesh.uvs.buffer,
      result.mesh.normals.buffer,
      result.mesh.indices.buffer,
    ];
    if (result.mesh.backVerts) {
      transferList.push(result.mesh.backVerts.buffer);
    }
    if (result.vertexColors) {
      transferList.push(result.vertexColors.buffer);
    }

    self.postMessage({ type: 'done', id, result }, transferList);
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err && err.message ? err.message : String(err) });
  }
};
