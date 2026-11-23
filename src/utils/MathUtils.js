export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * clamp(t);
export const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const isVector3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
export const wrappedAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const smoothstep = t => { const x = clamp(t); return x * x * (3 - 2 * x); };
