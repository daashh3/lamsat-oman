import * as THREE from 'three';
import { createGate } from '../objects/OmaniGate.js';
import { createMabkhara } from '../objects/OmaniMabkhara.js';
import { createTree } from '../objects/FrankincenseTree.js';
import { createDhow, setSailProgress } from '../objects/OmaniDhow.js';
import { createFort } from '../objects/NizwaFort.js';
import { createPotteryWheel } from '../objects/PotteryWheel.js';
import { createVase, updateVase } from '../objects/OmaniVase.js';
import { createHalwaSet } from '../objects/HalwaCookingSet.js';
import { createCoffeeSet } from '../objects/OmaniCoffeeSet.js';
import { DallahPourAnimator } from '../objects/DallahPourAnimator.js';
import { createLantern } from '../objects/OmaniLantern.js';
import { createFlag, updateFlag } from '../objects/OmaniFlag.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { SmokeEffect } from '../effects/SmokeEffect.js';
import { FireEffect } from '../effects/FireEffect.js';
import { WaterEffect } from '../effects/WaterEffect.js';
import { ConfettiEffect } from '../effects/ConfettiEffect.js';
import { pulseLight } from '../effects/LightingEffects.js';
import { ResourceManager } from './ResourceManager.js';
import { INTERACTION_LAYOUT as L } from '../chapters/ChapterData.js';
import { GestureDetector } from '../xr/GestureDetector.js';
import { FRANKINCENSE_SCRAPE_STROKES } from '../chapters/FrankincenseChapter.js';
import { PoseTransitions } from '../utils/PoseTransitions.js';

const vec = (a) => new THREE.Vector3(...a);
const gold = () =>
  new THREE.MeshStandardMaterial({
    color: 0xe5bc78,
    metalness: 0.65,
    roughness: 0.25,
    emissive: 0x9f7120,
    emissiveIntensity: 0.35,
  });

