/**
 * PolyMorph 3D Studio - CAD Inspector & Geometry Analytics
 */
class CADInspector {
  /**
   * Analyzes an Object3D / Mesh and computes CAD metrics
   * @param {THREE.Object3D} object 
   * @returns {Object} stats
   */
  static analyze(object) {
    let triangleCount = 0;
    let vertexCount = 0;
    let totalSurfaceArea = 0;
    let totalVolume = 0;

    const box = new THREE.Box3();
    box.setFromObject(object);

    const size = new THREE.Vector3();
    box.getSize(size);

    const center = new THREE.Vector3();
    box.getCenter(center);

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const cross = new THREE.Vector3();

    object.updateMatrixWorld(true);

    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry;
        const pos = geo.attributes.position;
        const index = geo.index;
        const matrix = child.matrixWorld;

        if (!pos) return;

        vertexCount += pos.count;
        const numTriangles = index ? index.count / 3 : pos.count / 3;
        triangleCount += numTriangles;

        for (let i = 0; i < numTriangles; i++) {
          let iA, iB, iC;
          if (index) {
            iA = index.getX(i * 3);
            iB = index.getX(i * 3 + 1);
            iC = index.getX(i * 3 + 2);
          } else {
            iA = i * 3;
            iB = i * 3 + 1;
            iC = i * 3 + 2;
          }

          vA.fromBufferAttribute(pos, iA).applyMatrix4(matrix);
          vB.fromBufferAttribute(pos, iB).applyMatrix4(matrix);
          vC.fromBufferAttribute(pos, iC).applyMatrix4(matrix);

          // Surface Area
          ab.subVectors(vB, vA);
          ac.subVectors(vC, vA);
          cross.crossVectors(ab, ac);
          totalSurfaceArea += cross.length() * 0.5;

          // Signed Volume (Divergence Theorem)
          totalVolume += (vA.x * (vB.y * vC.z - vB.z * vC.y) -
                          vA.y * (vB.x * vC.z - vB.z * vC.x) +
                          vA.z * (vB.x * vC.y - vB.y * vC.x)) / 6.0;
        }
      }
    });

    return {
      triangles: triangleCount,
      vertices: vertexCount,
      dimensions: {
        x: Math.abs(size.x),
        y: Math.abs(size.y),
        z: Math.abs(size.z)
      },
      boundingBox: box,
      center: center,
      volume: Number.isFinite(totalVolume) ? Math.abs(totalVolume) : 0,
      surfaceArea: Number.isFinite(totalSurfaceArea) ? totalSurfaceArea : 0
    };
  }

  /**
   * Resets root node transform to identity without destroying child hierarchy
   * @param {THREE.Object3D} object 
   */
  static resetNodeTransforms(object) {
    if (!object) return;
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.updateMatrix();
    object.updateMatrixWorld(true);
  }

  /**
   * Centers object at world origin (0,0,0) preserving hierarchy
   * @param {THREE.Object3D} object 
   */
  static centerObject(object) {
    if (!object) return;
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    box.getCenter(center);

    if (object.isMesh && object.geometry) {
      const transMat = new THREE.Matrix4().makeTranslation(-center.x, 0, -center.z);
      object.geometry.applyMatrix4(transMat);
      if (object.geometry.attributes.position) {
        object.geometry.attributes.position.needsUpdate = true;
      }
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    } else {
      object.position.x -= center.x;
      object.position.z -= center.z;
    }
    object.updateMatrixWorld(true);
  }

  /**
   * Auto-grounds object so bottom sits exactly at Y = 0 preserving hierarchy
   * @param {THREE.Object3D} object 
   */
  static autoGround(object) {
    if (!object) return;
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const offsetY = -box.min.y;

    if (object.isMesh && object.geometry) {
      const transMat = new THREE.Matrix4().makeTranslation(0, offsetY, 0);
      object.geometry.applyMatrix4(transMat);
      if (object.geometry.attributes.position) {
        object.geometry.attributes.position.needsUpdate = true;
      }
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    } else {
      object.position.y += offsetY;
    }
    object.updateMatrixWorld(true);
  }

  /**
   * Inverts mesh vertex normals
   * @param {THREE.Object3D} object 
   */
  static invertNormals(object) {
    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const normals = child.geometry.attributes.normal;
        if (normals) {
          for (let i = 0; i < normals.count; i++) {
            normals.setXYZ(i, -normals.getX(i), -normals.getY(i), -normals.getZ(i));
          }
          normals.needsUpdate = true;
        }
      }
    });
  }

  /**
   * Multiplies object scale and bakes into geometry
   * @param {THREE.Object3D} object 
   * @param {number} factor 
   */
  static scaleObject(object, factor) {
    CADInspector.resetNodeTransforms(object);
    const scaleMat = new THREE.Matrix4().makeScale(factor, factor, factor);
    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.applyMatrix4(scaleMat);
        if (child.geometry.attributes.position) {
          child.geometry.attributes.position.needsUpdate = true;
        }
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
    });
    CADInspector.centerObject(object);
    CADInspector.autoGround(object);
  }

  /**
   * Rotates object around X, Y, or Z axis by given angle in degrees and bakes vertices
   * @param {THREE.Object3D} object 
   * @param {string} axis - 'x', 'y', 'z'
   * @param {number} angleDeg - e.g. 90, -90, 180
   */
  static rotateObject(object, axis = 'x', angleDeg = 90) {
    CADInspector.resetNodeTransforms(object);
    const rad = (angleDeg * Math.PI) / 180;
    const rotMat = new THREE.Matrix4();
    if (axis === 'x') rotMat.makeRotationX(rad);
    else if (axis === 'y') rotMat.makeRotationY(rad);
    else if (axis === 'z') rotMat.makeRotationZ(rad);
    
    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.applyMatrix4(rotMat);
        if (child.geometry.attributes.position) {
          child.geometry.attributes.position.needsUpdate = true;
        }
        child.geometry.computeVertexNormals();
        if (child.geometry.attributes.normal) {
          child.geometry.attributes.normal.needsUpdate = true;
        }
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
    });

    CADInspector.centerObject(object);
    CADInspector.autoGround(object);
  }

  /**
   * Automatically stands the model upright for AR / Vertical Display (facing the camera)
   * @param {THREE.Object3D} object 
   */
  static standUpright(object) {
    CADInspector.resetNodeTransforms(object);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);

    // If thickness is along Y (flat on floor, height along Z)
    if (size.y <= size.z && size.y <= size.x) {
      // Rotate -90 on X so Z (height) becomes +Y (vertical upright)
      CADInspector.rotateObject(object, 'x', -90);
    } else if (size.x <= size.y && size.x <= size.z) {
      // Thickness is along X
      CADInspector.rotateObject(object, 'z', 90);
    } else {
      CADInspector.rotateObject(object, 'x', -90);
    }
  }

  /**
   * Scales the 3D model for optimal mobile AR viewing (in meters)
   * @param {THREE.Object3D} object 
   * @param {number} targetHeightMeters - e.g. 0.30 (30 cm) or 0.50 (50 cm)
   */
  static scaleForAR(object, targetHeightMeters = 0.30) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const currentMax = Math.max(size.x, size.y, size.z) || 1;
    
    // Scale factor to reach 300mm / 30cm in AR
    const factor = (targetHeightMeters * 1000) / currentMax;
    CADInspector.scaleObject(object, factor);
  }

  /**
   * Automatically isolates the 3D model/character by removing the flat background/base plate.
   * @param {THREE.Object3D} object 
   * @param {number} cutoffRatio - 0.0 to 0.9 (default 0.25 / 25% of thickness)
   * @param {Object} options - { axis, removeDark }
   * @returns {number} totalTrianglesRemoved
   */
  static removeBasePlate(object, cutoffRatio = 0.25, options = {}) {
    let totalTrianglesRemoved = 0;

    object.updateMatrixWorld(true);

    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        let geo = child.geometry;
        if (geo.index) {
          geo = geo.toNonIndexed();
        }

        geo.computeBoundingBox();
        const localBox = geo.boundingBox;
        if (!localBox) return;

        const size = new THREE.Vector3();
        localBox.getSize(size);

        // Determine axis (default to the smallest dimension, usually Y or Z)
        let axis = options.axis;
        if (!axis) {
          if (size.y <= size.x && size.y <= size.z) axis = 'y';
          else if (size.z <= size.x && size.z <= size.y) axis = 'z';
          else axis = 'x';
        }

        const minVal = localBox.min[axis];
        const maxVal = localBox.max[axis];
        const totalHeight = Math.max(maxVal - minVal, 0.0001);

        // Cutoff threshold elevation
        const cutoff = minVal + totalHeight * cutoffRatio;

        const posAttr = geo.attributes.position;
        const normAttr = geo.attributes.normal;
        const uvAttr = geo.attributes.uv;
        const colorAttr = geo.attributes.color;

        if (!posAttr) return;
        const numTriangles = posAttr.count / 3;
        if (numTriangles === 0) return;

        const newPositions = [];
        const newNormals = [];
        const newUvs = [];
        const newColors = [];

        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();

        for (let i = 0; i < numTriangles; i++) {
          const iA = i * 3;
          const iB = i * 3 + 1;
          const iC = i * 3 + 2;

          vA.fromBufferAttribute(posAttr, iA);
          vB.fromBufferAttribute(posAttr, iB);
          vC.fromBufferAttribute(posAttr, iC);

          const hA = vA[axis];
          const hB = vB[axis];
          const hC = vC[axis];
          const avgH = (hA + hB + hC) / 3.0;

          // 1. If at least 2 vertices or the average height is below cutoff -> Discard base plate triangle!
          let countBelow = 0;
          if (hA <= cutoff) countBelow++;
          if (hB <= cutoff) countBelow++;
          if (hC <= cutoff) countBelow++;

          if (countBelow >= 2 || avgH <= cutoff) {
            totalTrianglesRemoved++;
            continue;
          }

          // 2. Planar Bottom Surface Filter (flat base plate triangles on bottom boundary)
          const eps = totalHeight * 0.04 + 0.02;
          if (Math.abs(hA - minVal) < eps && Math.abs(hB - minVal) < eps && Math.abs(hC - minVal) < eps) {
            totalTrianglesRemoved++;
            continue;
          }

          // 3. Optional Dark Background Filter
          if (options.removeDark && colorAttr) {
            const rA = colorAttr.getX(iA), gA = colorAttr.getY(iA), bA = colorAttr.getZ(iA);
            const rB = colorAttr.getX(iB), gB = colorAttr.getY(iB), bB = colorAttr.getZ(iB);
            const rC = colorAttr.getX(iC), gC = colorAttr.getY(iC), bC = colorAttr.getZ(iC);
            const lumAvg = ((rA + rB + rC) * 0.299 + (gA + gB + gC) * 0.587 + (bA + bB + bC) * 0.114) / 3.0;
            if (lumAvg < 0.15 && avgH < minVal + totalHeight * 0.4) {
              totalTrianglesRemoved++;
              continue;
            }
          }

          newPositions.push(vA.x, vA.y, vA.z);
          newPositions.push(vB.x, vB.y, vB.z);
          newPositions.push(vC.x, vC.y, vC.z);

          if (normAttr) {
            newNormals.push(
              normAttr.getX(iA), normAttr.getY(iA), normAttr.getZ(iA),
              normAttr.getX(iB), normAttr.getY(iB), normAttr.getZ(iB),
              normAttr.getX(iC), normAttr.getY(iC), normAttr.getZ(iC)
            );
          }

          if (uvAttr) {
            newUvs.push(
              uvAttr.getX(iA), uvAttr.getY(iA),
              uvAttr.getX(iB), uvAttr.getY(iB),
              uvAttr.getX(iC), uvAttr.getY(iC)
            );
          }

          if (colorAttr) {
            newColors.push(
              colorAttr.getX(iA), colorAttr.getY(iA), colorAttr.getZ(iA),
              colorAttr.getX(iB), colorAttr.getY(iB), colorAttr.getZ(iB),
              colorAttr.getX(iC), colorAttr.getY(iC), colorAttr.getZ(iC)
            );
          }
        }

        if (newPositions.length > 0) {
          const newGeo = new THREE.BufferGeometry();
          newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
          if (newNormals.length === newPositions.length) {
            newGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
          }
          if (newUvs.length > 0) {
            newGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
          }
          if (newColors.length > 0) {
            newGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
          }
          newGeo.computeVertexNormals();
          child.geometry.dispose();
          child.geometry = newGeo;
        }
      }
    });

    CADInspector.centerObject(object);
    CADInspector.autoGround(object);
    return totalTrianglesRemoved;
  }

  /**
   * Fast polygon reduction / mesh simplification for Web & Mobile AR
   * @param {THREE.Object3D} object 
   * @param {number} reductionRatio - e.g. 0.25 (25% reduction), 0.50 (50%), 0.75 (75%)
   * @returns {{before: number, after: number, reduction: number}}
   */
  static decimateMesh(object, reductionRatio = 0.50) {
    CADInspector.resetNodeTransforms(object);
    let totalBefore = 0;
    let totalAfter = 0;

    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        let geo = child.geometry;
        if (geo.index) {
          geo = geo.toNonIndexed();
        }

        const pos = geo.attributes.position;
        const color = geo.attributes.color;
        const uv = geo.attributes.uv;
        if (!pos) return;

        const triCount = pos.count / 3;
        totalBefore += triCount;
        if (triCount < 30) {
          totalAfter += triCount;
          return;
        }

        // Calculate bounding box and adaptive voxel grid size
        geo.computeBoundingBox();
        const box = geo.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        // Estimate target vertex count
        const targetVertices = Math.max(60, Math.floor(pos.count * (1 - reductionRatio)));
        const cellsPerAxis = Math.max(8, Math.cbrt(targetVertices) * 1.6);
        const cellSize = maxDim / cellsPerAxis;

        // Spatial Hash Grid for vertex clustering
        const grid = new Map();
        const getKey = (x, y, z) => {
          const gx = Math.floor((x - box.min.x) / cellSize);
          const gy = Math.floor((y - box.min.y) / cellSize);
          const gz = Math.floor((z - box.min.z) / cellSize);
          return `${gx},${gy},${gz}`;
        };

        // First pass: compute centroid and properties for each cell
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const key = getKey(x, y, z);

          if (!grid.has(key)) {
            grid.set(key, {
              sumX: x, sumY: y, sumZ: z,
              count: 1,
              r: color ? color.getX(i) : 0.8,
              g: color ? color.getY(i) : 0.8,
              b: color ? color.getZ(i) : 0.8,
              u: uv ? uv.getX(i) : 0,
              v: uv ? uv.getY(i) : 0
            });
          } else {
            const cell = grid.get(key);
            cell.sumX += x;
            cell.sumY += y;
            cell.sumZ += z;
            cell.count++;
          }
        }

        // Second pass: rebuild triangles, discarding degenerate ones
        const newPositions = [];
        const newColors = [];
        const newUvs = [];

        for (let i = 0; i < pos.count; i += 3) {
          const k0 = getKey(pos.getX(i), pos.getY(i), pos.getZ(i));
          const k1 = getKey(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
          const k2 = getKey(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));

          // If all 3 vertices collapse to the same point or form a degenerate line
          if (k0 === k1 || k1 === k2 || k0 === k2) continue;

          const c0 = grid.get(k0);
          const c1 = grid.get(k1);
          const c2 = grid.get(k2);

          newPositions.push(
            c0.sumX / c0.count, c0.sumY / c0.count, c0.sumZ / c0.count,
            c1.sumX / c1.count, c1.sumY / c1.count, c1.sumZ / c1.count,
            c2.sumX / c2.count, c2.sumY / c2.count, c2.sumZ / c2.count
          );

          if (color) {
            newColors.push(
              c0.r, c0.g, c0.b,
              c1.r, c1.g, c1.b,
              c2.r, c2.g, c2.b
            );
          }

          if (uv) {
            newUvs.push(
              c0.u, c0.v,
              c1.u, c1.v,
              c2.u, c2.v
            );
          }
        }

        // Apply simplified geometry if valid
        if (newPositions.length >= 9) {
          const newGeo = new THREE.BufferGeometry();
          newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
          if (newColors.length > 0) {
            newGeo.setAttribute('color', new THREE.Float32BufferAttribute(newColors, 3));
          }
          if (newUvs.length > 0) {
            newGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
          }
          newGeo.computeVertexNormals();
          newGeo.computeBoundingBox();
          newGeo.computeBoundingSphere();

          child.geometry.dispose();
          child.geometry = newGeo;
          totalAfter += (newPositions.length / 9);
        } else {
          totalAfter += triCount;
        }
      }
    });

    CADInspector.centerObject(object);
    CADInspector.autoGround(object);

    const actualReduction = totalBefore > 0 ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100) : 0;
    return {
      before: totalBefore,
      after: totalAfter,
      reduction: actualReduction
    };
  }

  /**
   * Converts units of model (e.g. mm to cm, cm to mm, mm to inches)
   * @param {THREE.Object3D} object 
   * @param {number} factor 
   */
  static convertUnits(object, factor) {
    CADInspector.scaleObject(object, factor);
  }
}

window.CADInspector = CADInspector;
