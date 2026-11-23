import * as THREE from 'three';
import {
  V,
  palette,
  material,
  lathe,
  ring,
  tube,
  cylinder,
  rod,
  sphere,
  rosette,
  batchStatic,
} from '../utils/GeometryUtils.js';

export function createCoffeeSet() {
  const g = new THREE.Group();
  g.name = 'Omani hospitality tray';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  cylinder(d, 0.39, 0.39, 0.014, m.goldDark, [0, 0.007, 0], 48);
  ring(d, 0.38, 0.006, m.gold, [0, 0.015, 0]);
  ring(d, 0.34, 0.002, m.gold, [0, 0.016, 0]);
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI * 2) / 32;
    sphere(
      d,
      0.003,
      m.gold,
      [Math.sin(a) * 0.363, 0.017, Math.cos(a) * 0.363],
      6,
    );
  }
  // Vessel vertices stay above y=0: the Group origin is its bottom, not its
  // center or the tray. Wrist input and the pour animator share this base pivot.
  const dallah = new THREE.Group();
  dallah.position.set(-0.22, 0.015, 0);
  g.add(dallah);
  dallah.name = 'Dallah base pivot';
  dallah.userData.pivotAtBase = true;
  m.gold.color.set('#d0a24d');
  m.gold.metalness = 0.88;
  m.gold.roughness = 0.3;
  m.gold.envMapIntensity = 1.05;
  m.goldDark.color.set('#80602f');
  m.goldDark.metalness = 0.8;
  m.goldDark.roughness = 0.4;
  lathe(
    dallah,
    [
      [0, 0],
      [0.058, 0],
      [0.073, 0.023],
      [0.085, 0.07],
      [0.078, 0.13],
      [0.054, 0.17],
      [0.04, 0.205],
      [0.045, 0.22],
    ],
    m.gold,
    40,
  );
  for (const [y, r] of [
    [0.02, 0.07],
    [0.145, 0.071],
    [0.168, 0.054],
    [0.215, 0.044],
  ])
    ring(dallah, r, 0.0025, m.goldDark, [0, y, 0]);
  const lid = lathe(
    dallah,
    [
      [0, 0.22],
      [0.049, 0.22],
      [0.045, 0.23],
      [0.031, 0.252],
      [0.009, 0.265],
      [0, 0.269],
    ],
    m.gold,
    32,
  );
  sphere(dallah, 0.009, m.gold, [0, 0.277, 0]);
  tube(
    dallah,
    [
      [-0.056, 0.186, 0],
      [-0.112, 0.205, 0],
      [-0.133, 0.151, 0],
      [-0.117, 0.081, 0],
      [-0.079, 0.067, 0],
    ],
    0.007,
    m.goldDark,
    false,
    24,
  );
  // Curved rising spout is a tapered, open radial mesh, with an exposed nozzle.
  const spoutPoints = [
      V(0.058, 0.13, 0),
      V(0.095, 0.16, 0),
      V(0.12, 0.21, 0),
      V(0.16, 0.24, 0),
    ],
    curve = new THREE.CatmullRomCurve3(spoutPoints);
  const geometry = new THREE.TubeGeometry(curve, 20, 0.012, 10, false),
    p = geometry.attributes.position;
  for (let i = 0; i <= 20; i++) {
    const center = curve.getPointAt(i / 20),
      factor = 1 - (i / 20) * 0.55;
    for (let j = 0; j <= 10; j++) {
      const idx = i * 11 + j;
      p.setXYZ(
        idx,
        center.x + (p.getX(idx) - center.x) * factor,
        center.y + (p.getY(idx) - center.y) * factor,
        center.z + (p.getZ(idx) - center.z) * factor,
      );
    }
  }
  geometry.computeVertexNormals();
  dallah.add(new THREE.Mesh(geometry, m.gold));
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const panel = new THREE.Group();
    panel.position.set(Math.sin(a) * 0.079, 0.095, Math.cos(a) * 0.079);
    panel.rotation.y = a;
    dallah.add(panel);
    rosette(panel, 0, 0, 0.001, 0.026, m.goldDark);
    batchStatic(panel);
  }
  batchStatic(dallah);
  const spout = new THREE.Object3D();
  spout.name = 'Spout outlet';
  spout.position.set(0.16, 0.24, 0);
  dallah.add(spout);
  const cups = [];
  for (const [x, z] of [
    [0.25, 0.08],
    [0.11, -0.17],
    [0.27, -0.15],
  ]) {
    const cup = new THREE.Group();
    cup.name = cups.length === 0 ? 'Grabbable fenjan' : 'Serving fenjan';
    cup.userData.grabbable = cups.length === 0;
    cup.position.set(x, 0.015, z);
    g.add(cup);
    lathe(
      cup,
      [
        [0, 0],
        [0.026, 0],
        [0.029, 0.012],
        [0.04, 0.072],
        [0.042, 0.083],
        [0.038, 0.084],
        [0.034, 0.071],
        [0.025, 0.015],
        [0, 0.01],
      ],
      m.ivory,
      28,
    );
    ring(cup, 0.04, 0.002, m.gold, [0, 0.08, 0]);
    ring(cup, 0.029, 0.002, m.goldDark, [0, 0.02, 0]);
    cups.push(cup);
  }
  // Keep markers attached to the cup so the stream follows it in either hand.
  const cupMouth = new THREE.Object3D();
  cupMouth.name = 'Fenjan mouth';
  cupMouth.position.set(0, 0.084, 0);
  cups[0].add(cupMouth);
  const liquid = cylinder(
    cups[0],
    0.034,
    0.034,
    0.004,
    material('#382015', 0, 0.22),
    [0, 0.025, 0],
    28,
  );
  liquid.visible = false;
  const stream = cylinder(
    g,
    0.003,
    0.003,
    1,
    material('#6e3c1b', 0, 0.25, { transparent: true, opacity: 0.85 }),
    [0, 0, 0],
    8,
  );
  stream.visible = false;
  stream.name = 'Coffee stream';
  const halwa = new THREE.Group();
  halwa.position.set(-0.03, 0.018, 0.19);
  g.add(halwa);
  lathe(
    halwa,
    [
      [0, 0],
      [0.049, 0],
      [0.07, 0.03],
      [0.075, 0.04],
      [0.068, 0.04],
      [0, 0.012],
    ],
    m.gold,
    28,
  );
  cylinder(
    halwa,
    0.065,
    0.065,
    0.007,
    material('#71361d', 0.1, 0.25),
    [0, 0.03, 0],
    28,
  );
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      r = Math.sqrt(i / 7) * 0.05;
    const nut = sphere(
      halwa,
      0.006,
      m.ivory,
      [Math.cos(a) * r, 0.035, Math.sin(a) * r],
      7,
    );
    nut.scale.y = 0.4;
  }
  const baseMarker = new THREE.Object3D();
  baseMarker.name = 'Dallah bottom pivot marker';
  dallah.add(baseMarker);
  batchStatic(d);
  g.userData = {
    dallah,
    dallahPivot: dallah,
    baseMarker,
    spout,
    cups,
    cup: cups[0],
    cupMouth,
    cupGrip: V(0, 0.045, 0),
    liquid,
    stream,
    halwa,
    cupCenter: V(0.25, 0.1, 0.08),
  };
  return g;
}
