import * as THREE from 'three';
import {
  palette,
  mesh,
  box,
  rod,
  tube,
  ring,
  cylinder,
  batchStatic,
  instance,
  material,
} from '../utils/GeometryUtils.js';
import { createFlag } from './OmaniFlag.js';
import { DHOW_CORDS } from '../chapters/DhowWeaving.js';

export function createDhow() {
  const g = new THREE.Group();
  g.name = 'Omani dhow';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  box(d, 0.94, 0.022, 0.22, m.woodDark, [0, 0.011, 0]);
  for (const x of [-0.29, 0.29])
    box(d, 0.027, 0.045, 0.12, m.wood, [x, 0.042, 0]);
  // Hull: longitudinal stations with a rounded, deep cross-section and raised ends.
  const positions = [],
    uv = [],
    indices = [],
    N = 40,
    M = 18;
  function section(u, v) {
    const x = (u - 0.5) * 1.08,
      ends = Math.pow(Math.abs(u - 0.5) * 2, 3),
      beam = 0.101 * Math.pow(Math.sin(Math.PI * u), 0.55),
      theta = v * Math.PI;
    return [
      x,
      0.061 + ends * 0.072 + 0.086 * (1 - Math.sin(theta)),
      Math.cos(theta) * beam,
    ];
  }
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= M; j++) {
      positions.push(...section(i / N, j / M));
      uv.push(i / N, j / M);
      if (i < N && j < M) {
        const a = i * (M + 1) + j,
          b = a + M + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  hullGeo.setIndex(indices);
  hullGeo.computeVertexNormals();
  mesh(d, hullGeo, m.woodLight);
  // Thin strakes trace the curvature rather than replacing the hull by boxes.
  for (let j = 1; j < M; j += 2) {
    const points = [];
    for (let i = 0; i <= N; i++) points.push(section(i / N, j / M));
    tube(d, points, 0.0013, j > 6 && j < 12 ? m.ivory : m.woodDark, false, 40);
  }
  const deck = new THREE.Shape();
  deck.moveTo(-0.52, 0);
  for (let i = 1; i <= 20; i++) {
    const u = i / 20;
    deck.lineTo(
      (u - 0.5) * 1.04,
      0.094 * Math.pow(Math.sin(Math.PI * u), 0.55),
    );
  }
  for (let i = 19; i >= 0; i--) {
    const u = i / 20;
    deck.lineTo(
      (u - 0.5) * 1.04,
      -0.094 * Math.pow(Math.sin(Math.PI * u), 0.55),
    );
  }
  deck.closePath();
  const deckMesh = mesh(
    d,
    new THREE.ExtrudeGeometry(deck, { depth: 0.008, bevelEnabled: false }),
    m.wood,
  );
  deckMesh.rotation.x = Math.PI / 2;
  deckMesh.position.y = 0.148;
  for (let k = -3; k <= 3; k++)
    rod(
      d,
      [-0.41, 0.15, k * 0.022],
      [0.41, 0.15, k * 0.022],
      0.001,
      m.goldDark,
    );
  const railPosts = [];
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 1; i < 20; i++) {
      const u = i / 20,
        [x, y, z] = section(u, side < 0 ? 1 : 0);
      points.push([x, y + 0.028, z]);
      if (i % 2 === 0)
        railPosts.push({ position: [x, y + 0.014, z], scale: [1, 1, 1] });
    }
    tube(d, points, 0.003, m.woodDark, false, 32);
  }
  instance(
    d,
    new THREE.CylinderGeometry(0.002, 0.002, 0.028, 6),
    m.goldDark,
    railPosts,
  );
  const mastX = 0.04;
  rod(d, [mastX, 0.145, 0], [mastX, 0.385, 0], 0.005, m.woodLight);
  rod(d, [-0.2, 0.15, 0], [-0.2, 0.285, 0], 0.0035, m.woodLight);
  rod(d, [-0.37, 0.22, 0.003], [0.32, 0.43, 0.003], 0.004, m.woodLight);
  for (const y of [0.17, 0.27, 0.37])
    for (let j = 0; j < 3; j++)
      ring(d, 0.006, 0.001, m.ivory, [mastX, y + j * 0.002, 0]);
  // Subdivided triangular sail with nonuniform folds, animated through vertex positions.
  const sailPositions = [],
    sailUv = [],
    sailIndices = [],
    R = 18;
  const A = new THREE.Vector3(-0.37, 0.22, 0.007),
    B = new THREE.Vector3(0.32, 0.43, 0.007),
    C = new THREE.Vector3(0.29, 0.174, 0.007);
  const rowStart = [];
  let cursor = 0;
  for (let r = 0; r <= R; r++) {
    rowStart[r] = cursor;
    for (let col = 0; col <= r; col++) {
      const u = r / R,
        v = r ? col / r : 0;
      const p = A.clone().lerp(B, u).lerp(A.clone().lerp(C, u), v);
      sailPositions.push(p.x, p.y, p.z);
      sailUv.push(u, v);
      cursor++;
    }
  }
  for (let r = 0; r < R; r++)
    for (let c = 0; c <= r; c++) {
      const a = rowStart[r] + c,
        b = rowStart[r + 1] + c;
      sailIndices.push(a, b, b + 1);
      if (c < r) sailIndices.push(a, b + 1, a + 1);
    }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(sailPositions, 3),
  );
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(sailUv, 2));
  sg.setIndex(sailIndices);
  sg.computeVertexNormals();
  const sail = mesh(
    g,
    sg,
    material('#f2e5c8', 0, 0.94, { side: THREE.DoubleSide, map: m.ivory.map }),
  );
  sail.userData.original = new Float32Array(sailPositions);
  for (const p of [
    [-0.48, 0.17, -0.065],
    [-0.43, 0.17, 0.065],
    [0.4, 0.17, 0.065],
    [0.38, 0.17, -0.065],
  ])
    rod(d, [mastX, 0.37, 0], p, 0.0012, m.ivory, 5);
  rod(d, [0.32, 0.43, 0.003], [0.42, 0.175, 0.06], 0.0012, m.ivory, 5);
  rod(d, [-0.37, 0.22, 0], [-0.49, 0.18, 0], 0.0012, m.ivory, 5);
  // Stern canopy and carved cabin.
  box(d, 0.2, 0.012, 0.155, m.wood, [0.34, 0.245, 0]);
  for (const x of [0.25, 0.43])
    for (const z of [-0.065, 0.065])
      rod(d, [x, 0.16, z], [x, 0.24, z], 0.004, m.woodLight);
  box(d, 0.12, 0.043, 0.1, m.woodDark, [0.17, 0.173, 0]);
  for (const y of [0.16, 0.18, 0.195])
    rod(d, [0.11, y, 0.052], [0.23, y, 0.052], 0.0015, m.goldDark);
  for (const x of [-0.17, -0.08]) {
    cylinder(d, 0.022, 0.024, 0.035, m.woodLight, [x, 0.168, 0], 12);
    for (const y of [0.156, 0.181])
      ring(d, 0.024, 0.0015, m.goldDark, [x, y, 0]);
  }
  const handle = ring(
    g,
    0.021,
    0.004,
    m.turquoise,
    [0.22, 0.34, 0.13],
    [0, 0, 0],
  );
  handle.name = 'Sail rope handle';
  const rope = tube(
    g,
    [
      [0.22, 0.4, 0.13],
      [0.22, 0.37, 0.13],
      [0.22, 0.34, 0.13],
    ],
    0.002,
    m.ivory,
    false,
    8,
  );
  rope.userData.dynamic = true;
  const flag = createFlag(0.095);
  flag.position.set(0.44, 0.23, 0);
  g.add(flag);
  batchStatic(d);
  const rig = createWeavingRig(g, m);
  g.userData = {
    sail,
    ropeHandle: handle,
    rope,
    flag,
    cords: rig.cords,
    setRigProgress(snapshot) {
      rig.update(snapshot);
      const ready = snapshot.stage === 'HOIST' || !!snapshot.completed;
      handle.visible = ready;
      rope.visible = ready;
    },
  };
  g.userData.setRigProgress({
    stage: 'WEAVE',
    cordProgress: {},
    mountedCords: [],
  });
  setSailProgress(g, 0);
  return g;
}

