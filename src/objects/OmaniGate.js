import * as THREE from 'three';
import {
  palette,
  box,
  frame,
  rod,
  ring,
  tube,
  rosette,
  instance,
  batchStatic,
} from '../utils/GeometryUtils.js';
import {
  createEngravingPatterns,
  ENGRAVING_SURFACE_Z,
} from '../chapters/EngravingPatterns.js';

export function createGate({ shapes = createEngravingPatterns() } = {}) {
  const g = new THREE.Group();
  g.name = 'Omani gate with fitted engraving inlays';
  // A taller doorway, while the reachable template row keeps its physical size.
  const architecture = new THREE.Group();
  architecture.name = 'Door frame and hinged leaves';
  architecture.scale.set(1, 1, 1);
  g.add(architecture);
  const m = palette();
  // Materials are private to this model: aged fittings replace luminous borders.
  const wood = m.wood.clone();
  wood.color.set('#6e432a');
  wood.roughness = 0.78;
  const woodInset = m.woodDark.clone();
  woodInset.color.set('#432b1e');
  const woodEdge = m.woodLight.clone();
  woodEdge.color.set('#9b7450');
  woodEdge.roughness = 0.8;
  const agedMetal = m.goldDark.clone();
  agedMetal.color.set('#88734f');
  agedMetal.metalness = 0.6;
  agedMetal.roughness = 0.63;
  const patina = agedMetal.clone();
  patina.color.set('#68776a');
  patina.emissiveIntensity = 0;
  const decor = new THREE.Group();
  architecture.add(decor);
  // Final dimensions are baked into geometry/positions. A rotating leaf has no
  // nonuniformly scaled ancestor, so it stays rigid through the complete swing.
  const w = 0.70875,
    h = 0.9744,
    opening = 0.4491,
    leafBase = 0.022,
    leafHeight = 0.64;
  const jambWidth = (w - opening) / 2,
    lintelHeight = 0.08,
    frameDepth = 0.15;
  const jambCenter = opening / 2 + jambWidth / 2;
  for (const side of [-1, 1]) {
    const x = side * jambCenter;
    box(decor, jambWidth, h - lintelHeight, frameDepth, wood, [
      x,
      (h - lintelHeight) / 2,
      -0.035,
    ]);
    // Deep inner rebates and lighter outer mouldings make the frame read as timber.
    box(decor, 0.018, h - lintelHeight - 0.022, 0.17, woodInset, [
      side * (opening / 2 + 0.009),
      (h - lintelHeight + 0.022) / 2,
      -0.035,
    ]);
    box(decor, 0.013, h - 0.018, 0.015, woodEdge, [
      side * (w / 2 - 0.009),
      (h - 0.018) / 2,
      0.047,
    ]);
    box(decor, 0.061, 0.71, 0.009, woodInset, [x, 0.474, 0.044]);
    frame(decor, 0.063, 0.716, 0.006, 0.003, agedMetal, [x, 0.474, 0.049]);
    for (let i = 0; i < 7; i++)
      rosette(decor, x, 0.193 + i * 0.093, 0.053, 0.017, agedMetal);
    box(decor, jambWidth + 0.004, 0.067, 0.165, woodEdge, [x, 0.044, -0.031]);
  }
  // Posts meet the full-width lintel exactly, without gaps at the upper corners.
  box(decor, w, lintelHeight, frameDepth, wood, [
    0,
    h - lintelHeight / 2,
    -0.035,
  ]);
  box(decor, w - 0.012, 0.012, 0.018, woodEdge, [0, h - 0.011, 0.047]);
  box(decor, w - 0.038, 0.005, 0.006, agedMetal, [0, h - 0.029, 0.051]);
  box(decor, w, 0.018, 0.19, woodInset, [0, 0.009, -0.025]);
  box(decor, w - 0.016, 0.007, 0.023, woodEdge, [0, 0.016, 0.062]);
  const archPoints = [
    [-opening / 2, 0.666, 0.049],
    [-0.183, 0.752, 0.049],
    [-0.11, 0.842, 0.049],
    [0, 0.895, 0.049],
    [0.11, 0.842, 0.049],
    [0.183, 0.752, 0.049],
    [opening / 2, 0.666, 0.049],
  ];
  const spandrel = new THREE.Shape();
  spandrel.moveTo(-opening / 2, 0.666);
  spandrel.lineTo(-opening / 2, 0.905);
  spandrel.lineTo(opening / 2, 0.905);
  spandrel.lineTo(opening / 2, 0.666);
  spandrel.quadraticCurveTo(0.17, 0.82, 0, 0.895);
  spandrel.quadraticCurveTo(-0.17, 0.82, -opening / 2, 0.666);
  const archMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(spandrel, {
      depth: 0.13,
      bevelEnabled: false,
      curveSegments: 16,
    }),
    wood,
  );
  archMesh.position.z = -0.09;
  decor.add(archMesh);
  // The arched head is a fitted timber transom, not a hole with floating trim.
  // It stays in the frame while the two rectangular leaves swing beneath it.
  const transom = new THREE.Shape();
  transom.moveTo(-opening / 2, 0.666);
  transom.lineTo(opening / 2, 0.666);
  transom.quadraticCurveTo(0.17, 0.82, 0, 0.895);
  transom.quadraticCurveTo(-0.17, 0.82, -opening / 2, 0.666);
  const transomMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(transom, {
      depth: 0.03,
      bevelEnabled: false,
      curveSegments: 16,
    }),
    woodInset,
  );
  transomMesh.position.z = -0.012;
  decor.add(transomMesh);
  tube(decor, archPoints, 0.007, woodEdge, false, 36);
  tube(
    decor,
    archPoints.map(([x, y, z]) => [x * 0.97, y - 0.01, z + 0.004]),
    0.002,
    patina,
    false,
    36,
  );
  box(decor, opening, 0.016, 0.022, woodEdge, [0, 0.674, 0.037]);
  rosette(decor, 0, 0.857, 0.049, 0.031, agedMetal);
  for (const side of [-1, 1])
    rosette(decor, side * 0.105, 0.756, 0.049, 0.017, agedMetal);

  const leaves = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'Left rigid door leaf' : 'Right rigid door leaf';
    pivot.position.set((side * opening) / 2, leafBase, -0.055);
    architecture.add(pivot);
    const d = new THREE.Group();
    pivot.add(d);
    const cx = (-side * opening) / 4,
      leafWidth = opening / 2 - 0.003;
    const body = box(d, leafWidth, leafHeight, 0.034, wood, [
      cx,
      leafHeight / 2,
      0.03,
    ]);
    body.name = 'Solid timber leaf';
    // Mirrored stiles/rails and restrained carving make both leaves belong together.
    frame(d, leafWidth - 0.012, leafHeight - 0.016, 0.009, 0.008, woodEdge, [
      cx,
      leafHeight / 2,
      0.052,
    ]);
    for (const globalY of [0.225, 0.535])
      box(d, leafWidth - 0.022, 0.011, 0.008, woodEdge, [
        cx,
        globalY - leafBase,
        0.052,
      ]);
    for (const globalY of [0.137, 0.397]) {
      const panelHeight = globalY < 0.2 ? 0.14 : 0.19;
      box(d, 0.175, panelHeight, 0.003, woodInset, [
        cx,
        globalY - leafBase,
        0.048,
      ]);
      frame(d, 0.176, panelHeight + 0.005, 0.004, 0.003, agedMetal, [
        cx,
        globalY - leafBase,
        0.052,
      ]);
    }
    // The unused fourth lower panel receives wood carving, not another template.
    if (side > 0) rosette(d, cx, 0.137 - leafBase, 0.055, 0.042, agedMetal);
    frame(d, 0.176, 0.076, 0.005, 0.003, agedMetal, [
      cx,
      0.589 - leafBase,
      0.053,
    ]);
    for (const dx of [-0.047, 0, 0.047])
      rosette(d, cx + dx, 0.589 - leafBase, 0.057, 0.018, agedMetal);
    const studs = [];
    for (let y = 0.047; y < leafHeight - 0.02; y += 0.078)
      for (const dx of [-0.101, 0.101])
        studs.push({ position: [cx + dx, y, 0.057] });
    instance(d, new THREE.SphereGeometry(0.003, 8, 6), agedMetal, studs);
    for (const y of [0.12, 0.53])
      rod(d, [0, y - 0.022, 0.023], [0, y + 0.022, 0.023], 0.005, agedMetal);
    batchStatic(d);
    // Matching ring pulls sit beside the centre seam, clear of the stone covers.
    const handle = new THREE.Group();
    handle.name = 'Aged ring pull';
    handle.position.set(-side * (opening / 2 - 0.029), 0.267 - leafBase, 0.065);
    pivot.add(handle);
    box(handle, 0.022, 0.037, 0.004, agedMetal, [0, 0.009, -0.006]);
    ring(handle, 0.0125, 0.0027, agedMetal, [0, -0.002, 0.006], [0, 0, 0]);
    box(handle, 0.009, 0.009, 0.009, agedMetal, [0, 0.013, 0.002]);
    pivot.userData.handle = handle;
    leaves.push(pivot);
  }
  const light = new THREE.PointLight('#ffb451', 0, 0.8);
  light.position.set(0, 0.406, -0.1);
  architecture.add(light);
  batchStatic(decor);
  // Thin covers are fitted to individual leaves, never across the hinge/seam.
  const stone = m.ivory.clone();
  stone.color.set('#d3c1a0');
  stone.roughness = 0.96;
  stone.metalness = 0;
  const surfaces = shapes.map((shape) => {
    const leaf = leaves[shape.leaf],
      surface = new THREE.Group();
    surface.name = `Fitted ${shape.id} stone inlay`;
    surface.position.copy(
      new THREE.Vector3(
        shape.center[0] * 0.9,
        shape.center[1] * 1.16,
        shape.center[2],
      ).sub(leaf.position),
    );
    // Uniform inlay dimensions preserve the exact template aspect ratios.
    surface.scale.set(0.9, 0.9, 1);
    leaf.add(surface);
    const cover = box(
      surface,
      shape.width,
      shape.height,
      0.012,
      stone,
      [0, 0, -0.008],
    );
    cover.name = 'Fitted stone cover';
    frame(
      surface,
      shape.width + 0.006,
      shape.height + 0.006,
      0.004,
      0.004,
      agedMetal,
      [0, 0, -0.002],
    );
    const points = shape.path.map(
      (p) =>
        new THREE.Vector3(p[0] - shape.center[0], p[1] - shape.center[1], 0),
    );
    const guide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: 0x6b9d90,
        transparent: true,
        opacity: 0.2,
      }),
    );
    const carving = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x62452a }),
    );
    carving.position.z = 0.0006;
    carving.geometry.setDrawRange(0, 0);
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffce7e }),
    );
    cursor.visible = false;
    surface.add(guide, carving, cursor);
    return {
      id: shape.id,
      shape,
      object: surface,
      cover,
      guide,
      carving,
      cursor,
      points,
    };
  });
  const slots = shapes.map((shape, index) => {
    const object = new THREE.Group();
    object.name = `Select ${shape.id} engraving`;
    object.position.set((index - 1) * 0.205, 0.08, 0.3);
    g.add(object);
    const slotMaterial = m.woodDark.clone();
    box(object, 0.18, 0.15, 0.045, slotMaterial, [0, 0, 0]);
    frame(object, 0.176, 0.146, 0.006, 0.008, agedMetal, [0, 0, 0.026]);
    // The exact generated outline is reused here and on its assigned door panel.
    const points = [...shape.outline, shape.outline[0]].map(
      (p) => new THREE.Vector3(p[0] * 0.75, p[1] * 0.75, 0.027),
    );
    object.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xf4cf8e }),
      ),
    );
    return {
      id: shape.id,
      object,
      center: object.position.clone(),
      material: slotMaterial,
    };
  });
  let previous = '';
  g.userData = {
    leftDoor: leaves[0],
    rightDoor: leaves[1],
    architecture,
    backLight: light,
    surfaces,
    slots,
    frontZ: ENGRAVING_SURFACE_Z,
    openingWidth: opening,
    width: w,
    height: h,
    /** Convert canonical chapter coordinates to visible gate-local coordinates. */
    patternToGate(point, shapeId, target = new THREE.Vector3()) {
      const surface = surfaces.find((item) => item.id === shapeId);
      if (!surface) return null;
      if (point.isVector3) target.copy(point);
      else target.set(...point);
      target.x -= surface.shape.center[0];
      target.y -= surface.shape.center[1];
      target.z -= surface.shape.center[2];
      surface.object.localToWorld(target);
      return g.worldToLocal(target);
    },
    /** Undo the visible inlay transform before validating a trace sample. */
    gateToPattern(point, shapeId, target = new THREE.Vector3()) {
      const surface = surfaces.find((item) => item.id === shapeId);
      if (!surface) return null;
      if (point.isVector3) target.copy(point);
      else target.set(...point);
      g.localToWorld(target);
      surface.object.worldToLocal(target);
      target.x += surface.shape.center[0];
      target.y += surface.shape.center[1];
      target.z += surface.shape.center[2];
      return target;
    },
    setEngravingProgress(snapshot) {
      const key = JSON.stringify([
        snapshot.selectedShape,
        snapshot.shapeProgress,
        snapshot.completed,
      ]);
      if (key === previous) return;
      previous = key;
      for (const surface of surfaces) {
        const count = snapshot.shapeProgress?.[surface.id] || 0;
        const active =
          snapshot.selectedShape === surface.id && !snapshot.completed;
        surface.carving.geometry.setDrawRange(0, count);
        surface.guide.visible = count < surface.points.length;
        surface.guide.material.opacity = active ? 0.65 : 0.16;
        surface.cursor.visible = active && count < surface.points.length;
        if (surface.cursor.visible)
          surface.cursor.position
            .copy(surface.points[count])
            .add(new THREE.Vector3(0, 0, 0.003));
        slots
          .find((s) => s.id === surface.id)
          .material.color.setHex(
            count === surface.points.length
              ? 0x31594c
              : active
                ? 0x85602c
                : 0x463324,
          );
      }
    },
  };
  return g;
}
