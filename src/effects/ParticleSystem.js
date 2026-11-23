import * as THREE from 'three';

/** A fixed-size THREE.Points pool shared by smoke, steam and celebration effects. */
export class ParticleSystem {
  constructor(parent, capacity = 220) {
    this.capacity = Math.max(1, Math.floor(capacity));
    this.pool = Array.from({ length: this.capacity }, () => ({
      life: 0,
      max: 1,
      age: 0,
      smoke: false,
      phase: 0,
      size: 0,
      p: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      v: new THREE.Vector3(),
      color: new THREE.Color(),
    }));
    this.positions = new Float32Array(this.capacity * 3);
    this.colors = new Float32Array(this.capacity * 3);
    this.sizes = new Float32Array(this.capacity);
    this.opacities = new Float32Array(this.capacity);
    this.spins = new Float32Array(this.capacity);
    this.kinds = new Float32Array(this.capacity);
    this.geo = new THREE.BufferGeometry();
    for (const [name, data, width] of [
      ['position', this.positions, 3],
      ['color', this.colors, 3],
      ['size', this.sizes, 1],
      ['opacity', this.opacities, 1],
      ['spin', this.spins, 1],
      ['kind', this.kinds, 1],
    ]) {
      this.geo.setAttribute(
        name,
        new THREE.BufferAttribute(data, width).setUsage(THREE.DynamicDrawUsage),
      );
    }
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      uniforms: { pixelScale: { value: 400 } },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        attribute float spin;
        attribute float kind;
        uniform float pixelScale;
        varying vec3 vColor;
        varying float vOpacity;
        varying float vSpin;
        varying float vKind;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vSpin = spin;
          vKind = kind;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * pixelScale / max(0.1, -mv.z), 0.0, 80.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        varying float vSpin;
        varying float vKind;
        void main() {
          vec2 uv = (gl_PointCoord - 0.5) * 2.0;
          float radius = length(uv);
          if (radius > 1.0 || vOpacity < 0.001) discard;
          float density = pow(1.0 - radius, 1.8);
          if (vKind > 0.5) {
            float c = cos(vSpin), s = sin(vSpin);
            vec2 p = mat2(c, -s, s, c) * uv;
            // Soft uneven lobes avoid the solid circular beads of simple sprites.
            float wisps = 0.78 + 0.16 * sin(p.x * 9.0 + sin(p.y * 7.0))
              + 0.06 * sin(p.y * 15.0 - p.x * 5.0);
            density = exp(-dot(p * vec2(1.2, 0.8), p * vec2(1.2, 0.8)) * 3.2)
              * (1.0 - smoothstep(0.45, 1.0, radius)) * wisps;
          }
          gl_FragColor = vec4(vColor, density * vOpacity);
        }
      `,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.name = 'Bounded smoke and effects particles';
    this.points.frustumCulled = false;
    parent.add(this.points);
    this.cursor = 0;
  }

  emit(position, type = 'gold', count = 12) {
    if (
      !Number.isFinite(count) ||
      ![position?.x, position?.y, position?.z].every(Number.isFinite)
    )
      return;
    // A burst cannot grow the pool or spend unbounded work after a delayed frame.
    const amount = Math.max(0, Math.min(this.capacity, Math.floor(count)));
    for (let i = 0; i < amount; i++) {
      const index = this.cursor++ % this.capacity,
        particle = this.pool[index];
      particle.smoke = type === 'smoke' || type === 'steam';
      particle.max = particle.life = particle.smoke
        ? 2.6 + Math.random() * 1.2
        : 1.5 + Math.random();
      particle.age = 0;
      particle.phase = Math.random() * Math.PI * 2;
      particle.p.copy(position);
      particle.p.x += (Math.random() - 0.5) * (particle.smoke ? 0.035 : 0.06);
      particle.p.z += (Math.random() - 0.5) * (particle.smoke ? 0.035 : 0.06);
      particle.origin.copy(particle.p);
      particle.v.set(
        (Math.random() - 0.5) * (particle.smoke ? 0.018 : 0.14),
        type === 'confetti'
          ? -0.12
          : particle.smoke
            ? 0.075 + Math.random() * 0.045
            : 0.08 + Math.random() * 0.16,
        (Math.random() - 0.5) * (particle.smoke ? 0.018 : 0.14),
      );
      particle.color.set(
        type === 'water'
          ? 0x75d4d9
          : type === 'smoke'
            ? 0xc6cfca
            : type === 'steam'
              ? 0xe5eee9
              : 0xe6bb68,
      );
      particle.size = particle.smoke ? 0.045 + Math.random() * 0.015 : 0.025;
      this.kinds[index] = particle.smoke ? 1 : 0;
      this.opacities[index] = 0;
      this.sizes[index] = 0;
    }
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = 0; i < this.capacity; i++) {
      const particle = this.pool[i];
      if (particle.life <= 0) {
        this.sizes[i] = this.opacities[i] = 0;
        continue;
      }
      particle.life = Math.max(0, particle.life - dt);
      particle.age = particle.max - particle.life;
      const age = particle.age / particle.max;
      if (particle.smoke) {
        const t = particle.age,
          phase = particle.phase;
        // Age-based motion is stable across different headset frame rates.
        particle.p.copy(particle.origin).addScaledVector(particle.v, t);
        particle.p.x +=
          (Math.sin(t * 2.1 + phase) - Math.sin(phase)) * 0.016 * t;
        particle.p.z +=
          (Math.cos(t * 1.5 + phase) - Math.cos(phase)) * 0.013 * t;
        particle.p.y += 0.011 * t * t;
        this.sizes[i] = particle.size * (1 + age * 3.1);
        this.opacities[i] =
          Math.min(1, age / 0.13) * Math.pow(1 - age, 1.4) * 0.38;
        this.spins[i] = phase + t * 0.22;
      } else {
        particle.p.addScaledVector(particle.v, dt);
        this.sizes[i] = particle.size * Math.sin(Math.PI * age);
        this.opacities[i] = (1 - age) * 0.65;
        this.spins[i] = 0;
      }
      if (particle.life === 0) this.sizes[i] = this.opacities[i] = 0;
      this.positions.set(particle.p.toArray(), i * 3);
      this.colors.set(particle.color.toArray(), i * 3);
    }
    for (const attribute of Object.values(this.geo.attributes))
      attribute.needsUpdate = true;
  }

  clear() {
    for (const particle of this.pool) particle.life = 0;
    this.sizes.fill(0);
    this.opacities.fill(0);
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.opacity.needsUpdate = true;
  }

  dispose() {
    this.points.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
