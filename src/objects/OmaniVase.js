import * as THREE from 'three';
import {
  palette,
  ring,
  tube,
  cylinder,
  batchStatic,
} from '../utils/GeometryUtils.js';

// A stable foot, rounded belly, narrow neck and rolled lip; all values are ratios.
const PROFILE = [
  [0, 0.4],
  [0.035, 0.43],
  [0.1, 0.57],
  [0.22, 0.8],
  [0.35, 0.96],
  [0.46, 1],
  [0.57, 0.95],
  [0.66, 0.79],
  [0.74, 0.57],
  [0.8, 0.43],
  [0.89, 0.42],
  [0.96, 0.49],
  [1, 0.53],
];
const BAND_HEIGHTS = [0.27, 0.46, 0.65];
function profileAt(t) {
  for (let i = 1; i < PROFILE.length; i++) {
    if (t <= PROFILE[i][0]) {
      const [a, ar] = PROFILE[i - 1],
        [b, br] = PROFILE[i];
      return THREE.MathUtils.lerp(ar, br, (t - a) / (b - a));
    }
  }
  return PROFILE.at(-1)[1];
}

export function createVase(height = 0.3, width = 0.196) {
  const g = new THREE.Group();
  g.name = 'Hand-shaped Omani stoneware vase';
  const m = palette(),
    segments = 48,
    rings = PROFILE.length * 2;
  const positions = [],
    uv = [],
    indices = [];
  for (let j = 0; j < rings; j++)
    for (let i = 0; i <= segments; i++) {
      positions.push(0, 0, 0);
      uv.push(i / segments, j / (rings - 1));
      if (j < rings - 1 && i < segments) {
        const a = j * (segments + 1) + i,
          b = a + segments + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  const body = new THREE.Mesh(geo, m.clay);
  body.castShadow = body.receiveShadow = true;
  body.userData = { segments, dynamic: true, owner: g };
  g.add(body);
  // A real closed, thick foot keeps the vessel grounded instead of an open tube.
  const foot = cylinder(g, 0.04, 0.041, 0.008, m.clay, [0, 0.004, 0], 32);
  const decoration = new THREE.Group();
  decoration.name = 'Player-painted slip decoration';
  g.add(decoration);
  const bands = BAND_HEIGHTS.map((level, id) => {
    const band = new THREE.Group();
    band.name = `Pottery decoration band ${id + 1}`;
    for (const t of [level - 0.038, level + 0.038])
      ring(band, profileAt(t) * 0.1 + 0.0007, 0.0015, m.ivory, [0, t * 0.3, 0]);
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI * 2) / 18;
      const points = [
        [0, level - 0.023],
        [0.085, level + 0.023],
        [0.17, level - 0.023],
      ].map(([da, t]) => {
        const r = profileAt(t) * 0.1 + 0.001;
        return [Math.sin(a + da) * r, t * 0.3, Math.cos(a + da) * r];
      });
      tube(band, points, 0.0012, m.ivory, false, 6);
    }
    batchStatic(band);
    band.visible = false;
    decoration.add(band);
    return band;
  });
  decoration.visible = false;
  const decorationGuides = new THREE.Group();
  decorationGuides.name = 'Three pottery painting guides';
  decorationGuides.visible = false;
  g.add(decorationGuides);
  const guideMaterial = m.turquoise.clone();
  guideMaterial.transparent = true;
  guideMaterial.opacity = 0.7;
  guideMaterial.depthWrite = false;
  const guides = BAND_HEIGHTS.map((level, id) => {
    const guide = ring(
      decorationGuides,
      0.012,
      0.002,
      guideMaterial,
      [0, level * height, (profileAt(level) * width) / 2 + 0.007],
      [0, 0, 0],
    );
    guide.name = `Paint band ${id + 1}`;
    guide.userData.decorationId = id;
    return guide;
  });
  g.userData = {
    body,
    foot,
    decoration,
    bands,
    decorationGuides,
    guides,
    height,
    width,
    decorationTargets: BAND_HEIGHTS.map((level, id) => ({
      id,
      position: [0, level * height, (profileAt(level) * width) / 2 + 0.007],
    })),
    showDecorationGuides(visible) {
      decorationGuides.visible = !!visible;
    },
    setDecoration(ids = []) {
      const selected = new Set(ids);
      decoration.visible = selected.size > 0;
      bands.forEach((band, id) => {
        band.visible = selected.has(id);
      });
      guides.forEach((guide, id) => {
        guide.visible = !selected.has(id);
      });
    },
  };
  updateVase(g, height, width);
  return g;
}

export function updateVase(vaseOrMesh, height, width) {
  const owner = vaseOrMesh.isGroup ? vaseOrMesh : vaseOrMesh.userData.owner;
  const body = owner?.userData.body || vaseOrMesh;
  const h = THREE.MathUtils.clamp(height, 0.08, 0.42),
    w = THREE.MathUtils.clamp(width, 0.09, 0.3);
  const segments = body.userData.segments || 48,
    p = body.geometry.attributes.position;
  const shape = THREE.MathUtils.clamp((h - 0.08) / 0.2, 0, 1);
  for (let j = 0; j < PROFILE.length * 2; j++) {
    const inner = j >= PROFILE.length,
      index = inner ? PROFILE.length * 2 - 1 - j : j;
    const [t, profileR] = PROFILE[index];
    const flatR = 0.4 + 0.56 * Math.sin(Math.PI * t);
    const radius =
      (THREE.MathUtils.lerp(flatR, profileR, shape) * w) / 2 -
      (inner ? 0.006 : 0);
    const y = t * h + (inner && t === 0 ? 0.008 : 0);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      p.setXYZ(
        j * (segments + 1) + i,
        Math.cos(a) * Math.max(0.003, radius),
        y,
        Math.sin(a) * Math.max(0.003, radius),
      );
    }
  }
  p.needsUpdate = true;
  body.geometry.computeVertexNormals();
  body.geometry.computeBoundingSphere();
  if (owner) {
    owner.userData.height = h;
    owner.userData.width = w;
    owner.userData.foot.scale.set(w / 0.2, 1, w / 0.2);
    owner.userData.decoration.scale.set(w / 0.2, h / 0.3, w / 0.2);
    for (const target of owner.userData.decorationTargets) {
      const t = BAND_HEIGHTS[target.id];
      target.position = [0, t * h, (profileAt(t) * w) / 2 + 0.007];
      owner.userData.guides[target.id].position.set(...target.position);
    }
  }
}