/** Scene adapter. Both browser pointers and XR hands feed these exact interactions. */
export class ChapterManager {
  constructor({ content, game, audio, onHint = () => {} }) {
    Object.assign(this, { content, game, audio, onHint });
    this.resources = new ResourceManager();
    this.root = new THREE.Group();
    content.add(this.root);
    this.particles = new ParticleSystem(content);
    this.targets = [];
    this.grabs = new Map();
    this.tracing = new Set();
    this.motion = new PoseTransitions();
    this.elapsed = 0;
    this.effectTimer = 0;
    this.tilt = 0;
    this.reduced = false;
    this.shapeBaseline = null;
    this.actionRaycaster = new THREE.Raycaster();
    this.build('GATE');
  }
  add(object, position) {
    if (position) object.position.set(...position);
    this.root.add(object);
    return object;
  }
  target(id, object, radius = 0.055, offset = [0, 0, 0]) {
    const target = {
      id,
      object,
      radius,
      offset: vec(offset),
      home: object.position.clone(),
      rotation: object.quaternion.clone(),
      owner: null,
    };
    this.targets.push(target);
    return target;
  }
  build(state) {
    this.cancelAll();
    this.pourAnimator = null;
    this.resources.dispose(this.root);
    this.root = new THREE.Group();
    this.content.add(this.root);
    this.targets = [];
    this.models = {};
    this.state = state;
    this.elapsed = 0;
    this.effectTimer = 0;
    this.shapeBaseline = null;
    this.particles.clear();
    this.tilt = 0;
    this.assist = null;
    this.assistTimer = 0;
    this.dhowFloatTime = 0;
    // Low, compact pedestal works as a real-space tabletop without a synthetic room.
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.65, 0.075, 64),
      new THREE.MeshStandardMaterial({
        color: 0x17312f,
        metalness: 0.3,
        roughness: 0.58,
      }),
    );
    base.position.y = -0.048;
    this.add(base);
    for (const y of [-0.012, -0.082]) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.625, 0.0035, 6, 80),
        gold(),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      this.add(rim);
    }
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.59, 64),
      new THREE.MeshStandardMaterial({ color: 0x263b36, roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.009;
    this.add(floor);
    if (state === 'GATE') {
      this.models.gate = this.add(
        createGate({ shapes: this.game.chapter?.shapes }),
      );
    }
    if (state === 'FRANKINCENSE') {
      this.models.burner = this.add(createMabkhara());
      this.models.tree = this.add(createTree(), [-0.38, 0, -0.12]);
      this.target('resin', this.models.tree.userData.resin, 0.045);
      this.target(
        'scraper',
        this.models.tree.userData.scraper,
        0.05,
      ).rayOffset = this.models.tree.userData.scraperTip.position.clone();
      this.zone(L.frankincense.bowl.center, 0.115);
    }
    if (state === 'DHOW') {
      this.models.dhow = this.add(createDhow());
      for (const cord of this.models.dhow.userData.cords)
        this.target(cord.id, cord.object, 0.045).cord = cord;
      this.target('rope', this.models.dhow.userData.ropeHandle, 0.055);
      this.models.ropeLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          vec([0.22, 0.4, 0.13]),
          vec([0.22, 0.34, 0.13]),
        ]),
        new THREE.LineBasicMaterial({ color: 0xe7d2a1 }),
      );
      this.add(this.models.ropeLine);
    }
    if (state === 'POTTERY') {
      const fort = this.add(createFort(), [-0.26, 0, -0.42]);
      this.models.fort = fort;
      this.models.workshop = this.add(createPotteryWheel(), [0, 0, 0.18]);
      this.target('clay', this.models.workshop.userData.clay, 0.065);
      this.models.vase = this.add(createVase(0.14, 0.27), [0, 0.18, 0.18]);
      this.models.vase.visible = false;
      this.target('vase', this.models.vase, 0.16, [0, 0.15, 0]);
      this.models.targetVase = this.add(
        createVase(0.3, 0.196),
        [0, 0.18, 0.18],
      );
      this.models.targetVase.traverse((o) => {
        if (o.material) {
          o.material = new THREE.MeshBasicMaterial({
            color: 0xe5bc78,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
          });
        }
      });
      this.models.targetVase.visible = false;
      this.zone(L.pottery.wheel.center, 0.15);
    }
    if (state === 'HALWA') {
      this.models.halwa = this.add(createHalwaSet());
      for (const o of this.models.halwa.userData.ingredients)
        this.target(o.userData.ingredient, o, 0.058);
      this.target(
        'stick',
        this.models.halwa.userData.stick,
        0.075,
        [0, 0.1, 0],
      );
      this.target('fan', this.models.halwa.userData.fan, 0.085);
      this.zone(L.halwa.cauldron.center, 0.17);
    }
    if (state === 'COFFEE') {
      this.models.coffee = this.add(createCoffeeSet());
      const { dallah, spout, cup } = this.models.coffee.userData;
      this.target('coffee', dallah, 0.115, [0, 0.14, 0]);
      this.target('cup', cup, 0.065, [0, 0.045, 0]);
      this.pourAnimator = new DallahPourAnimator(dallah, {
        spout,
        cupPosition: vec(L.coffee.cup.center),
      });
      this.zone(L.coffee.cup.center, 0.048);
    }
    if (state === 'FINALE') {
      this.models.lantern = this.add(createLantern());
      this.target('lantern', this.models.lantern, 0.18, [0, 0.32, 0]);
      this.models.flag = this.add(createFlag(0.34), [-0.4, 0.34, -0.14]);
      this.models.symbols = [];
      for (let i = 0; i < 5; i++) {
        const symbol = new THREE.Group(),
          body = new THREE.Mesh(
            i === 1
              ? new THREE.ConeGeometry(0.032, 0.06, 3)
              : i === 2
                ? new THREE.CylinderGeometry(0.023, 0.032, 0.06, 12)
                : new THREE.OctahedronGeometry(0.035, 0),
            gold(),
          );
        symbol.add(body);
        const circle = new THREE.Mesh(
          new THREE.TorusGeometry(0.047, 0.002, 6, 24),
          gold(),
        );
        symbol.add(circle);
        this.add(symbol);
        this.models.symbols.push(symbol);
      }
    }
    this.smoke = new SmokeEffect(
      this.particles,
      state === 'FRANKINCENSE' ? [0, 0.49, 0] : [0, 0.25, 0],
      state === 'FRANKINCENSE' ? 'smoke' : 'steam',
    );
    this.water = new WaterEffect(this.particles);
    this.confetti =
      state === 'FINALE' ? new ConfettiEffect(this.particles) : null;
    this.fire = this.models.halwa
      ? new FireEffect(this.models.halwa.userData.fire)
      : null;
    this.hoverHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.002, 6, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7be2cb,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      }),
    );
    this.hoverHalo.visible = false;
    this.hoverHalo.renderOrder = 10;
    this.add(this.hoverHalo);
    this.root.updateMatrixWorld(true);
  }
  zone(center, radius) {
    this.dropHalo = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.002, 6, 40),
      new THREE.MeshBasicMaterial({
        color: 0x77cebd,
        transparent: true,
        opacity: 0.38,
      }),
    );
    this.dropHalo.rotation.x = -Math.PI / 2;
    this.dropHalo.position.copy(vec(center));
    this.add(this.dropHalo);
  }
  targetPoint(t, ray = false) {
    return this.root.worldToLocal(
      t.object.localToWorld(((ray && t.rayOffset) || t.offset).clone()),
    );
  }
  objectPoint(t) {
    return this.root.worldToLocal(
      t.object.getWorldPosition(new THREE.Vector3()),
    );
  }
  setPoint(t, p) {
    t.object.position.copy(
      t.object.parent.worldToLocal(this.root.localToWorld(p.clone())),
    );
    t.object.updateMatrixWorld(true);
  }
  eligible(t) {
    const ch = this.game.chapter;
    if (!ch || ch.completed || this.game.paused) return false;
    if (this.state === 'COFFEE' && ch.stage === 'RESETTING') return false;
    if (this.state === 'GATE') return false;
    if (this.state === 'DHOW')
      return ch.stage === 'WEAVE'
        ? !!t.cord && !ch.snapshot().mountedCords.includes(t.id)
        : ch.stage === 'HOIST' && t.id === 'rope';
    if (this.state === 'FRANKINCENSE')
      return (
        (ch.stage === 'PLACE_RESIN' && t.id === 'resin') ||
        (ch.stage === 'SCRAPE_TREE' && t.id === 'scraper')
      );
    if (this.state === 'HALWA')
      return ch.stage === 'FAN_FIRE'
        ? t.id === 'fan'
        : ch.stage === 'STIR'
          ? t.id === 'stick'
          : t.id === ['sugar', 'saffron', 'nuts'][ch.ingredients?.length];
    if (this.state === 'POTTERY')
      return ch.stage === 'PLACE_CLAY'
        ? t.id === 'clay'
        : ch.stage === 'SHAPE' && t.id === 'vase';
    return true;
  }
  pick(point, ray) {
    let found = null,
      best = Infinity;
    this.root.updateMatrixWorld(true);
    for (const t of this.targets) {
      if (!t.object.visible || !this.eligible(t)) continue;
      const p = this.targetPoint(t, !!ray);
      let d;
      if (ray) {
        const world = this.root.localToWorld(p.clone());
        d = ray.distanceToPoint(world);
        if (d > t.radius * this.root.getWorldScale(new THREE.Vector3()).x)
          continue;
        d = ray.origin.distanceTo(world);
      } else {
        d = p.distanceTo(point);
        if (d > t.radius + 0.02) continue;
      }
      if (d < best) {
        best = d;
        found = t;
      }
    }
    return found;
  }
  begin(id, p, ray, quaternion) {
    const t = this.pick(p, ray);
    if (!t || t.owner) return false;
    this.motion.cancel(t.object);
    if (t.id === 'lantern') {
      this.game.input('touch');
      return true;
    }
    if (t.id === 'coffee') this.pourAnimator?.cancel({ restore: false });
    t.owner = id;
    if (t.id === 'cup') this.game.input('cup-held', { held: true });
    if (t.id === 'fan') this.game.input('fan-held', { held: true });
    if (t.id === 'scraper') this.game.input('scraper-held', { held: true });
    this.grabs.set(id, {
      target: t,
      last: p.clone(),
      offset: this.objectPoint(t).sub(p),
      initialQ: quaternion?.clone(),
      baseQ: t.object.getWorldQuaternion(new THREE.Quaternion()),
      localGrip: t.object.worldToLocal(this.root.localToWorld(p.clone())),
    });
    this.hoverHalo.visible = false;
    if (t.id !== 'cup') this.interactionSound('pickup', this.targetPoint(t));
    return true;
  }
  /** Real mesh picking for click/select actions; hand grabs still use joints. */
  activate(event) {
    if (
      event.phase !== 'start' ||
      this.game.paused ||
      !this.game.chapter ||
      this.game.chapter.completed
    )
      return false;
    if (this.state === 'POTTERY' && this.game.chapter.stage === 'DECORATE')
      return this.decorateAt(event);
    if (this.state === 'POTTERY' && this.game.chapter.stage === 'IGNITE_KILN') {
      const igniter = this.models.workshop.userData.kilnIgniter;
      igniter.updateWorldMatrix(true, true);
      let hit = false;
      if (event.ray) {
        this.actionRaycaster.ray.copy(event.ray);
        hit = this.actionRaycaster.intersectObject(igniter, true).length > 0;
      } else if (event.position) {
        hit =
          igniter
            .getWorldPosition(new THREE.Vector3())
            .distanceTo(event.position) < 0.06;
      }
      return hit && this.game.input('light-kiln');
    }
    if (this.state === 'GATE') {
      this.root.updateWorldMatrix(true, true);
      const slots = this.models.gate.userData.slots;
      let slot;
      if (event.ray) {
        this.actionRaycaster.ray.copy(event.ray);
        const faces = [];
        for (const s of slots)
          s.object.traverse((o) => {
            if (o.isMesh) faces.push(o);
          });
        const hit = this.actionRaycaster.intersectObjects(faces, false)[0];
        if (hit)
          slot = slots.find((s) => {
            let o = hit.object;
            while (o) {
              if (o === s.object) return true;
              o = o.parent;
            }
            return false;
          });
      } else if (event.position) {
        slot = slots.find(
          (s) =>
            s.object
              .getWorldPosition(new THREE.Vector3())
              .distanceTo(event.position) < 0.08,
        );
      }
      if (!slot) return false;
      this.game.input('select-shape', { id: slot.id });
      return true;
    }
    // In XR the pot is held and tilted with a second hand/controller. Desktop
    // taps can animate it while a latched cup remains held by the virtual hand.
    if (this.state === 'COFFEE' && event.source === 'desktop') {
      const cup = this.targets.find((target) => target.id === 'cup');
      if (event.ray && this.pick(new THREE.Vector3(), event.ray) === cup) {
        this.toggleDesktopCup();
        return true;
      }
    }
    if (this.state === 'COFFEE' && event.source !== 'desktop') return false;
    const object =
      this.state === 'FRANKINCENSE'
        ? this.models.burner
        : this.state === 'COFFEE'
          ? this.models.coffee.userData.dallah
          : null;
    if (!object) return false;
    let hit = false;
    if (event.ray) {
      this.root.updateWorldMatrix(true, true);
      this.actionRaycaster.ray.copy(event.ray);
      const meshes = [];
      this.root.traverseVisible((child) => {
        if (child.isMesh) meshes.push(child);
      });
      let selected = this.actionRaycaster.intersectObjects(meshes, false)[0]
        ?.object;
      while (selected && selected !== this.root) {
        if (selected === object) {
          hit = true;
          break;
        }
        selected = selected.parent;
      }
    } else if (this.state === 'FRANKINCENSE' && event.position) {
      hit =
        this.root
          .worldToLocal(event.position.clone())
          .distanceTo(vec(L.frankincense.bowl.center)) < 0.15;
    }
    if (!hit) return false;
    if (this.state === 'FRANKINCENSE') this.game.input('light-coal');
    else if (this.pourAnimator.active) this.stopCoffeePour();
    else this.startCoffeePour();
    return true;
  }
  grabById(id) {
    this.release('assist', true);
    if (id !== 'coffee') this.pourAnimator?.cancel();
    const t = this.targets.find((t) => t.id === id);
    if (!t || !this.eligible(t)) return;
    const p = this.targetPoint(t);
    this.begin('assist', p);
    this.onHint(
      id === 'coffee'
        ? 'حرّك الدلة فوق الفنجان ثم اضبط الإمالة'
        : 'تم الإمساك — حرّك القطعة ثم ضعها',
    );
  }
  /** Desktop has one pointer: clicking the cup creates an explicit held grip. */
  toggleDesktopCup() {
    if (
      this.state !== 'COFFEE' ||
      this.game.paused ||
      this.game.chapter.completed
    )
      return false;
    const cup = this.targets.find((target) => target.id === 'cup');
    if (cup.owner === 'cup-latch') {
      this.release('cup-latch');
      return false;
    }
    if (cup.owner || !this.eligible(cup)) return false;
    this.begin('cup-latch', this.targetPoint(cup));
    const lifted = cup.object.parent.worldToLocal(
      this.root.localToWorld(vec([0.25, 0.16, 0.08])),
    );
    if (this.reduced) {
      cup.object.position.copy(lifted);
      cup.object.updateMatrixWorld(true);
    } else this.motion.move(cup.object, lifted, cup.rotation, 0.24);
    this.onHint('تحمل الفنجان الآن. أمِل الدلّة وأوقف السكب في النطاق الأخضر');
    return true;
  }
  cupPosition() {
    return this.root.worldToLocal(
      this.models.coffee.userData.cupMouth.getWorldPosition(
        new THREE.Vector3(),
      ),
    );
  }
  decorateAt(event) {
    const vase = this.models.vase;
    let local;
    if (event.ray) {
      vase.updateWorldMatrix(true, true);
      this.actionRaycaster.ray.copy(event.ray);
      const hit = this.actionRaycaster.intersectObject(vase, true)[0];
      if (!hit) return false;
      local = vase.worldToLocal(hit.point.clone());
    } else if (event.position) {
      local = vase.worldToLocal(event.position.clone());
      if (
        Math.hypot(local.x, local.z) > 0.14 ||
        local.y < 0 ||
        local.y > this.game.chapter.height
      )
        return false;
    }
    if (!local) return false;
    const band = vase.userData.decorationTargets.reduce((best, item) =>
      Math.abs(local.y - item.position[1]) <
      Math.abs(local.y - best.position[1])
        ? item
        : best,
    );
    this.game.input('decorate', { id: band.id });
    return true;
  }
  release(id, cancel = false) {
    if (this.tracing.delete(id)) this.game.input('interrupt');
    const g = this.grabs.get(id);
    if (!g) return;
    const t = g.target;
    this.grabs.delete(id);
    t.owner = null;
    if (!cancel && t.id !== 'cup')
      this.interactionSound('put-down', this.objectPoint(t));
    if (['resin', 'clay', 'sugar', 'saffron', 'nuts'].includes(t.id)) {
      const accepted =
        !cancel &&
        this.game.input('drop', {
          id: t.id,
          position: this.objectPoint(t).toArray(),
        });
      if (accepted) t.object.visible = false;
      else {
        this.returnHome(t, cancel);
        if (!cancel) this.onHint('قرّب القطعة من الحلقة المضيئة ثم أفلتها');
      }
    } else if (t.id === 'cup') {
      this.game.input('cup-held', { held: false });
      this.pourAnimator?.stop();
      this.returnHome(t, cancel);
    } else if (t.id === 'fan') {
      this.game.input('fan-held', { held: false });
      this.returnHome(t, cancel);
    } else if (t.id === 'scraper') {
      this.game.input('scraper-held', { held: false });
      this.returnHome(t, cancel);
    } else if (t.id === 'coffee') {
      this.returnHome(t, cancel);
      this.game.input(cancel ? 'interrupt' : 'stop-pour');
    } else if (t.cord) {
      const count = this.game.chapter?.snapshot().cordProgress?.[t.id] || 0;
      t.home.fromArray(
        count ? t.cord.definition.path[count - 1] : t.cord.definition.start,
      );
      this.returnHome(t, cancel);
    } else if (t.id === 'rope') this.returnHome(t, cancel);
    else if (t.id === 'stick') {
      this.game.input('interrupt');
      this.returnHome(t, cancel);
    }
  }
  returnHome(target, immediate = false) {
    this.motion.cancel(target.object);
    if (immediate || this.reduced) {
      target.object.position.copy(target.home);
      target.object.quaternion.copy(target.rotation);
      target.object.updateMatrixWorld(true);
    } else
      this.motion.move(
        target.object,
        target.home,
        target.rotation,
        target.id === 'coffee' ? 0.4 : 0.28,
      );
  }
  cancelAll() {
    this.tracing?.clear();
    for (const target of this.targets || [])
      if (this.motion?.items.has(target.object)) this.returnHome(target, true);
    this.motion?.clear();
    this.pourAnimator?.cancel();
    if (this.grabs)
      for (const id of [...this.grabs.keys()]) this.release(id, true);
    this.game?.input('interrupt');
    this.assist = null;
    this.shapeBaseline = null;
  }
  startCoffeePour() {
    if (
      this.state !== 'COFFEE' ||
      this.game.paused ||
      this.game.chapter?.completed ||
      this.game.chapter?.stage === 'RESETTING' ||
      this.pourAnimator?.active
    )
      return false;
    if (!this.targets.find((target) => target.id === 'cup')?.owner) {
      this.onHint('أمسك الفنجان أولاً، ثم أمِل الدلّة باليد الأخرى');
      return false;
    }
    for (const [id, grab] of this.grabs)
      if (grab.target.id === 'coffee') this.release(id, true);
    // An earlier release may still be returning the pot. Only one animator may
    // own its transform when a new pour starts partway through that return.
    this.motion.cancel(this.models.coffee.userData.dallah);
    // Keep pouring until the player stops; overfill remains a real possibility.
    const cupPosition = this.models.coffee.userData.dallah.parent.worldToLocal(
      this.root.localToWorld(this.cupPosition()),
    );
    return this.pourAnimator.start({ manualStop: true, cupPosition });
  }
  stopCoffeePour() {
    if (this.state !== 'COFFEE' || this.game.paused) return false;
    if (this.pourAnimator.active) return this.pourAnimator.stop();
    for (const [id, grab] of this.grabs)
      if (grab.target.id === 'coffee') this.release(id);
    this.tilt = 0;
    return this.game.input('stop-pour');
  }
  pointer(event) {
    if (this.game.paused || !this.game.chapter) return;
    if (!event.position?.toArray().every(Number.isFinite)) return;
    const p = this.root.worldToLocal(event.position.clone()),
      { phase, id } = event;
    if (phase === 'cancel') {
      this.game.input('interrupt');
      this.release(id, true);
      return;
    }
    if (phase === 'end') {
      this.release(id);
      return;
    }
    // Ignore a near-parallel ray or an invalid tracking sample, retaining the grip.
    if (p.length() > 2.5) return;
    if (this.state === 'GATE') {
      // Direct touch/drag engraving: no invisible tool or grip requirement.
      if (phase === 'start' && this.game.chapter.selectedShape) {
        this.tracing.add(id);
        this.game.input('interrupt');
      }
      if (this.tracing.has(id) && (phase === 'start' || phase === 'move')) {
        const gate = this.models.gate;
        const canonical = gate.userData.gateToPattern(
          gate.worldToLocal(event.position.clone()),
          this.game.chapter.selectedShape,
        );
        if (canonical) this.game.input('trace', { point: canonical.toArray() });
      }
      return;
    }
    if (phase === 'start') {
      this.begin(id, p, event.ray, event.quaternion);
      const grab = this.grabs.get(id);
      // Mouse rays are projected onto a working plane; keep the selected handle
      // centered rather than retaining the parallax offset of a different depth.
      if (grab && (event.source === 'desktop' || event.source === 'controller'))
        grab.offset = this.objectPoint(grab.target).sub(
          this.targetPoint(grab.target),
        );
      if (grab && event.source === 'controller')
        grab.localGrip.copy(grab.target.offset);
      if (grab?.target.id === 'vase')
        grab.shapeStart = {
          height: this.game.chapter.height,
          width: this.game.chapter.width,
          y: p.y,
          x: Math.abs(p.x),
        };
      return;
    }
    if (phase === 'hover') {
      const target = this.pick(p, event.ray);
      this.hoverHalo.visible = !!target;
      if (target) {
        this.hoverHalo.position.copy(this.targetPoint(target, !!event.ray));
        this.hoverHalo.scale.setScalar(target.radius / 0.045);
        if (target.id === 'lantern' && event.source === 'hand')
          this.game.input('touch');
      }
    }
    const g = this.grabs.get(id);
    if (!g) return;
    const t = g.target;
    const hasRotation =
      event.quaternion &&
      event.quaternion.toArray().every(Number.isFinite) &&
      event.quaternion.lengthSq() > 0.001 &&
      g.initialQ;
    const followsWrist =
      hasRotation &&
      event.source !== 'desktop' &&
      (event.freeGrip || ['scraper', 'coffee', 'fan'].includes(t.id));
    if (followsWrist) {
      const parentQ = t.object.parent.getWorldQuaternion(
        new THREE.Quaternion(),
      );
      t.object.quaternion
        .copy(
          parentQ
            .invert()
            .multiply(
              event.quaternion
                .clone()
                .normalize()
                .multiply(g.initialQ.clone().invert())
                .multiply(g.baseQ),
            ),
        )
        .normalize();
    }
    if (t.id === 'scraper') {
      if (event.source === 'hand') {
        this.placeGrip(g, p);
      } else this.setToolTip(t, p);
      this.sampleTool(t);
    } else if (t.cord) {
      const next = p.clone().add(g.offset);
      if (next.length() > 1.8) {
        this.release(id, true);
        return;
      }
      if (next.distanceTo(this.objectPoint(t)) > 0.003)
        this.interactionSound('rope-rub', next);
      this.setPoint(t, next);
      const local = this.models.dhow.worldToLocal(
        t.object.getWorldPosition(new THREE.Vector3()),
      );
      this.game.input('weave', { id: t.id, position: local.toArray() });
      if (this.game.chapter.snapshot().mountedCords.includes(t.id))
        this.release(id);
    } else if (t.id === 'rope') {
      const home = this.root.worldToLocal(
        t.object.parent.localToWorld(t.home.clone()),
      );
      const next = home.clone();
      next.y = THREE.MathUtils.clamp(p.y + g.offset.y, home.y - 0.22, home.y);
      this.pullRope(t, next);
    } else if (t.id === 'vase') {
      const start = g.shapeStart;
      this.game.input('shape', {
        height: start.height + p.y - start.y,
        width: start.width + (Math.abs(p.x) - start.x) * 4,
      });
    } else if (t.id === 'stick') {
      const x = p.x,
        z = p.z,
        r = Math.hypot(x, z);
      const stirring = this.game.input('stir', {
        angle: Math.atan2(z, x),
        radius: r,
        dt: event.dt || 1 / 60,
      });
      t.object.position.set(x, 0.29, z);
      if (stirring) this.interactionSound('stirring', vec([x, 0.29, z]));
    } else {
      const next = p.clone().add(g.offset);
      if (next.distanceTo(g.last.clone().add(g.offset)) > 0.01)
        this.interactionSound('object-move', next);
      if (event.source !== 'hand' && !event.freeGrip) {
        if (t.id === 'clay') next.z = 0.18;
        else if (t.id === 'fan') next.z = 0.24;
        else if (t.id !== 'coffee' && t.id !== 'cup') next.z = 0;
      }
      if (next.length() < 1.8) {
        if (followsWrist) this.placeGrip(g, p);
        else this.setPoint(t, next);
      } else {
        this.release(id, true);
        return;
      }
      if (t.id === 'fan') {
        if (!followsWrist)
          t.object.rotation.z = THREE.MathUtils.clamp(-p.x * 2, -0.55, 0.55);
        this.game.input('fan', {
          position: this.objectPoint(t).toArray(),
          time: this.elapsed,
        });
      }
    }
    g.last.copy(p);
  }
  /** Rotating the vessel must not pull its original contact point out of the hand. */
  placeGrip(grab, point) {
    const object = grab.target.object;
    const anchor = object.parent.worldToLocal(
      this.root.localToWorld(point.clone()),
    );
    object.position.copy(
      anchor.sub(
        grab.localGrip
          .clone()
          .multiply(object.scale)
          .applyQuaternion(object.quaternion),
      ),
    );
    object.updateMatrixWorld(true);
  }
  desktopPlane(ray, id, stage) {
    const g = this.grabs.get(id);
    let normal = new THREE.Vector3(0, 0, 1),
      point = new THREE.Vector3(0, 0, 0);
    if (this.state === 'GATE') point.z = this.models.gate.userData.frontZ;
    else if (this.state === 'DHOW' && g?.target.cord) {
      const cord = g.target.cord.definition;
      const count = this.game.chapter.snapshot().cordProgress[cord.id] || 0;
      point.copy(
        this.root.worldToLocal(
          this.models.dhow.localToWorld(
            vec(cord.path[Math.min(count, cord.path.length - 1)]),
          ),
        ),
      );
    } else if (this.state === 'FRANKINCENSE' && stage === 'SCRAPE_TREE')
      point.copy(
        this.root.worldToLocal(
          this.models.tree.localToWorld(vec([0, 0.38, 0.045])),
        ),
      );
    else if (this.state === 'HALWA' && stage === 'STIR') {
      normal.set(0, 1, 0);
      point.y = 0.29;
    } else if (this.state === 'HALWA' && stage === 'FAN_FIRE') point.z = 0.24;
    else if (g?.target.id === 'clay' || g?.target.id === 'vase') point.z = 0.18;
    else if (g?.target.id === 'coffee' || g?.target.id === 'cup')
      point.z = 0.08;
    this.root.updateMatrixWorld(true);
    point = this.root.localToWorld(point);
    normal.transformDirection(this.root.matrixWorld);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal,
      point,
    );
    if (Math.abs(normal.dot(ray.direction)) < 0.12) return null;
    return ray.intersectPlane(plane, new THREE.Vector3());
  }
  shapeWithHands(hands) {
    if (this.state !== 'POTTERY' || this.game.chapter?.stage !== 'SHAPE')
      return;
    const active = hands.filter((h) => h.tracked && h.pinching);
    if (active.length < 2) {
      this.shapeBaseline = null;
      return;
    }
    const a = this.root.worldToLocal(active[0].index.clone()),
      b = this.root.worldToLocal(active[1].index.clone());
    const center = a.clone().add(b).multiplyScalar(0.5);
    if (center.distanceTo(vec([0, 0.35, 0.18])) > 0.35) {
      this.shapeBaseline = null;
      return;
    }
    if (!this.shapeBaseline)
      this.shapeBaseline = {
        height: this.game.chapter.height,
        y: center.y,
        separation: a.distanceTo(b) / this.game.chapter.width,
      };
    const shape = GestureDetector.handShape(
      a.toArray(),
      b.toArray(),
      this.shapeBaseline,
    );
    if (shape) this.game.input('shape', shape);
  }
  assistStart(action) {
    this.assist = action;
    this.assistTimer = 0;
    if (action === 'trace') this.game.input('interrupt');
    if (action === 'scrape-tree') {
      const toolId = 'scraper';
      const tool = this.targets.find((t) => t.id === toolId);
      if (!tool?.owner) this.grabById(toolId);
    }
    if (action === 'pull') {
      const t = this.targets.find((t) => t.id === 'rope');
      if (t && !t.owner) this.begin('assist', this.targetPoint(t));
    }
    if (action === 'stir') {
      const t = this.targets.find((t) => t.id === 'stick');
      if (t && !t.owner) this.begin('assist', this.targetPoint(t));
    }
    if (action === 'fan') {
      const t = this.targets.find((target) => target.id === 'fan');
      if (t && !t.owner) {
        this.release('assist', true);
        this.begin('assist', this.targetPoint(t));
      }
    }
  }
  assistEnd() {
    if (this.assist === 'trace') this.game.input('interrupt');
    this.assist = null;
    if (this.grabs.get('assist')?.target.id === 'stick') this.release('assist');
    if (this.grabs.get('assist')?.target.id === 'rope') this.release('assist');
    if (this.grabs.get('assist')?.target.id === 'fan') this.release('assist');
    if (this.grabs.get('assist')?.target.id === 'scraper')
      this.release('assist');
    if (
      this.state === 'FRANKINCENSE' &&
      this.game.chapter?.stage === 'SCRAPE_TREE'
    )
      this.game.input('interrupt');
  }
  updateAssist(dt) {
    if (!this.assist) return;
    this.assistTimer += dt;
    const action = this.assist,
      g = this.grabs.get('assist');
    if (action === 'trace' && this.state === 'GATE') {
      // Hold-to-trace accessibility aid uses the same ordered path checks.
      if (this.assistTimer >= 0.09) {
        this.assistTimer %= 0.09;
        const next = this.game.chapter?.path?.[this.game.chapter.index];
        if (next) this.game.input('trace', { point: next });
      }
    } else if (action === 'pull') {
      if (g) {
        const home = this.root.worldToLocal(
          g.target.object.parent.localToWorld(g.target.home.clone()),
        );
        // Continuous down/up stroke: no sawtooth jump at the end of a pull.
        home.y -= 0.11 * (1 - Math.cos(this.assistTimer * 1.3));
        this.pullRope(g.target, home);
      }
    } else if (action === 'stir') {
      const a = this.elapsed * 1.9;
      if (g) {
        const position = this.movePoint(
          g.target,
          vec([Math.cos(a) * 0.12, 0.29, Math.sin(a) * 0.12]),
          dt,
          0.4,
        );
        const stirring = this.game.input('stir', {
          angle: Math.atan2(position.z, position.x),
          radius: Math.hypot(position.x, position.z),
          dt,
        });
        if (stirring) this.interactionSound('stirring', position);
      }
    } else if (action === 'scrape-tree' && g?.target.id === 'scraper') {
      const point = this.models.tree.localToWorld(
        vec([0, 0.38 + Math.sin(this.assistTimer * 4) * 0.1, 0.045]),
      );
      this.moveToolTip(g.target, this.root.worldToLocal(point), dt, 0.65);
      this.sampleTool(g.target);
    } else if (action === 'fan' && g?.target.id === 'fan') {
      const position = this.movePoint(
        g.target,
        vec([Math.sin(this.assistTimer * 5) * 0.14, 0.12, 0.24]),
        dt,
        0.8,
      );
      g.target.object.rotation.z = THREE.MathUtils.damp(
        g.target.object.rotation.z,
        -position.x * 2,
        12,
        dt,
      );
      this.game.input('fan', {
        position: position.toArray(),
        time: this.elapsed,
      });
    } else if (g) {
      let dest;
      if (action === 'resin') dest = vec([0, 0.49, 0]);
      else if (action === 'clay') dest = vec([0, 0.2, 0.18]);
      else if (['sugar', 'saffron', 'nuts'].includes(action))
        dest = vec([0, 0.25, 0]);
      else if (action === 'coffee') {
        const transformed = this.models.coffee.userData.spout.position
          .clone()
          .applyQuaternion(g.target.object.quaternion);
        dest = this.cupPosition()
          .add(vec([0, 0.14, 0]))
          .sub(transformed);
      }
      if (dest) {
        const current = this.objectPoint(g.target);
        current.lerp(dest, 1 - Math.exp(-dt * 3));
        this.setPoint(g.target, current);
      }
    }
  }
  toolTip(target) {
    return this.models.tree.userData.scraperTip;
  }
  /** Pull credit follows the visible, constrained handle, never an off-scene hand. */
  pullRope(target, next) {
    const distance = this.objectPoint(target).y - next.y;
    if (distance > L.dhow.maxStep) return;
    this.setPoint(target, next);
    if (distance > 0) this.game.input('pull', { distance });
  }
  movePoint(target, desired, dt, speed) {
    const current = this.objectPoint(target);
    const distance = current.distanceTo(desired);
    current.lerp(
      desired,
      distance > 0 ? Math.min(1, (speed * dt) / distance) : 1,
    );
    this.setPoint(target, current);
    return current;
  }
  /** Remote pointer placement moves the actual tool; joints retain their grip pose. */
  setToolTip(target, desired) {
    const tip = this.root.worldToLocal(
      this.toolTip(target).getWorldPosition(new THREE.Vector3()),
    );
    this.setPoint(
      target,
      this.objectPoint(target).add(desired.clone().sub(tip)),
    );
  }
  moveToolTip(target, desired, dt, speed) {
    const current = this.root.worldToLocal(
      this.toolTip(target).getWorldPosition(new THREE.Vector3()),
    );
    const distance = current.distanceTo(desired);
    current.lerp(
      desired,
      distance > 0 ? Math.min(1, (speed * dt) / distance) : 1,
    );
    this.setToolTip(target, current);
  }
  sampleTool(target) {
    if (!target.owner) return;
    const tip = this.toolTip(target).getWorldPosition(new THREE.Vector3());
    this.game.input('scrape-tree', {
      position: this.models.tree.worldToLocal(tip).toArray(),
      time: this.elapsed,
    });
  }
  /** Canonical engraving coordinates follow the actual resized, hinged inlay. */
  engravingPoint(point, shapeId = this.game.chapter?.selectedShape) {
    const gate = this.models.gate;
    const local = gate?.userData.patternToGate(point, shapeId);
    return local
      ? this.root.worldToLocal(gate.localToWorld(local))
      : point.isVector3
        ? point.clone()
        : vec(point);
  }
  interactionSound(type, point) {
    this.audio.effect(type, this.root.localToWorld(point.clone()).toArray());
  }
  event(e) {
    if (e.type === 'invalid-drop') return;
    const local =
      e.type === 'carve'
        ? this.engravingPoint(e.point || [0, 0.4, 0], e.id)
        : e.type === 'kiln-start'
          ? this.root.worldToLocal(
              this.models.workshop.userData.kilnIgniter.getWorldPosition(
                new THREE.Vector3(),
              ),
            )
          : this.targets.find((t) => t.id === e.id)
            ? this.targetPoint(this.targets.find((t) => t.id === e.id))
            : vec([0, 0.35, 0]);
    const sound =
      e.type === 'chapter-complete' && this.state === 'GATE'
        ? 'door-open'
        : e.type;
    this.interactionSound(sound, local);
    if (e.type === 'symbol-earned') {
      this.particles.emit(vec([0, 0.5, 0]), 'gold', 65);
      this.onHint(`لمسة جديدة! ${e.count} / 5`);
    }
    if (e.type === 'carve') {
      const p = e.point || this.game.chapter?.path?.[e.index - 1];
      if (p) this.particles.emit(this.engravingPoint(p, e.id), 'gold', 2);
    }
    if (e.type === 'ingredient-added')
      this.particles.emit(vec([0, 0.27, 0]), 'gold', 14);
    if (e.type === 'clay-placed') {
      this.models.vase.visible = true;
      this.models.targetVase.visible = true;
      this.models.workshop.userData.clay.visible = false;
    }
    if (e.type === 'halwa-cooked') {
      this.models.halwa.userData.servingBowl.visible = true;
      this.smoke.start();
    }
    if (e.type === 'incense-lit') {
      this.smoke.start();
      this.models.burner.userData.setLit(true);
      this.models.tree.userData.resin.visible = false;
    }
    if (e.type === 'coal-lit') this.models.burner.userData.setLit(true);
    if (e.type === 'resin-collected') this.models.tree.userData.revealResin();
    if (e.type === 'pottery-decorated')
      this.models.vase.userData.setDecoration(this.game.chapter.decorations);
    if (e.type === 'pottery-shaped') this.models.vase.rotation.y = 0;
    if (e.type === 'pour-failed') {
      this.cancelAll();
      this.tilt = 0;
      this.models.coffee.userData.stream.visible = false;
    }
  }
  update(dt) {
    this.elapsed += dt;
    this.motion.update(dt);
    this.root.scale.setScalar(
      this.reduced ? 1 : Math.min(1, 0.97 + this.elapsed * 0.06),
    );
    this.updateAssist(dt);
    const c = this.game.chapter;
    this.particles.update(dt);
    this.smoke.update(dt, this.reduced);
    this.water.update(dt, this.reduced);
    this.confetti?.update(dt, this.reduced);
    this.fire?.update(dt, this.reduced);
    if (!c) return;
    if (this.state === 'GATE') {
      this.models.gate.userData.setEngravingProgress(c.snapshot());
      if (c.completed) {
        const t = 1 - Math.exp(-dt * 2);
        const g = this.models.gate;
        g.userData.leftDoor.rotation.y = THREE.MathUtils.lerp(
          g.userData.leftDoor.rotation.y,
          -1.45,
          t,
        );
        g.userData.rightDoor.rotation.y = THREE.MathUtils.lerp(
          g.userData.rightDoor.rotation.y,
          1.45,
          t,
        );
        g.userData.backLight.intensity = 1.5;
      }
    }
    if (this.state === 'FRANKINCENSE') {
      this.models.burner.userData.updateEmbers(this.elapsed);
      this.models.tree.userData.setScrapeProgress(
        c.scraping.strokes / FRANKINCENSE_SCRAPE_STROKES,
      );
    }
    if (this.state === 'DHOW') {
      const ship = this.models.dhow;
      setSailProgress(ship, c.snapshot().hoistProgress || 0);
      ship.userData.setRigProgress(c.snapshot());
      this.water.active = c.completed;
      if (c.completed && !this.reduced) {
        this.dhowFloatTime += dt;
        ship.rotation.z = Math.sin(this.dhowFloatTime * 1.7) * 0.025;
      }
      updateFlag(ship.userData.flag, this.elapsed, this.reduced);
      const handle = ship.userData.ropeHandle;
      const a = this.models.ropeLine.geometry.attributes.position;
      a.setXYZ(1, handle.position.x, handle.position.y, handle.position.z);
      a.needsUpdate = true;
    }
    if (this.state === 'POTTERY') {
      const vase = this.models.vase;
      this.models.workshop.userData.setKilnState(c.stage);
      vase.visible = c.stage !== 'PLACE_CLAY';
      this.models.targetVase.visible = c.stage === 'SHAPE';
      vase.userData.showDecorationGuides?.(c.stage === 'DECORATE');
      if (c.stage === 'SHAPE') {
        this.models.workshop.userData.wheel.rotation.y += dt * 2;
        vase.rotation.y += this.reduced ? 0 : dt * 0.6;
        updateVase(vase, c.height, c.width * 0.2);
      }
      if (c.stage === 'FIRING' || c.completed) {
        if (c.stage === 'FIRING')
          this.interactionSound(
            'kiln-burning',
            this.root.worldToLocal(
              this.models.workshop.localToWorld(
                this.models.workshop.userData.kilnCenter.clone(),
              ),
            ),
          );
        const t = Math.min(1, c.firing / 1.2);
        const kiln = this.root.worldToLocal(
          this.models.workshop.localToWorld(
            this.models.workshop.userData.kilnCenter.clone(),
          ),
        );
        vase.position.lerpVectors(vec([0, 0.18, 0.18]), kiln, t);
      }
    }
    if (this.state === 'HALWA') {
      const m = this.models.halwa.userData;
      m.swirl.rotation.y = c.turns || 0;
      m.mixture.material.color.lerp(
        new THREE.Color(
          c.stage === 'FAN_FIRE' || c.completed ? 0x753a1d : 0xb37835,
        ),
        dt * 0.6,
      );
      if (c.completed) m.servingBowl.visible = true;
    }
    if (this.state === 'COFFEE') {
      const m = this.models.coffee.userData,
        owner = this.targets.find((t) => t.id === 'coffee')?.owner;
      const cup = this.cupPosition();
      if (this.pourAnimator.active)
        this.pourAnimator.setCupPosition(
          m.dallah.parent.worldToLocal(this.root.localToWorld(cup.clone())),
        );
      this.pourAnimator.update(dt);
      // Slider/keyboard input is a target angle, never an instantaneous rotation.
      if (owner === 'assist' || owner === 'desktop')
        m.dallah.rotation.z = THREE.MathUtils.damp(
          m.dallah.rotation.z,
          -this.tilt,
          7,
          dt,
        );
      const holding = owner || this.pourAnimator.active;
      m.dallah.updateMatrixWorld(true);
      const spout = this.root.worldToLocal(
          m.spout.getWorldPosition(new THREE.Vector3()),
        ),
        up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.dallah.quaternion),
        angle = Math.acos(THREE.MathUtils.clamp(up.y, -1, 1));
      const cupHeld = !!this.targets.find((t) => t.id === 'cup')?.owner;
      const aligned =
        cupHeld &&
        Math.hypot(spout.x - cup.x, spout.z - cup.z) < 0.045 &&
        spout.y > cup.y &&
        spout.y < cup.y + 0.25;
      const pouring =
        !!holding &&
        aligned &&
        angle >= L.coffee.minAngle &&
        angle <= L.coffee.maxAngle &&
        !c.completed &&
        c.stage !== 'RESETTING';
      this.game.input('pour', { angle, aligned: !!holding && aligned, dt });
      m.stream.visible = pouring && c.isPouring;
      if (m.stream.visible) this.interactionSound('pouring', spout);
      if (m.stream.visible) {
        const end = cup.clone();
        end.copy(
          this.root.worldToLocal(
            m.liquid.getWorldPosition(new THREE.Vector3()),
          ),
        );
        const distance = spout.distanceTo(end);
        m.stream.position.copy(spout).add(end).multiplyScalar(0.5);
        m.stream.scale.y = distance;
        m.stream.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          spout.clone().sub(end).normalize(),
        );
      }
      m.liquid.visible = c.fillLevel > 0;
      m.liquid.position.y = 0.025 + 0.05 * c.fillLevel;
      this.dropHalo.position.copy(cup);
    }
    if (this.state === 'FINALE') {
      this.models.lantern.scale.setScalar(Math.min(1, this.elapsed / 1.6));
      pulseLight(this.models.lantern.userData.light, this.elapsed, {
        reduced: this.reduced,
      });
      this.models.symbols.forEach((s, i) => {
        const a =
          (i * Math.PI * 2) / 5 + (this.reduced ? 0 : this.elapsed * 0.25);
        s.position.set(
          Math.cos(a) * 0.36,
          0.38 + Math.sin(a * 0.7) * 0.08,
          Math.sin(a) * 0.25,
        );
        s.rotation.y = this.reduced ? 0 : this.elapsed * 0.3;
      });
      updateFlag(this.models.flag, this.elapsed, this.reduced);
    }
    if (this.dropHalo) {
      this.dropHalo.material.opacity = this.grabs.size ? 0.7 : 0.3;
      this.dropHalo.rotation.z = this.reduced
        ? 0
        : Math.sin(this.elapsed) * 0.03;
    }
  }
  emitTimed(dt, p, type, interval) {
    this.effectTimer += dt;
    if (this.effectTimer >= interval) {
      this.effectTimer = 0;
      this.particles.emit(vec(p), type, this.reduced ? 1 : 3);
    }
  }
  dispose() {
    this.cancelAll();
    this.particles.dispose();
    this.resources.dispose(this.root);
  }
}
