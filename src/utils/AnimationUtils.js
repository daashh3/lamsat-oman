import { clamp } from './MathUtils.js';

export const easeInOutCubic = value => { const t = clamp(value); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };
export const damp = (current, target, speed, dt) => current + (target - current) * (1 - Math.exp(-speed * Math.max(0, dt)));
