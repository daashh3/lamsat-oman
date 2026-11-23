import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  V,
  palette,
  cylinder,
  ring,
  tube,
  sphere,
  batchStatic,
  lathe,
} from '../utils/GeometryUtils.js';

/** Small deterministic relief/roughness texture; metal color remains physically based. */
function hammeredTexture() {
  const size = 64,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const grain =
        Math.sin(x * 2.17 + y * 1.39) * Math.sin(x * 0.73 - y * 1.71);
      const value = Math.round(215 + grain * 24),
        index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Raised ornament follows each sloped panel, preventing z-fighting/intersections.
function relief(parent, cx, cy, radius, material, depthAt) {
  const star = [];
  for (let i = 0; i <= 16; i++) {
    const angle = (i * Math.PI) / 8,
      r = i % 2 ? radius * 0.46 : radius;
    const x = cx + Math.sin(angle) * r,
      y = cy + Math.cos(angle) * r;
    star.push([x, y, depthAt(y) + 0.01]);
  }
  tube(parent, star, 0.0014, material, false, 32);
  for (let petal = 0; petal < 4; petal++) {
    const angle = (petal * Math.PI) / 2;
    const points = Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2,
        u = Math.sin(t) * radius * 0.2;
      const v = (Math.cos(t) * 0.29 + 0.36) * radius;
      const x = cx + u * Math.cos(angle) - v * Math.sin(angle);
      const y = cy + u * Math.sin(angle) + v * Math.cos(angle);
      return [x, y, depthAt(y) + 0.011];
    });
    tube(parent, points, 0.0011, material, true, 20);
  }
}

