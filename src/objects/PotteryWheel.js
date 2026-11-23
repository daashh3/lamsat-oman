import * as THREE from 'three';
import {
  V,
  palette,
  cylinder,
  box,
  ring,
  sphere,
  batchStatic,
} from '../utils/GeometryUtils.js';

export function createPotteryWheel() {
  const g = new THREE.Group();
  g.name = 'Pottery workshop';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  cylinder(d, 0.12, 0.14, 0.045, m.woodDark, [0, 0.0225, 0]);
  cylinder(d, 0.025, 0.035, 0.125, m.wood, [0, 0.1, 0]);
  const wheel = new THREE.Group();
  wheel.position.y = 0.169;
  g.add(wheel);
  cylinder(wheel, 0.17, 0.17, 0.022, m.woodLight);
  ring(wheel, 0.155, 0.002, m.goldDark, [0, 0.012, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    box(d, 0.03, 0.12, 0.03, m.wood, [
      Math.cos(a) * 0.1,
      0.08,
      Math.sin(a) * 0.1,
    ]);
  }
  // The .30 m vase fits this kiln at its true scale; the opening is real geometry.
  const kiln = new THREE.Group();
  kiln.position.set(0.38, 0, -0.06);
  g.add(kiln);
  const shell = new THREE.Shape();
  shell.moveTo(-0.22, 0);
  shell.lineTo(-0.22, 0.21);
  shell.quadraticCurveTo(-0.22, 0.43, 0, 0.43);
  shell.quadraticCurveTo(0.22, 0.43, 0.22, 0.21);
  shell.lineTo(0.22, 0);
  shell.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-0.126, 0.018);
  opening.lineTo(0.126, 0.018);
  opening.lineTo(0.126, 0.27);
  opening.quadraticCurveTo(0.126, 0.365, 0, 0.365);
  opening.quadraticCurveTo(-0.126, 0.365, -0.126, 0.27);
  opening.closePath();
  shell.holes.push(opening);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shell, {
      depth: 0.25,
      bevelEnabled: false,
      curveSegments: 12,
    }),
    m.sand,
  );
  body.position.z = -0.125;
  body.castShadow = body.receiveShadow = true;
  kiln.add(body);
  box(kiln, 0.42, 0.35, 0.018, m.woodDark, [0, 0.185, -0.13]);
  box(kiln, 0.44, 0.018, 0.28, m.sand, [0, 0.009, 0]);
  const glow = cylinder(kiln, 0.102, 0.102, 0.006, m.glow, [0, 0.021, 0], 24);
  glow.visible = false;
  // A large front-facing control can be pinched directly or selected by a ray.
  const ignitionMaterial = m.copper.clone();
  ignitionMaterial.emissive.set('#d76b21');
  ignitionMaterial.emissiveIntensity = 0;
  const igniter = cylinder(
    kiln,
    0.034,
    0.034,
    0.02,
    ignitionMaterial,
    [0.17, 0.2, 0.145],
    16,
  );
  igniter.rotation.x = Math.PI / 2;
  igniter.name = 'Kiln ignition control';
  ring(kiln, 0.041, 0.004, m.goldDark, [0.17, 0.2, 0.15], [0, 0, 0]);
  // Three low-poly flame tongues are hidden until the ignition action succeeds.
  const flames = new THREE.Group();
  flames.name = 'Lit kiln flames';
  flames.visible = false;
  kiln.add(flames);
  for (const [x, height] of [
    [-0.075, 0.05],
    [0, 0.07],
    [0.075, 0.045],
  ]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, height, 7),
      m.glow,
    );
    flame.position.set(x, 0.024 + height / 2, 0.085);
    flames.add(flame);
  }
  cylinder(kiln, 0.025, 0.033, 0.07, m.sand, [0, 0.449, -0.04], 16);
  const clay = sphere(g, 0.055, m.clay, [-0.27, 0.055, 0.12], 16);
  clay.scale.y = 0.8;
  clay.name = 'Clay ball';
  batchStatic(d);
  g.userData = {
    wheel,
    clay,
    kiln,
    kilnGlow: glow,
    kilnFlames: flames,
    kilnIgniter: igniter,
    kilnIgnitionCenter: igniter.position.clone().add(kiln.position),
    setKilnState(stage) {
      const lit = stage === 'FIRING' || stage === 'COMPLETE';
      glow.visible = flames.visible = lit;
      ignitionMaterial.emissiveIntensity =
        stage === 'IGNITE_KILN' ? 0.75 : lit ? 0.2 : 0;
    },
    topCenter: V(0, 0.18, 0),
    kilnCenter: V(0.38, 0.025, -0.06),
    kilnOpening: { width: 0.252, height: 0.347, depth: 0.25 },
  };
  return g;
}
