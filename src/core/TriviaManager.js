import * as THREE from 'three';
import { TRIVIA_FACTS } from '../audio/ArabicScripts.js';
import { ResourceManager } from './ResourceManager.js';

/** Three small physical keepsakes around the pedestal, shared across chapters. */
export class TriviaManager {
  constructor(parent, { onDiscover = () => {}, occluders = () => [] } = {}) {
    this.root = new THREE.Group();
    this.root.name = 'Hidden cultural keepsakes';
    parent.add(this.root);
    this.onDiscover = onDiscover;
    this.occluders = occluders;
    this.found = new Set();
    this.raycaster = new THREE.Raycaster();
    this.items = TRIVIA_FACTS.map((fact, index) =>
      this.createObject(fact, index),
    );
    this.root.visible = false;
  }

  createObject(fact, index) {
    const item = new THREE.Group();
    item.name = fact.title;
    item.userData.triviaId = fact.id;
    item.position.set(
      ...[
        [-0.43, 0.018, -0.28],
        [0.45, 0.018, -0.28],
        [-0.2, 0.018, 0.49],
      ][index],
    );
    const material = new THREE.MeshStandardMaterial({
      color: [0xb78b3c, 0x247b78, 0xa9a28d][index],
      metalness: 0.65,
      roughness: 0.4,
      emissive: 0x386f61,
      emissiveIntensity: 0,
    });
    const add = (geometry, position = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      item.add(mesh);
      return mesh;
    };
    // An amber resin crystal, a tiny water vessel, and a curved khanjar charm.
    if (index === 0) {
      add(new THREE.DodecahedronGeometry(0.029), [0, 0.035, 0]).scale.set(
        0.85,
        1.25,
        0.8,
      );
      add(
        new THREE.TorusGeometry(0.035, 0.004, 6, 20),
        [0, 0.004, 0],
      ).rotation.x = Math.PI / 2;
    } else if (index === 1) {
      add(new THREE.SphereGeometry(0.032, 12, 10), [0, 0.035, 0]).scale.y = 0.9;
      add(new THREE.CylinderGeometry(0.013, 0.02, 0.032, 12), [0, 0.073, 0]);
      const handle = add(
        new THREE.TorusGeometry(0.022, 0.005, 6, 16),
        [0.028, 0.045, 0],
      );
      handle.scale.x = 0.75;
    } else {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.065, 0),
        new THREE.Vector3(0.01, 0.02, 0),
        new THREE.Vector3(-0.035, 0.015, 0),
      );
      add(new THREE.TubeGeometry(curve, 12, 0.009, 6, false));
      add(new THREE.BoxGeometry(0.043, 0.009, 0.016), [0, 0.065, 0]);
      add(new THREE.CylinderGeometry(0.011, 0.009, 0.027, 8), [0, 0.082, 0]);
    }
    item.userData.material = material;
    this.root.add(item);
    return item;
  }

  owner(object) {
    while (object && object !== this.root) {
      if (object.userData.triviaId) return object;
      object = object.parent;
    }
    return null;
  }

  hit(event) {
    if (!this.root.visible) return null;
    this.root.updateWorldMatrix(true, true);
    if (event.source === 'hand' && event.position) {
      const point = this.root.worldToLocal(event.position.clone());
      const near = this.items.find(
        (item) =>
          point.distanceTo(
            item.position.clone().add(new THREE.Vector3(0, 0.04, 0)),
          ) < 0.065,
      );
      if (near) return near;
    }
    const ray = event.ray || event.uiRay;
    if (ray) {
      this.raycaster.ray.copy(ray);
      const meshes = [];
      for (const root of [this.root, ...this.occluders()]) {
        root.updateWorldMatrix(true, true);
        root.traverseVisible((object) => {
          if (object.isMesh) meshes.push(object);
        });
      }
      // A keepsake hidden behind an exhibit cannot be clicked through the exhibit.
      return this.owner(
        this.raycaster.intersectObjects(meshes, false)[0]?.object,
      );
    }
    if (!event.position) return null;
    const point = this.root.worldToLocal(event.position.clone());
    return (
      this.items.find(
        (item) =>
          point.distanceTo(
            item.position.clone().add(new THREE.Vector3(0, 0.04, 0)),
          ) < 0.065,
      ) || null
    );
  }

  interact(event) {
    if (!['start', 'hover'].includes(event.phase)) return false;
    const item = this.hit(event);
    this.highlight(item);
    if (!item) return false;
    if (event.phase === 'start') this.discover(item.userData.triviaId);
    return true;
  }

  discover(id) {
    const fact = TRIVIA_FACTS.find((fact) => fact.id === id);
    if (!fact) return false;
    const first = !this.found.has(id);
    this.found.add(id);
    this.highlight(null);
    this.onDiscover(fact, {
      first,
      count: this.found.size,
      total: TRIVIA_FACTS.length,
    });
    return true;
  }

  highlight(hovered) {
    for (const item of this.items)
      item.userData.material.emissiveIntensity =
        item === hovered
          ? 0.7
          : this.found.has(item.userData.triviaId)
            ? 0.3
            : 0;
  }

  snapshot() {
    return {
      found: [...this.found],
      count: this.found.size,
      total: TRIVIA_FACTS.length,
    };
  }
  reset() {
    this.found.clear();
    // Drop GPU allocations from the completed hunt; rebuild the three small
    // objects for the next round, without retaining discovered materials.
    const parent = this.root.parent;
    new ResourceManager().dispose(this.root);
    parent?.add(this.root);
    this.items = TRIVIA_FACTS.map((fact, index) =>
      this.createObject(fact, index),
    );
  }
  dispose() {
    new ResourceManager().dispose(this.root);
    this.found.clear();
  }
}