export function createMabkhara() {
  const group = new THREE.Group();
  group.name = 'Traditional Omani majmar with hammered brass and charcoal';
  const detail = new THREE.Group();
  group.add(detail);
  const m = palette(),
    hammered = hammeredTexture();
  m.gold.color.set('#c99a47');
  m.gold.metalness = 0.88;
  m.gold.roughness = 0.38;
  m.gold.roughnessMap = hammered;
  m.gold.bumpMap = hammered;
  m.gold.bumpScale = 0.00035;
  m.gold.envMapIntensity = 1.1;
  m.goldDark.color.set('#725027');
  m.goldDark.metalness = 0.78;
  m.goldDark.roughness = 0.43;
  m.goldDark.envMapIntensity = 0.85;
  const polished = m.gold.clone();
  polished.roughness = 0.22;
  polished.bumpMap = null;
  polished.roughnessMap = null;
  // Quiet enamel inlays and dark recesses make the hand-worked brass readable
  // under both the desktop environment map and the headset's stereo lighting.
  const enamel = new THREE.MeshStandardMaterial({
    color: '#f0dfb8',
    metalness: 0.08,
    roughness: 0.32,
  });

  // Rounded, stepped plinth catches environment reflections on real bevels.
  const foot = new THREE.Mesh(
    new RoundedBoxGeometry(0.25, 0.018, 0.25, 2, 0.005),
    polished,
  );
  foot.position.y = 0.009;
  detail.add(foot);
  const base = cylinder(detail, 0.105, 0.165, 0.076, m.gold, [0, 0.056, 0], 4);
  base.rotation.y = Math.PI / 4;
  const top = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.015, 0.16, 2, 0.004),
    polished,
  );
  top.position.y = 0.101;
  detail.add(top);
  for (let side = 0; side < 4; side++) {
    const panel = new THREE.Group();
    panel.rotation.y = (side * Math.PI) / 2;
    detail.add(panel);
    const depth = (y) => 0.115 - (y - 0.02) * 0.51;
    tube(
      panel,
      [
        [-0.095, 0.025, depth(0.025)],
        [-0.06, 0.088, depth(0.088)],
        [0.06, 0.088, depth(0.088)],
        [0.095, 0.025, depth(0.025)],
        [-0.095, 0.025, depth(0.025)],
      ],
      0.0018,
      m.goldDark,
      false,
      24,
    );
    relief(panel, 0, 0.056, 0.027, m.goldDark, depth);
    batchStatic(panel);
  }

  // Four turned columns with distinct collars and a rounded upper support plate.
  for (const x of [-0.055, 0.055])
    for (const z of [-0.055, 0.055]) {
      const column = lathe(
        detail,
        [
          [0.013, 0],
          [0.013, 0.008],
          [0.009, 0.014],
          [0.008, 0.028],
          [0.008, 0.152],
          [0.01, 0.166],
          [0.013, 0.172],
          [0.013, 0.18],
        ],
        polished,
        16,
      );
      column.position.set(x, 0.108, z);
      for (const y of [0.119, 0.278])
        ring(detail, 0.01, 0.0016, m.goldDark, [x, y, z]);
    }
  const tray = new THREE.Mesh(
    new RoundedBoxGeometry(0.18, 0.018, 0.18, 2, 0.004),
    polished,
  );
  tray.position.y = 0.295;
  detail.add(tray);
  // Cross rails visually connect the four legs into one stable traditional base.
  for (let side = 0; side < 4; side++) {
    const rail = new THREE.Group();
    rail.rotation.y = (side * Math.PI) / 2;
    detail.add(rail);
    tube(
      rail,
      [
        [-0.055, 0.15, 0.055],
        [0, 0.2, 0.061],
        [0.055, 0.15, 0.055],
      ],
      0.0033,
      m.goldDark,
      false,
      20,
    );
    tube(
      rail,
      [
        [-0.055, 0.246, 0.055],
        [0, 0.2, 0.061],
        [0.055, 0.246, 0.055],
      ],
      0.0033,
      polished,
      false,
      20,
    );
    sphere(rail, 0.008, enamel, [0, 0.2, 0.063], 10);
    batchStatic(rail);
  }

  // Four flared walls, scalloped rolled rims, and visible thickness; top stays open.
  const depthAt = (y) => 0.082 + (y - 0.305) * 0.3;
  for (let side = 0; side < 4; side++) {
    const panel = new THREE.Group();
    panel.rotation.y = (side * Math.PI) / 2;
    detail.add(panel);
    const shape = new THREE.Shape();
    shape.moveTo(-0.082, 0.305);
    shape.lineTo(0.082, 0.305);
    shape.lineTo(0.156, 0.55);
    shape.bezierCurveTo(0.12, 0.552, 0.115, 0.492, 0, 0.492);
    shape.bezierCurveTo(-0.115, 0.492, -0.12, 0.552, -0.156, 0.55);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.007,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      curveSegments: 20,
    });
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++)
      positions.setZ(i, positions.getZ(i) + depthAt(positions.getY(i)));
    geometry.computeVertexNormals();
    panel.add(new THREE.Mesh(geometry, m.gold));
    const rim = [];
    for (let i = 0; i <= 32; i++) {
      const x = -0.156 + (i / 32) * 0.312,
        y = 0.492 + 0.058 * Math.pow(Math.abs(x) / 0.156, 2.5);
      rim.push([x, y, depthAt(y) + 0.005]);
    }
    tube(panel, rim, 0.0045, polished, false, 40);
    const border = [
      [-0.074, 0.317],
      [0.074, 0.317],
      [0.141, 0.532],
      [0.112, 0.494],
      [0, 0.476],
      [-0.112, 0.494],
      [-0.141, 0.532],
      [-0.074, 0.317],
    ];
    tube(
      panel,
      border.map(([x, y]) => [x, y, depthAt(y) + 0.009]),
      0.002,
      m.goldDark,
      false,
      44,
    );
    relief(panel, 0, 0.4, 0.052, m.goldDark, depthAt);
    relief(panel, -0.063, 0.451, 0.023, m.goldDark, depthAt);
    relief(panel, 0.063, 0.451, 0.023, m.goldDark, depthAt);
    for (const x of [-0.063, 0, 0.063]) {
      const y = x === 0 ? 0.4 : 0.451;
      const inset = sphere(
        panel,
        x === 0 ? 0.013 : 0.006,
        enamel,
        [x, y, depthAt(y) + 0.011],
        12,
      );
      inset.scale.z = 0.25;
    }
    for (let i = 0; i < 9; i++) {
      const x = -0.065 + i * 0.01625,
        y = 0.331;
      sphere(panel, 0.0023, polished, [x, y, depthAt(y) + 0.011], 6);
    }
    batchStatic(panel);
  }

  // Separate refractory liner and coals preserve the existing gameplay drop zone.
  const liner = new THREE.MeshStandardMaterial({
    color: '#3b3027',
    metalness: 0.15,
    roughness: 0.95,
  });
  const bowl = lathe(
    detail,
    [
      [0.025, 0],
      [0.058, 0.012],
      [0.082, 0.05],
      [0.113, 0.15],
      [0.117, 0.156],
      [0.108, 0.156],
      [0.075, 0.05],
      [0.05, 0.018],
      [0.025, 0.01],
    ],
    liner,
    40,
  );
  bowl.position.y = 0.3;
  // An ash bed fills the liner beneath the separate, individually faceted coals.
  cylinder(
    detail,
    0.094,
    0.081,
    0.014,
    new THREE.MeshStandardMaterial({ color: '#8b8072', roughness: 1 }),
    [0, 0.439, 0],
    32,
  );
  const coalMaterial = m.charcoal.clone();
  coalMaterial.color.set('#211b18');
  coalMaterial.metalness = 0.04;
  coalMaterial.roughness = 0.94;
  coalMaterial.emissive.set('#ff4d08');
  // The challenge starts cold. Lighting it enables this real emissive material.
  coalMaterial.emissiveIntensity = 0;
  const charcoal = [];
  const emberCracks = new THREE.Group();
  group.add(emberCracks);
  const crackMaterial = new THREE.MeshStandardMaterial({
    color: '#3c241d',
    emissive: '#ff6a12',
    emissiveIntensity: 0,
    roughness: 0.9,
    metalness: 0,
  });
  for (let i = 0; i < 10; i++) {
    const angle = i * 2.399,
      radius = 0.018 + Math.sqrt(i / 10) * 0.06;
    const coal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.019, 1),
      coalMaterial,
    );
    coal.position.set(
      Math.cos(angle) * radius,
      0.456 + (i % 3) * 0.006,
      Math.sin(angle) * radius,
    );
    coal.scale.set(1, 0.65, 0.85);
    coal.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    group.add(coal);
    charcoal.push(coal);
    const crack = tube(
      emberCracks,
      [
        [-0.011, 0.008, -0.004],
        [-0.003, 0.012, 0],
        [0.002, 0.011, 0.004],
        [0.011, 0.008, 0.005],
      ],
      0.0012,
      crackMaterial,
      false,
      8,
    );
    crack.position.copy(coal.position);
    crack.rotation.y = i * 0.8;
  }
  batchStatic(emberCracks);
  // This local non-shadow light warms the liner without adding shadow-map cost.
  const emberLight = new THREE.PointLight('#ff782c', 0, 0.65, 2);
  emberLight.position.set(0, 0.49, 0);
  group.add(emberLight);
  // Keep the fire bowl open: only the former raised decorative cap is removed.
  batchStatic(detail);
  group.userData = {
    bowlCenter: V(0, 0.47, 0),
    bowlRadius: 0.12,
    charcoal,
    bowl,
    coalMaterial,
    emberLight,
    crackMaterial,
    lit: false,
    setLit(lit) {
      this.lit = Boolean(lit);
      coalMaterial.emissiveIntensity = this.lit ? 1.5 : 0;
      crackMaterial.emissiveIntensity = this.lit ? 2.4 : 0;
      emberLight.intensity = this.lit ? 0.09 : 0;
    },
    updateEmbers(time) {
      coalMaterial.emissiveIntensity = this.lit
        ? 1.5 + Math.sin((Number.isFinite(time) ? time : 0) * 3.1) * 0.15
        : 0;
      crackMaterial.emissiveIntensity = this.lit
        ? coalMaterial.emissiveIntensity * 1.6
        : 0;
      emberLight.intensity = this.lit
        ? 0.09 + Math.sin((Number.isFinite(time) ? time : 0) * 3.1) * 0.008
        : 0;
    },
    materials: { brass: m.gold, polished, patina: m.goldDark },
  };
  return group;
}
