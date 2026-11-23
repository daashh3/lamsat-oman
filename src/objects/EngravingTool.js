import * as THREE from 'three';
import {
  box,
  cylinder,
  ring,
  material,
  batchStatic,
} from '../utils/GeometryUtils.js';

/** Group origin is the grip; the tip marker tracks the real cutting edge. */
export function createEngravingTool() {
  const group = new THREE.Group();
  group.name = 'Door engraving chisel';
  const wood = material('#74472a', 0, 0.72);
  const steel = material('#b6c8cd', 0.8, 0.24);
  const collar = material('#d6a851', 0.7, 0.3);
  cylinder(group, 0.015, 0.018, 0.09, wood, [0, -0.005, 0], 16);
  for (const y of [-0.035, 0.025]) ring(group, 0.016, 0.002, collar, [0, y, 0]);
  box(group, 0.012, 0.075, 0.009, steel, [0, 0.0775, 0]);
  const edge = box(group, 0.026, 0.009, 0.003, steel, [0, 0.1155, 0]);
  edge.rotation.x = -0.15;
  batchStatic(group);
  const tip = new THREE.Object3D();
  tip.name = 'Chisel cutting edge';
  tip.position.set(0, 0.12, 0);
  group.add(tip);
  group.userData = {
    grabbable: true,
    tip,
    grip: new THREE.Vector3(),
    tipOffset: [0, 0.12, 0],
  };
  return group;
}
