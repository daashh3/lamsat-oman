import * as THREE from 'three';
import {
  tube,
  mesh,
  sphere,
  cylinder,
  instance,
  batchStatic,
  material,
  surfaceTexture,
  box,
  ring,
} from '../utils/GeometryUtils.js';
import { FRANKINCENSE_SCRAPE_ZONE } from '../chapters/FrankincenseChapter.js';

/** A nearly metre-high Boswellia-inspired tree with exposed pale, peeling bark. */
export function createTree() {
  const group = new THREE.Group();
  group.name = 'Frankincense tree — scrape the pale bark';
  const detail = new THREE.Group();
  group.add(detail);
  const barkTexture = surfaceTexture('wood');
  const bark = material('#b9a68c', 0, 0.94, {
    map: barkTexture,
    bumpMap: barkTexture,
    bumpScale: 0.0015,
  });
  const innerBark = material('#c78351', 0, 0.92);
  const stone = material('#ac9273', 0, 0.98, { map: surfaceTexture('stone') });
  const leaf = material('#7a8953', 0, 0.88);
  const leafLight = material('#a0ac70', 0, 0.91);
  cylinder(detail, 0.21, 0.235, 0.026, stone, [0, 0.013, 0], 28);

  // Thick, branching trunk replaces the former half-metre twig. Short secondary
  // branches keep its sparse canopy recognisable and leave the scrape site clear.
  tube(
    detail,
    [
      [0, 0.026, 0],
      [-0.015, 0.18, 0],
      [0, 0.38, 0],
      [-0.023, 0.56, -0.012],
      [-0.005, 0.75, 0],
    ],
    0.027,
    bark,
    false,
    36,
  );
  const branches = [
    [
      [-0.005, 0.3, 0],
      [-0.15, 0.47, 0.01],
      [-0.26, 0.63, 0.01],
    ],
    [
      [0, 0.42, 0],
      [0.15, 0.58, -0.04],
      [0.3, 0.72, -0.02],
    ],
    [
      [-0.016, 0.55, -0.01],
      [-0.15, 0.73, -0.07],
      [-0.19, 0.87, -0.06],
    ],
    [
      [-0.01, 0.65, 0],
      [0.11, 0.8, 0.025],
      [0.17, 0.94, 0.015],
    ],
    [
      [-0.016, 0.53, -0.01],
      [0.02, 0.65, -0.15],
      [-0.02, 0.8, -0.21],
    ],
  ];
  const leaves = [],
    lights = [];
  for (let b = 0; b < branches.length; b++) {
    const branch = branches[b];
    tube(detail, branch, 0.013, bark, false, 20);
    const end = branch.at(-1),
      middle = branch[1];
    for (let j = 0; j < 3; j++) {
      const direction = j % 2 ? -1 : 1;
      const origin = [
        middle[0] + ((end[0] - middle[0]) * j) / 3,
        middle[1] + ((end[1] - middle[1]) * j) / 3,
        middle[2],
      ];
      const tip = [
        origin[0] + direction * 0.068,
        origin[1] + 0.067,
        origin[2] + 0.035,
      ];
      tube(
        detail,
        [
          origin,
          [(origin[0] + tip[0]) / 2, origin[1] + 0.035, origin[2] + 0.02],
          tip,
        ],
        0.004,
        bark,
        false,
        8,
      );
      for (let k = 0; k < 5; k++) {
        const side = k % 2 ? -1 : 1;
        const transform = {
          position: [
            tip[0] + side * 0.02,
            tip[1] - k * 0.009,
            tip[2] + side * 0.012,
          ],
          rotation: [0.35, b * 0.9 + side * 0.65, side * 0.7],
          scale: [0.65, 1.2, 0.18],
        };
        (k % 2 ? leaves : lights).push(transform);
      }
    }
  }
  instance(detail, new THREE.SphereGeometry(0.021, 8, 5), leaf, leaves);
  instance(detail, new THREE.SphereGeometry(0.021, 8, 5), leafLight, lights);

  // Visible root buttresses ground the larger tree on its rocky base.
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    tube(
      detail,
      [
        [-0.008, 0.12, 0],
        [Math.cos(angle) * 0.06, 0.04, Math.sin(angle) * 0.06],
        [Math.cos(angle) * 0.16, 0.027, Math.sin(angle) * 0.16],
      ],
      0.012,
      bark,
      false,
      12,
    );
    const rock = mesh(detail, new THREE.IcosahedronGeometry(0.034, 0), stone, [
      Math.cos(angle) * 0.17,
      0.028,
      Math.sin(angle) * 0.17,
    ]);
    rock.scale.set(1.3, 0.55, 0.9);
    rock.rotation.y = angle;
  }
  batchStatic(detail);

  const scrapeSurface = mesh(
    group,
    new THREE.PlaneGeometry(0.048, 0.23),
    material('#e7cf9d', 0, 0.92),
    [0, 0.38, 0.031],
  );
  scrapeSurface.name = 'Pale bark scraping surface';
  const scratches = new THREE.Group();
  scratches.position.set(0, 0.28, 0.034);
  group.add(scratches);
  for (let line = 0; line < 5; line++) {
    tube(
      scratches,
      [
        [-0.018, line * 0.04, 0],
        [0, line * 0.04 + 0.008, 0.002],
        [0.018, line * 0.04 + 0.012, 0],
      ],
      0.0025,
      innerBark,
      false,
      6,
    );
  }
  batchStatic(scratches);
  scratches.visible = false;

  const resinMaterial = material('#e8b35a', 0.04, 0.3, {
    emissive: '#bc741f',
    emissiveIntensity: 0.16,
  });
  const resin = new THREE.Group();
  resin.name = 'Harvested frankincense resin';
  resin.position.set(0.075, 0.34, 0.075);
  for (let i = 0; i < 5; i++) {
    const pearl = mesh(
      resin,
      new THREE.IcosahedronGeometry(0.017 + (i % 2) * 0.005, 1),
      resinMaterial,
      [Math.sin(i * 2.4) * 0.014, (i % 3) * 0.008, Math.cos(i * 2.4) * 0.013],
    );
    pearl.scale.set(0.9, 1.1, 0.8);
  }
  resin.visible = false;
  group.add(resin);

  // A separate, movable harvesting knife. Its hooked blade is distinct from
  // the straight engraving chisel and has a physical contact marker at its edge.
  const scraper = new THREE.Group();
  scraper.name = 'Frankincense bark scraper';
  scraper.position.set(-0.15, 0.12, 0.16);
  scraper.userData.grabbable = true;
  group.add(scraper);
  const handle = material('#81512e', 0, 0.82, { map: barkTexture });
  const steel = material('#b9cbca', 0.82, 0.28);
  const gripBand = material('#62c6b7', 0.24, 0.47);
  cylinder(scraper, 0.015, 0.019, 0.12, handle, [0, 0, 0], 16);
  for (const y of [-0.045, 0.045])
    cylinder(scraper, 0.017, 0.017, 0.012, gripBand, [0, y, 0], 16);
  for (const y of [-0.025, 0, 0.025])
    ring(scraper, 0.0165, 0.0012, handle, [0, y, 0]);
  cylinder(scraper, 0.015, 0.016, 0.022, steel, [0, 0.064, 0], 16);
  tube(
    scraper,
    [
      [0, 0.073, 0],
      [0, 0.105, 0],
      [0, 0.125, -0.018],
      [0, 0.13, -0.035],
    ],
    0.008,
    steel,
    false,
    10,
  );
  const edge = box(scraper, 0.043, 0.012, 0.006, steel, [0, 0.13, -0.035]);
  edge.name = 'Scraper cutting edge';
  batchStatic(scraper);
  // Rest the handle in a low wooden support while it awaits pickup.
  cylinder(group, 0.029, 0.037, 0.06, handle, [-0.15, 0.03, 0.16], 16);
  const scraperTip = new THREE.Object3D();
  scraperTip.name = 'Bark contact tip';
  scraperTip.position.set(0, 0.13, -0.035);
  scraper.add(scraperTip);

  group.userData = {
    resin,
    scrapeSurface,
    scrapeZone: FRANKINCENSE_SCRAPE_ZONE,
    scrapePoint: new THREE.Vector3(...FRANKINCENSE_SCRAPE_ZONE.center),
    scraper,
    scraperTip,
    scraperGrip: new THREE.Vector3(),
    setScrapeProgress(progress) {
      const amount = THREE.MathUtils.clamp(
        Number.isFinite(progress) ? progress : 0,
        0,
        1,
      );
      scratches.visible = amount > 0;
      scratches.scale.y = Math.max(0.01, amount);
      scrapeSurface.material.color.set(amount > 0.99 ? '#ca975c' : '#e7cf9d');
    },
    revealResin() {
      resin.visible = true;
      this.setScrapeProgress(1);
    },
  };
  return group;
}
