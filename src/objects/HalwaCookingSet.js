import * as THREE from 'three';
import {
  V,
  palette,
  material,
  lathe,
  ring,
  rod,
  cylinder,
  sphere,
  box,
  tube,
  instance,
  batchStatic,
} from '../utils/GeometryUtils.js';

export function createHalwaSet() {
  const g = new THREE.Group();
  g.name = 'Omani halwa kitchen';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  cylinder(d, 0.235, 0.25, 0.025, m.sand, [0, 0.0125, 0], 40);
  for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
    const log = rod(
      d,
      [-Math.cos(a) * 0.14, 0.04, -Math.sin(a) * 0.14],
      [Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14],
      0.018,
      m.woodDark,
    );
  }
  const fire = new THREE.Group();
  g.add(fire);
  const flameMat = material('#ffb52d', 0, 0.5, {
    emissive: '#ff6508',
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      r = 0.015 + i * 0.007;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.095, 7), flameMat);
    f.position.set(Math.sin(a) * r, 0.075, Math.cos(a) * r);
    f.scale.y = 0.7 + (i % 3) * 0.13;
    fire.add(f);
  }
  for (const x of [-0.12, 0.12])
    for (const z of [-0.1, 0.1])
      rod(d, [x, 0.025, z], [x * 0.8, 0.125, z * 0.8], 0.009, m.charcoal);
  const cauldron = new THREE.Group();
  g.add(cauldron);
  const body = lathe(
    cauldron,
    [
      [0.035, 0.09],
      [0.095, 0.097],
      [0.145, 0.135],
      [0.174, 0.2],
      [0.181, 0.218],
      [0.179, 0.225],
      [0.17, 0.225],
      [0.165, 0.204],
      [0.135, 0.142],
      [0.088, 0.108],
      [0.035, 0.104],
    ],
    m.copper,
    40,
  );
  ring(cauldron, 0.177, 0.006, m.gold, [0, 0.221, 0]);
  ring(cauldron, 0.147, 0.003, m.goldDark, [0, 0.14, 0]);
  for (const x of [-0.195, 0.195]) {
    ring(
      cauldron,
      0.031,
      0.004,
      m.gold,
      [x, 0.193, 0],
      [Math.PI / 2, Math.PI / 2, 0],
    );
  }
  const mixture = cylinder(
    g,
    0.163,
    0.163,
    0.007,
    material('#b57336', 0.2, 0.28),
    [0, 0.203, 0],
    40,
  );
  mixture.name = 'Halwa mixture';
  const swirl = tube(
    g,
    Array.from({ length: 45 }, (_, i) => {
      const a = i * 0.32,
        r = 0.015 + i * 0.0028;
      return [Math.cos(a) * r, 0.208, Math.sin(a) * r];
    }),
    0.002,
    m.goldDark,
    false,
    44,
  );
  swirl.userData.dynamic = true;
  const ingredients = [];
  const names = ['sugar', 'saffron', 'nuts'];
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * 0.32,
      container = new THREE.Group();
    container.position.set(x, 0, 0.3);
    d.add(container);
    lathe(
      container,
      [
        [0, 0],
        [0.032, 0],
        [0.044, 0.008],
        [0.056, 0.033],
        [0.058, 0.044],
        [0.052, 0.044],
        [0.044, 0.015],
        [0, 0.008],
      ],
      m.goldDark,
      24,
    );
    ring(container, 0.056, 0.002, m.gold, [0, 0.043, 0]);
    const ingredient = new THREE.Group();
    ingredient.name = names[k];
    ingredient.position.set(x, 0.075, 0.3);
    g.add(ingredient);
    const mat = [m.ivory, material('#d85b16', 0, 0.8), m.woodLight][k],
      bits = [];
    for (let j = 0; j < 11; j++) {
      const a = j * 2.399,
        r = Math.sqrt(j / 11) * 0.029;
      bits.push({
        position: [Math.cos(a) * r, (j % 3) * 0.006, Math.sin(a) * r],
        rotation: [j * 0.3, j * 0.9, j * 0.5],
        scale: k === 1 ? [0.3, 1.6, 0.3] : k === 2 ? [0.6, 1, 0.5] : [1, 1, 1],
      });
    }
    instance(
      ingredient,
      k === 0
        ? new THREE.BoxGeometry(0.009, 0.009, 0.009)
        : new THREE.SphereGeometry(0.01, 6, 5),
      mat,
      bits,
    );
    const halo = ring(ingredient, 0.037, 0.002, m.turquoise, [0, 0.005, 0]);
    ingredient.userData = { ingredient: names[k], halo };
    ingredients.push(ingredient);
  }
  const stick = new THREE.Group();
  stick.position.set(0.09, 0.29, 0.025);
  g.add(stick);
  rod(stick, [0, -0.1, 0], [0, 0.13, 0], 0.006, m.woodLight, 10);
  box(stick, 0.025, 0.052, 0.009, m.wood, [0, -0.09, 0]);
  ring(stick, 0.012, 0.002, m.turquoise, [0, 0.105, 0]);
  stick.name = 'Wooden stirring stick';
  // A separate woven palm-leaf mahafa, with its origin at the handle grip.
  // The scene keeps this Group independent so either controller can carry it.
  const fan = new THREE.Group();
  fan.name = 'Palm-leaf mahafa';
  fan.position.set(0.34, 0.13, 0.12);
  g.add(fan);
  const straw = material('#d7bd82', 0, 0.88, { map: m.ivory.map }),
    weave = material('#a17b43', 0, 0.92),
    dyed = material('#804233', 0, 0.86);
  const leaf = new THREE.Shape();
  leaf.moveTo(-0.065, 0.09);
  leaf.quadraticCurveTo(-0.085, 0.09, -0.085, 0.11);
  leaf.lineTo(-0.085, 0.24);
  leaf.quadraticCurveTo(-0.085, 0.265, -0.06, 0.265);
  leaf.lineTo(0.06, 0.265);
  leaf.quadraticCurveTo(0.085, 0.265, 0.085, 0.24);
  leaf.lineTo(0.085, 0.11);
  leaf.quadraticCurveTo(0.085, 0.09, 0.065, 0.09);
  leaf.closePath();
  const leafMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(leaf, {
      depth: 0.004,
      bevelEnabled: false,
      curveSegments: 4,
    }),
    straw,
  );
  leafMesh.position.z = -0.002;
  leafMesh.castShadow = leafMesh.receiveShadow = true;
  fan.add(leafMesh);
  rod(fan, [0, -0.065, 0], [0, 0.247, 0], 0.007, m.woodLight, 8);
  // Alternating strips read as interlaced palm fibres on both sides.
  for (let i = 0; i < 12; i++) {
    const y = 0.105 + i * 0.013;
    for (const z of [-0.0035, 0.0035])
      box(fan, 0.155, 0.0015, 0.001, weave, [0, y, z]);
  }
  for (let i = 0; i < 11; i++) {
    const x = -0.07 + i * 0.014;
    for (const z of [-0.004, 0.004])
      box(fan, 0.0015, 0.15, 0.001, weave, [x, 0.18, z]);
  }
  tube(
    fan,
    [
      [-0.065, 0.09, 0],
      [-0.085, 0.11, 0],
      [-0.085, 0.24, 0],
      [-0.06, 0.265, 0],
      [0.06, 0.265, 0],
      [0.085, 0.24, 0],
      [0.085, 0.11, 0],
      [0.065, 0.09, 0],
    ],
    0.003,
    weave,
    true,
    24,
  );
  for (const x of [-0.045, 0, 0.045])
    for (const z of [-0.005, 0.005])
      box(fan, 0.014, 0.014, 0.001, dyed, [x, 0.18, z], [0, 0, Math.PI / 4]);
  for (const y of [-0.045, -0.03, -0.015])
    ring(fan, 0.0075, 0.0012, dyed, [0, y, 0]);
  fan.userData = { grabbable: true, grip: V(0, 0, 0), head: V(0, 0.18, 0) };
  batchStatic(fan);
  const servingBowl = new THREE.Group();
  servingBowl.position.set(0, 0.05, 0.32);
  servingBowl.visible = false;
  g.add(servingBowl);
  lathe(
    servingBowl,
    [
      [0, 0],
      [0.055, 0],
      [0.08, 0.025],
      [0.105, 0.06],
      [0.108, 0.065],
      [0.1, 0.066],
      [0.077, 0.035],
      [0, 0.016],
    ],
    m.gold,
    32,
  );
  ring(servingBowl, 0.105, 0.003, m.goldDark, [0, 0.065, 0]);
  cylinder(
    servingBowl,
    0.098,
    0.098,
    0.006,
    material('#71361d', 0.15, 0.28),
    [0, 0.055, 0],
    32,
  );
  const nuts = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4,
      r = Math.sqrt(i / 12) * 0.079;
    nuts.push({
      position: [Math.cos(a) * r, 0.06, Math.sin(a) * r],
      rotation: [0, a, 0],
      scale: [0.7, 0.4, 1],
    });
  }
  instance(servingBowl, new THREE.SphereGeometry(0.008, 7, 5), m.ivory, nuts);
  batchStatic(d);
  batchStatic(cauldron);
  g.userData = {
    cauldron,
    mixture,
    swirl,
    ingredients,
    stick,
    fan,
    fire,
    servingBowl,
    bowlCenter: V(0, 0.22, 0),
    bowlRadius: 0.16,
  };
  return g;
}
