import * as THREE from 'three';
import {
  palette,
  cylinder,
  ring,
  box,
  arch,
  frame,
  instance,
  pointedShape,
  batchStatic,
  rosette,
} from '../utils/GeometryUtils.js';

export function createFort() {
  const g = new THREE.Group();
  g.name = 'Fort tower diorama';
  const d = new THREE.Group();
  g.add(d);
  const m = palette();
  cylinder(d, 0.286, 0.29, 0.025, m.sand, [0, 0.0125, 0], 48);
  cylinder(d, 0.225, 0.25, 0.61, m.sand, [0, 0.33, 0], 64);
  cylinder(d, 0.219, 0.219, 0.014, m.woodDark, [0, 0.64, 0], 48);
  const parapet = cylinder(
    d,
    0.228,
    0.229,
    0.047,
    m.sand,
    [0, 0.636, 0],
    64,
    true,
  );
  parapet.material = m.sand.clone();
  parapet.material.side = THREE.DoubleSide;
  for (const [y, r] of [
    [0.052, 0.249],
    [0.36, 0.238],
    [0.615, 0.229],
    [0.66, 0.23],
  ])
    ring(d, r, 0.0037, m.sand, [0, y, 0]);
  const crenelGeo = new THREE.ExtrudeGeometry(pointedShape(0.027, 0.045), {
    depth: 0.018,
    bevelEnabled: true,
    bevelSize: 0.0018,
    bevelThickness: 0.001,
    bevelSegments: 1,
    curveSegments: 6,
  });
  const battlements = [];
  for (let i = 0; i < 30; i++) {
    const a = (i * Math.PI * 2) / 30;
    battlements.push({
      position: [Math.sin(a) * 0.222, 0.654, Math.cos(a) * 0.222],
      rotation: [0, a, 0],
    });
  }
  instance(d, crenelGeo, m.sand, battlements);
  const slits = [];
  for (let i = 0; i < 22; i++) {
    const a = (i * Math.PI * 2) / 22;
    slits.push({
      position: [Math.sin(a) * 0.231, 0.588, Math.cos(a) * 0.231],
      rotation: [0, a, 0],
    });
  }
  instance(d, new THREE.BoxGeometry(0.0045, 0.022, 0.0017), m.woodDark, slits);
  const stones = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 35; i++) {
      const a = ((i + (row % 2) * 0.5) * Math.PI * 2) / 35;
      stones.push({
        position: [Math.sin(a) * 0.25, 0.04 + row * 0.022, Math.cos(a) * 0.25],
        rotation: [0, a, 0],
        scale: [0.9 + (i % 3) * 0.04, 0.9, 1],
      });
    }
  instance(d, new THREE.BoxGeometry(0.042, 0.019, 0.003), m.sand, stones);
  for (const a of [-0.9, 1.1, 2.4])
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4 - row; i++) {
        const t = a + (i + row * 0.2) * 0.1;
        box(
          d,
          0.022,
          0.013,
          0.0025,
          m.goldDark,
          [
            Math.sin(t) * (0.25 - row * 0.002),
            0.13 + row * 0.014,
            Math.cos(t) * (0.25 - row * 0.002),
          ],
          [0, t, 0],
        );
      }
  const windows = [];
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const panel = new THREE.Group();
    panel.position.set(Math.sin(a) * 0.24, 0.373, Math.cos(a) * 0.24);
    panel.rotation.y = a;
    g.add(panel);
    arch(panel, 0.054, 0.098, 0.006, m.goldDark);
    const win = arch(panel, 0.04, 0.081, 0.007, m.glow, [0, 0.007, 0.001]);
    windows.push(win);
    rosette(panel, 0, 0.045, 0.01, 0.014, m.goldDark);
    batchStatic(panel);
  }
  const door = box(d, 0.073, 0.18, 0.014, m.wood, [0.06, 0.123, 0.246]);
  frame(d, 0.098, 0.202, 0.025, 0.012, m.sand, [0.06, 0.126, 0.253]);
  const studs = [];
  for (const x of [0.035, 0.06, 0.085])
    for (const y of [0.06, 0.1, 0.14, 0.185])
      studs.push({ position: [x, y, 0.257] });
  instance(d, new THREE.SphereGeometry(0.0025, 7, 5), m.goldDark, studs);
  ring(d, 0.007, 0.0014, m.goldDark, [0.066, 0.11, 0.26], [0, 0, 0]);
  for (let i = 0; i < 2; i++)
    box(d, 0.12 - i * 0.014, 0.012, 0.05, m.sand, [
      0.06,
      0.012 + i * 0.012,
      0.285 - i * 0.014,
    ]);
  // Increase the landmark itself without changing the workshop or interaction scale.
  g.scale.setScalar(1.2);
  batchStatic(d);
  g.userData = { door, windows, height: 0.84, baseDiameter: 0.696 };
  return g;
}
