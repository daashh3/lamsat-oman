import * as THREE from 'three';
import { textPanel, drawPanel } from './ArabicText.js';
import { CHAPTERS, NARRATION } from '../app/Config.js';

/** A world-fixed reading board. Only entering XR or explicit recenter places it. */
export class HUD {
  constructor(
    parent,
    onAction,
    { occluders = () => [], cupLatched = () => false } = {},
  ) {
    this.root = new THREE.Group();
    this.root.name = 'Fixed reading lectern';
    this.root.position.set(0.94, 0.48, -0.17);
    this.root.rotation.y = -0.854;
    parent.add(this.root);
    this.root.visible = false;
    this.onAction = onAction;
    this.occluders = occluders;
    this.cupLatched = cupLatched;
    this.needsPlacement = true;
    this.subtitles = true;
    this.last = '';
    this.audioStatus = { effectsMuted: false };
    this.vrState = { active: false, thirdPerson: false };
    this.movementMenu = false;
    this.contacts = new Map();
    this.hovered = new Map();
    this.cooldowns = new Map();
    this.touchLocks = new Set();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 6;

    this.panel = textPanel(0.62, 0.25);
    this.panel.position.set(0, 0.275, 0.006);
    this.story = textPanel(0.62, 0.15);
    this.story.position.set(0, 0.05, 0.006);
    this.root.add(this.panel, this.story);
    const material = new THREE.MeshStandardMaterial({
      color: 0x193a35,
      roughness: 0.8,
    });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.69, 0.97, 0.035),
      material,
    );
    frame.position.set(0, -0.025, -0.025);
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.045, 0.28),
      material,
    );
    foot.position.set(0, -0.535, -0.09);
    this.root.add(frame, foot);
    this.furniture = [frame, foot];
    // Contextual controls come first, with stable utilities underneath.
    const labels = [
      ['shape-slot-star', 'قالب النجمة'],
      ['shape-slot-square', 'قالب المربع'],
      ['shape-slot-random', 'قالب مبتكر'],
      ['light-coal', 'أشعل الفحم'],
      ['light-kiln', 'أشعل الفرن'],
      ['decorate-0', 'النقش السفلي'],
      ['decorate-1', 'النقش الأوسط'],
      ['decorate-2', 'النقش العلوي'],
      ['hold-cup', 'حمل الفنجان'],
      ['pour-coffee', 'ابدأ السكب'],
      ['stop-pour', 'أوقف السكب'],
      ['move-forward', 'خطوة للأمام'],
      ['move-backward', 'خطوة للخلف'],
      ['turn-left', 'دوران يسار ٣٠°'],
      ['turn-right', 'دوران يمين ٣٠°'],
      ['third-person', 'المنظور الثالث'],
      ['pause', 'إيقاف مؤقت'],
      ['recenter', 'إعادة التمركز'],
      ['effects', 'كتم المؤثرات'],
      ['restart', 'إعادة المحطة'],
      ['exit', 'خروج'],
    ];
    this.buttons = labels.map(([action, label]) => {
      const button = textPanel(0.295, 0.09);
      Object.assign(button.userData, { action, label, labelKey: '' });
      button.visible = false;
      this.root.add(button);
      return button;
    });
    document.fonts?.ready.then(() => {
      this.last = '';
      for (const button of this.buttons) button.userData.labelKey = '';
    });
  }

  place(viewerPosition) {
    if (
      !this.needsPlacement ||
      !viewerPosition?.toArray().every(Number.isFinite)
    )
      return;
    const viewer = this.root.parent.worldToLocal(viewerPosition.clone());
    this.root.position.set(
      Math.max(0.92, viewer.x + 0.94),
      THREE.MathUtils.clamp(viewer.y - 0.12, 0.35, 0.68),
      Math.min(0.12, viewer.z - 0.82),
    );
    const meshes = [];
    for (const root of this.occluders()) {
      root.updateWorldMatrix(true, true);
      root.traverseVisible((object) => {
        if (object.isMesh && object.material?.depthWrite !== false)
          meshes.push(object);
      });
    }
    const check = new THREE.Raycaster();
    // A tall door must not mask the left column. Check the board once during
    // placement and move it sideways if necessary; never chase head motion.
    for (let attempt = 0; attempt < 12; attempt++) {
      this.root.rotation.set(
        0,
        Math.atan2(
          viewer.x - this.root.position.x,
          viewer.z - this.root.position.z,
        ),
        0,
      );
      this.root.updateWorldMatrix(true, true);
      let blocked = false;
      for (const x of [-0.33, 0, 0.33])
        for (const y of [-0.47, 0, 0.41]) {
          const target = this.root.localToWorld(new THREE.Vector3(x, y, 0.006));
          const direction = target.sub(viewerPosition);
          check.set(viewerPosition, direction.clone().normalize());
          check.far = direction.length() - 0.005;
          if (check.intersectObjects(meshes, false).length) blocked = true;
        }
      if (!blocked || attempt === 11) break;
      this.root.position.x += 0.05;
    }
    this.needsPlacement = false;
    this.clearInput();
  }

  setAudioState(status) {
    this.audioStatus = status;
  }

  setVRState(state) {
    this.vrState = { ...this.vrState, ...state };
    if (!this.vrState.active) this.movementMenu = false;
    this.last = '';
  }

  toggleMovementMenu() {
    if (!this.vrState.active) return;
    this.movementMenu = !this.movementMenu;
    this.last = '';
  }

  update(snapshot) {
    if (!this.root.visible) return;
    const chapter = snapshot.chapter || {};
    const title = (CHAPTERS[snapshot.state]?.title || 'لمسة عُمان').replace(
      '🇴🇲',
      '',
    );
    const instruction = snapshot.paused
      ? 'متوقفة مؤقتاً — اختر متابعة الرحلة'
      : chapter.instruction || '';
    const lines = [`${title} · ${snapshot.progress.count}/5`, instruction];
    if (snapshot.state === 'COFFEE')
      lines.push(
        `الفنجان ${Math.round((chapter.fillLevel || 0) * 100)}٪ · الهدف ٦٠–٨٠٪`,
      );
    const key = JSON.stringify([
      lines,
      this.subtitles,
      snapshot.state,
      this.vrState,
      this.movementMenu,
    ]);
    if (key !== this.last) {
      drawPanel(
        this.panel,
        this.movementMenu
          ? [
              'الحركة والمنظور',
              'العصا اليسرى للحركة • اليمنى للدوران',
              'حرّك رأسك للنظر بحرية',
            ]
          : lines,
        { fontSize: 56 },
      );
      drawPanel(
        this.story,
        this.vrState.active
          ? [
              this.movementMenu
                ? 'العودة إلى أدوات المحطة ←'
                : 'الحركة والمنظور ←',
              this.movementMenu
                ? 'يمكن أيضاً لمس الأزرار باليد'
                : 'تحرّك، استدر، أو اختر المنظور الثالث',
            ]
          : [NARRATION[snapshot.state] || ''],
        {
          fontSize: 46,
        },
      );
      this.story.userData.action = this.vrState.active ? 'movement-menu' : null;
      this.story.visible = this.vrState.active || this.subtitles;
      this.last = key;
    }
    for (const button of this.buttons) {
      const { action } = button.userData;
      let label = button.userData.label,
        disabled = false,
        selected = false;
      const contextual =
        action.startsWith('shape-slot-') ||
        action.startsWith('decorate-') ||
        [
          'light-coal',
          'light-kiln',
          'hold-cup',
          'pour-coffee',
          'stop-pour',
          'move-forward',
          'move-backward',
          'turn-left',
          'turn-right',
          'third-person',
        ].includes(action);
      let visible = !contextual;
      if (!snapshot.paused && !chapter.completed) {
        if (action.startsWith('shape-slot-')) {
          visible = snapshot.state === 'GATE';
          const id = action.slice(11);
          disabled = chapter.finishedShapes?.includes(id) || false;
          selected = chapter.selectedShape === id;
          if (disabled) label += ' ✓';
        } else if (action.startsWith('decorate-')) {
          visible =
            snapshot.state === 'POTTERY' && chapter.stage === 'DECORATE';
          disabled =
            chapter.decorations?.includes(Number(action.slice(9))) || false;
          if (disabled) label += ' ✓';
        } else if (action === 'light-coal')
          visible =
            snapshot.state === 'FRANKINCENSE' && chapter.stage === 'LIGHT_COAL';
        else if (action === 'light-kiln')
          visible =
            snapshot.state === 'POTTERY' && chapter.stage === 'IGNITE_KILN';
        else if (['hold-cup', 'pour-coffee', 'stop-pour'].includes(action)) {
          visible =
            snapshot.state === 'COFFEE' && chapter.stage !== 'RESETTING';
          if (action === 'hold-cup') {
            label = !chapter.cupHeld
              ? 'حمل الفنجان'
              : this.cupLatched()
                ? 'إرجاع الفنجان'
                : 'الفنجان في يدك';
            disabled = chapter.cupHeld && !this.cupLatched();
          }
          if (action === 'pour-coffee') disabled = !chapter.cupHeld;
        }
      }
      if (this.movementMenu) {
        visible = [
          'move-forward',
          'move-backward',
          'turn-left',
          'turn-right',
          'third-person',
          'pause',
          'recenter',
          'effects',
        ].includes(action);
        disabled =
          snapshot.paused &&
          [
            'move-forward',
            'move-backward',
            'turn-left',
            'turn-right',
            'third-person',
          ].includes(action);
      }
      if (action === 'third-person') {
        label = this.vrState.thirdPerson
          ? 'العودة للمنظور الأول'
          : 'المنظور الثالث';
        selected = this.vrState.thirdPerson;
      }
      if (action === 'pause')
        label = snapshot.paused ? 'متابعة الرحلة' : 'إيقاف مؤقت';
      if (action === 'effects')
        label = this.audioStatus.effectsMuted
          ? 'تشغيل المؤثرات'
          : 'كتم المؤثرات';
      button.visible = visible;
      button.userData.disabled = disabled;
      const labelKey = JSON.stringify([label, disabled, selected]);
      if (button.userData.labelKey !== labelKey) {
        drawPanel(button, [label], {
          fontSize: 66,
          background: selected ? '#285c4e' : '#102a2c',
          color: disabled ? '#8d9a92' : '#f4ddaf',
        });
        button.userData.labelKey = labelKey;
      }
    }
    this.buttons
      .filter((button) => button.visible)
      .forEach((button, index) => {
        button.position.set(
          index % 2 ? -0.1625 : 0.1625,
          -0.095 - Math.floor(index / 2) * 0.105,
          0.006,
        );
      });
    // A disappearing control must not leave a stale highlight on another chapter.
    for (const [id, panel] of this.hovered)
      if (!panel.visible) this.hovered.delete(id);
    this.updateHighlights();
  }

  rayHit(ray, targets) {
    this.raycaster.ray.copy(ray);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    // Respect solid exhibits between the hand/controller and the board.
    for (const root of this.occluders?.() || []) {
      const meshes = [];
      root.traverseVisible((object) => {
        if (object.isMesh && object.material?.depthWrite !== false)
          meshes.push(object);
      });
      const obstacle = this.raycaster.intersectObjects(meshes, false)[0];
      if (obstacle && obstacle.distance < hit.distance - 0.005) return null;
    }
    return hit.object;
  }

  interact(event) {
    if (!this.root.visible) return false;
    if (event.phase === 'end' || event.phase === 'cancel') {
      this.releasePointer(event.id, event.phase === 'cancel');
      return false;
    }
    this.touchLocks ||= new Set();
    this.root.updateWorldMatrix(true, true);
    const targets = [this.panel, this.story, ...this.buttons].filter(
      (object) => object.visible,
    );
    let hit,
      remote = !!event.ray;
    if (event.ray) hit = this.rayHit(event.ray, targets);
    else if (event.position?.toArray().every(Number.isFinite)) {
      hit = targets.find((object) => {
        const p = object.worldToLocal(event.position.clone());
        return (
          Math.abs(p.x) < object.userData.panelWidth / 2 &&
          Math.abs(p.y) < object.userData.panelHeight / 2 &&
          p.z >= -0.006 &&
          p.z < 0.035
        );
      });
    }
    if (!hit && event.uiRay) {
      hit = this.rayHit(event.uiRay, targets);
      remote = !!hit;
    }
    if (!hit) {
      this.contacts.delete(event.id);
      this.hovered.delete(event.id);
      this.touchLocks.delete(event.id);
      this.updateHighlights();
      return false;
    }
    this.hovered.set(event.id, hit);
    this.updateHighlights();
    const directTouch = event.source === 'hand' && !remote;
    if (
      hit.userData.action &&
      !hit.userData.disabled &&
      (event.phase === 'start' || (directTouch && event.phase === 'hover'))
    ) {
      const now = performance.now();
      if (
        !this.contacts.has(event.id) &&
        (!directTouch || !this.touchLocks.has(event.id)) &&
        now - (this.cooldowns.get(event.id) ?? -Infinity) > 300
      ) {
        this.contacts.set(event.id, hit);
        this.cooldowns.set(event.id, now);
        if (directTouch) this.touchLocks.add(event.id);
        this.onAction(hit.userData.action);
      }
    }
    return true;
  }

  releasePointer(id, cancelled = false) {
    this.contacts.delete(id);
    this.hovered.delete(id);
    if (cancelled) this.touchLocks?.delete(id);
    this.updateHighlights();
  }
  clearInput() {
    this.contacts.clear();
    this.hovered.clear();
    this.cooldowns.clear();
    this.touchLocks.clear();
    this.updateHighlights();
  }
  updateHighlights() {
    const active = new Set(this.hovered.values());
    for (const panel of [this.panel, this.story, ...this.buttons])
      panel.material.color.set(
        active.has(panel) && !panel.userData.disabled ? 0xb9eadc : 0xffffff,
      );
  }
  dispose() {
    for (const part of this.furniture) part.geometry.dispose();
    this.furniture[0].material.dispose();
    for (const panel of [this.panel, this.story, ...this.buttons]) {
      panel.geometry.dispose();
      panel.material.map.dispose();
      panel.material.dispose();
    }
    this.root.removeFromParent();
    this.clearInput();
  }
}
