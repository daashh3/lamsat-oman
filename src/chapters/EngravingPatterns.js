// Coordinates are door-local metres. Every pattern fits one hinged stone inlay.
export const ENGRAVING_SURFACE_Z = 0.006;
export const ENGRAVING_TOLERANCE = 0.022;
export const ENGRAVING_INLAYS = Object.freeze([
  {
    id: 'star',
    center: [-0.12475, 0.342, ENGRAVING_SURFACE_Z],
    width: 0.185,
    height: 0.19,
    leaf: 0,
  },
  {
    id: 'square',
    center: [0.12475, 0.342, ENGRAVING_SURFACE_Z],
    width: 0.185,
    height: 0.19,
    leaf: 1,
  },
  {
    id: 'random',
    center: [-0.12475, 0.118, ENGRAVING_SURFACE_Z],
    width: 0.185,
    height: 0.14,
    leaf: 0,
  },
]);

function sampleOutline(outline, center) {
  const path = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.018),
    );
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      path.push([
        center[0] + a[0] + (b[0] - a[0]) * t,
        center[1] + a[1] + (b[1] - a[1]) * t,
        center[2],
      ]);
    }
  }
  path.push([...path[0]]);
  return path;
}

/** Generate once per chapter and share the exact outline with the model/UI. */
export function createEngravingPatterns(random = Math.random) {
  const sample = () => {
    const n = random();
    return Number.isFinite(n) ? Math.max(0, Math.min(0.999999, n)) : 0.5;
  };
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5,
      r = i % 2 ? 0.032 : 0.068;
    return [Math.sin(a) * r, Math.cos(a) * r];
  });
  const square = [
    [-0.065, -0.065],
    [-0.065, 0.065],
    [0.065, 0.065],
    [0.065, -0.065],
  ];
  const sides = 5 + Math.floor(sample() * 3),
    rotation = (sample() * Math.PI) / 3;
  const generated = Array.from({ length: sides }, (_, i) => {
    const a = rotation + (i * 2 * Math.PI) / sides,
      r = 0.044 + sample() * 0.011;
    return [Math.sin(a) * r, Math.cos(a) * r];
  });
  return [star, square, generated].map((outline, index) => {
    const inlay = ENGRAVING_INLAYS[index];
    return {
      ...inlay,
      center: [...inlay.center],
      label: ['نجمة', 'مربع', 'شكل مبتكر'][index],
      outline,
      path: sampleOutline(outline, inlay.center),
    };
  });
}