function createWeavingRig(parent, materials) {
  const tipGeometry = new THREE.SphereGeometry(0.014, 12, 8);
  const guideGeometry = new THREE.TorusGeometry(0.022, 0.003, 6, 16);
  const segmentGeometry = new THREE.CylinderGeometry(0.0028, 0.0028, 1, 6);
  const matrixObject = new THREE.Object3D(),
    start = new THREE.Vector3(),
    end = new THREE.Vector3(),
    delta = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const cords = DHOW_CORDS.map((definition) => {
    const object = new THREE.Mesh(tipGeometry, materials.turquoise);
    object.name = `Weaving cord ${definition.id}`;
    object.position.set(...definition.start);
    parent.add(object);
    const guides = definition.path.map((point, index) => {
      const guide = new THREE.Mesh(
        guideGeometry,
        material('#a28e64', 0.1, 0.8),
      );
      guide.name =
        index === definition.path.length - 1
          ? `${definition.id} mounting cleat`
          : `${definition.id} weave guide ${index + 1}`;
      guide.position.set(...point);
      parent.add(guide);
      return guide;
    });
    // Fixed allocations: five segments suffice for the tail, accepted guides,
    // and free tip. No new geometry is allocated during hand/controller motion.
    const segments = new THREE.InstancedMesh(
      segmentGeometry,
      materials.ivory,
      definition.path.length + 1,
    );
    segments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    segments.frustumCulled = false;
    parent.add(segments);
    return { id: definition.id, object, guides, segments, definition };
  });
  return {
    cords,
    update(snapshot) {
      for (const cord of cords) {
        const count = snapshot.cordProgress?.[cord.id] || 0;
        const mounted = count === cord.definition.path.length;
        cord.object.visible = !mounted;
        cord.guides.forEach((guide, index) => {
          guide.material.color.setHex(
            index < count ? 0x5c9c89 : index === count ? 0xf3cf7a : 0xa28e64,
          );
          guide.material.emissive.setHex(index === count ? 0xba7e24 : 0);
          guide.material.emissiveIntensity = 0.45;
          guide.visible = !mounted || index === cord.guides.length - 1;
        });
        const points = [
          [
            cord.definition.start[0],
            cord.definition.start[1],
            cord.definition.start[2] - 0.055,
          ],
          ...cord.definition.path.slice(0, count),
        ];
        // The owning interaction controls tip position; never snap a held tip.
        if (!mounted) points.push(cord.object.position.toArray());
        for (let i = 0; i < cord.segments.count; i++) {
          matrixObject.position.set(0, 0, 0);
          matrixObject.quaternion.identity();
          matrixObject.scale.set(0, 0, 0);
          if (i + 1 < points.length) {
            start.set(...points[i]);
            end.set(...points[i + 1]);
            delta.subVectors(end, start);
            const length = delta.length();
            if (length > 1e-6) {
              matrixObject.position.copy(start).add(end).multiplyScalar(0.5);
              matrixObject.quaternion.setFromUnitVectors(
                up,
                delta.divideScalar(length),
              );
              matrixObject.scale.set(1, length, 1);
            }
          }
          matrixObject.updateMatrix();
          cord.segments.setMatrixAt(i, matrixObject.matrix);
        }
        cord.segments.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
export function setSailProgress(group, progress) {
  const sail = group.userData.sail;
  if (!sail) return;
  const t = THREE.MathUtils.clamp(progress, 0, 1),
    p = sail.geometry.attributes.position,
    base = sail.userData.original;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3],
      y = base[i * 3 + 1];
    const topY = 0.22 + ((x + 0.37) / 0.69) * 0.21;
    const depth = topY - y;
    p.setXYZ(
      i,
      x,
      topY - depth * (0.12 + 0.88 * t),
      0.007 +
        Math.sin((x + 0.37) * 36) * 0.009 * (1 - t) +
        Math.sin(depth * 15) * 0.012 * t,
    );
  }
  p.needsUpdate = true;
  sail.geometry.computeVertexNormals();
  group.userData.sailProgress = t;
}
