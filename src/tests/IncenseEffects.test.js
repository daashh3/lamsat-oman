import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { SmokeEffect } from '../effects/SmokeEffect.js';
import { createMabkhara } from '../objects/OmaniMabkhara.js';

test('incense coals start cold, light with real emissive PBR material, and reset to cold', () => {
  const burner = createMabkhara(), data = burner.userData;
  assert.equal(data.lit, false);
  assert.equal(data.coalMaterial.isMeshStandardMaterial, true);
  assert.equal(data.coalMaterial.emissiveIntensity, 0);
  assert.ok(data.charcoal.every(coal => coal.material === data.coalMaterial));
  data.setLit(true); data.updateEmbers(1);
  assert.ok(data.coalMaterial.emissiveIntensity > 1.3);
  assert.notEqual(data.coalMaterial.emissive.getHex(), 0);
  data.setLit(false); data.updateEmbers(50);
  assert.equal(data.coalMaterial.emissiveIntensity, 0);
  assert.deepEqual(data.bowlCenter.toArray(), [0, .47, 0]);
  assert.equal(data.charcoal.length, 10);
});

test('THREE.Points smoke rises, expands, drifts and fades completely within bounded storage', () => {
  const particles = new ParticleSystem(new Group(), 20);
  assert.equal(particles.points.isPoints, true);
  particles.emit(new Vector3(0, .47, 0), 'smoke', 100000);
  assert.equal(particles.pool.length, 20);
  assert.equal(particles.cursor, 20, 'Oversized bursts are bounded in work as well as memory');
  particles.update(.25);
  const startSize = particles.sizes[0], startY = particles.positions[1];
  assert.ok(startSize > 0); assert.ok(particles.opacities[0] > 0);
  particles.update(.75);
  assert.ok(particles.sizes[0] > startSize);
  assert.ok(particles.positions[1] > startY);
  assert.ok(particles.positions.every(Number.isFinite));
  particles.update(4);
  assert.ok(particles.pool.every(particle => particle.life === 0));
  assert.ok(particles.sizes.every(value => value === 0));
  assert.ok(particles.opacities.every(value => value === 0));
  particles.dispose();
});

test('smoke motion is equivalent across different animation frame steps', () => {
  const first = new ParticleSystem(new Group(), 1), second = new ParticleSystem(new Group(), 1);
  const random = Math.random;
  try {
    Math.random = () => .42;
    first.emit(new Vector3(0, .47, 0), 'smoke', 1);
    second.emit(new Vector3(0, .47, 0), 'smoke', 1);
  } finally { Math.random = random; }
  for (let i = 0; i < 30; i++) first.update(1 / 30);
  for (let i = 0; i < 72; i++) second.update(1 / 72);
  assert.ok(first.pool[0].p.distanceTo(second.pool[0].p) < 1e-10);
  assert.ok(Math.abs(first.sizes[0] - second.sizes[0]) < 1e-7);
  assert.ok(Math.abs(first.opacities[0] - second.opacities[0]) < 1e-7);
  first.dispose(); second.dispose();
});

test('smoke emission stops, reduced motion emits fewer puffs, and clear/dispose release resources', () => {
  function run(reduced) {
    const particles = new ParticleSystem(new Group(), 220);
    const effect = new SmokeEffect(particles, [0, .47, 0]);
    effect.start(1);
    for (let i = 0; i < 60; i++) effect.update(1 / 60, reduced);
    const emitted = particles.cursor;
    effect.update(10, reduced);
    assert.equal(particles.cursor, emitted);
    effect.start(5); effect.stop(); effect.update(.1);
    assert.equal(particles.cursor, emitted);
    particles.update(.1); particles.clear();
    assert.ok(particles.opacities.every(value => value === 0));
    let geometryDisposed = false, materialDisposed = false;
    particles.geo.addEventListener('dispose', () => { geometryDisposed = true; });
    particles.mat.addEventListener('dispose', () => { materialDisposed = true; });
    particles.dispose();
    assert.equal(particles.points.parent, null);
    assert.equal(geometryDisposed && materialDisposed, true);
    return emitted;
  }
  const full = run(false), reduced = run(true);
  assert.ok(full > reduced && reduced > 0);
});

test('non-smoke effects retain finite visible particles and invalid updates cannot poison buffers', () => {
  const particles = new ParticleSystem(new Group(), 12);
  for (const type of ['gold', 'water', 'confetti']) particles.emit(new Vector3(), type, 3);
  particles.update(.1);
  assert.ok(particles.sizes.some(value => value > 0));
  const before = [...particles.positions];
  particles.update(NaN); particles.update(-1);
  particles.emit(new Vector3(NaN, 0, 0), 'smoke', 2);
  assert.deepEqual([...particles.positions], before);
  assert.ok(particles.colors.every(Number.isFinite));
  particles.dispose();
});
