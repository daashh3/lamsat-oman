import * as THREE from 'three';
import { DesktopNavigation } from './DesktopNavigation.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './Config.js';
import { UIManager } from '../ui/UIManager.js';
import { HUD } from '../ui/HUD.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ExperienceManager } from '../core/ExperienceManager.js';
import { ChapterManager } from '../core/ChapterManager.js';
import { CHALLENGE_MESSAGES } from '../audio/ArabicScripts.js';
import { XRManager } from '../xr/XRManager.js';
import { createVRSessionButton } from '../xr/VRSessionButton.js';
import { launchQuestApp } from '../pwa/QuestLaunch.js';

export class App {
  constructor() {
    this.ui = new UIManager((action, data) => this.action(action, data));
    this.audio = new AudioManager({
      onStatus: (status) => {
        this.ui.audioState(status);
        this.hud?.setAudioState(status);
      },
    });
    this.viewport = document.querySelector('#viewport');
    this.quality = 'auto';
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lastTime = 0;
    this.frames = 0;
    this.frameSeconds = 0;
    this.fps = 60;
    this.dragging = false;
    this.disposed = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 30);
    this.camera.position.set(0.95, 0.92, 1.75);
    this.camera.lookAt(0, 0.37, 0);
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      document.querySelector('#app').innerHTML =
        '<main style="padding:3rem"><h1>لمسة عُمان</h1><p>تعذّر تشغيل الرسوم ثلاثية الأبعاد. فعّل تسريع الرسوم في المتصفح ثم أعد المحاولة.</p><button onclick="location.reload()">إعادة المحاولة</button></main>';
      throw error;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.pixelRatio));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.viewport.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environmentIntensity = 0.65;
    this.scene.add(new THREE.HemisphereLight(0xf9e5bc, 0x203d38, 1.2));
    const sun = new THREE.DirectionalLight(0xffddb0, 2.2);
    sun.position.set(1, 2, 3);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6ae5d0, 1.5);
    rim.position.set(-2, 1, -2);
    this.scene.add(rim);
    this.content = new THREE.Group();
    this.scene.add(this.content);
    this.navigation = new DesktopNavigation(
      this.camera,
      this.renderer.domElement,
    );
    this.controls = this.navigation.controls;
    this.game = new ExperienceManager({
      onChange: (s) => this.changed(s),
      onEvent: (e) => this.event(e),
    });
    this.chapters = new ChapterManager({
      content: this.content,
      game: this.game,
      audio: this.audio,
      onHint: (m) => this.ui.toast(m),
    });
    this.chapters.reduced = this.reduced;
    this.hud = new HUD(this.content, (action) => this.action(action), {
      occluders: () => [this.chapters.root],
      cupLatched: () =>
        this.chapters.targets.some(
          (target) => target.id === 'cup' && target.owner === 'cup-latch',
        ),
    });
    this.xr = new XRManager({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      content: this.content,
      overlay: this.ui.root,
      onInput: (e) => this.xrInput(e),
      onStatus: (s) => this.xrStatus(s),
      onSession: (active, info) => this.session(active, info),
      onViewerPose: (pose) =>
        this.hud.place(new THREE.Vector3().copy(pose.position)),
    });
    this.xr.checkSupport().then((s) => this.ui.compatibility(s));
    this.vrButton = createVRSessionButton({
      xrManager: this.xr,
      onGesture: () => this.audio.unlock(),
      onBeforeEnter: () =>
        this.game.state === 'READY' ? this.game.beginXR() : !!this.game.chapter,
      onError: (error) => {
        this.game.cancelXR();
        this.ui.toast(error.message);
      },
    });
    document
      .querySelector('.top-meta')
      .prepend(document.querySelector('#vr-entry'));
    document.querySelector('#vr-entry').append(this.vrButton.element);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerTimes = new Map();
    this.audioPosition = new THREE.Vector3();
    this.audioForward = new THREE.Vector3();
    this.audioUp = new THREE.Vector3();
    this.audioRotation = new THREE.Quaternion();
    this.bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.viewport);
    this.resize();
    this.ui.render(this.game.snapshot());
    this.ui.audioState(this.audio.getStatus());
    this.ui.reduced = this.reduced;
    // Both media play() and WebXR requestSession remain in a trusted gesture.
    this.userGesture = () => this.audio.unlock();
    this.keyGesture = (event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.audio.unlock();
    };
    document.addEventListener('pointerdown', this.userGesture, true);
    document.addEventListener('keydown', this.keyGesture, true);
    this.keydown = (e) => {
      if (['INPUT', 'SELECT', 'BUTTON', 'SUMMARY'].includes(e.target.tagName))
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.action('pause');
      }
      if (e.code === 'KeyR') this.action('recenter');
      if (e.code === 'Escape' && !document.querySelector('#modal').open)
        this.action('pause');
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.chapters.tilt = THREE.MathUtils.clamp(
          this.chapters.tilt + (e.code === 'ArrowRight' ? 0.05 : -0.05),
          0,
          Math.PI / 2,
        );
      }
    };
    document.addEventListener('keydown', this.keydown);
    this.visibility = () => {
      if (document.hidden && this.game.chapter && !this.game.paused) {
        this.action('pause');
      }
    };
    document.addEventListener('visibilitychange', this.visibility);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.game.pause(true);
      this.chapters.cancelAll();
      this.ui.toast('توقفت الرسوم مؤقتاً. جارٍ انتظار استعادة السياق.');
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.chapters.build(
        this.game.state === 'READY' ? 'GATE' : this.game.state,
      );
      this.ui.toast('استُعيدت الرسوم. أعد المحطة لاستئناف تفاعل سليم.');
      this.game.restartChapter();
    });
    this.resetCamera(true);
    this.renderer.setAnimationLoop((time, frame) => this.loop(time, frame));
    if (CONFIG.debug) this.installDebug();
    this.packagedLaunch = launchQuestApp({
      xrManager: this.xr,
      ready: this.vrButton.ready,
      beforeEnter: () => !this.disposed && this.game.beginXR(),
      unlockAudio: () => this.audio.unlock(),
      onError: () => {
        this.game.cancelXR();
        this.ui.toast('اضغط الدخول إلى VR لبدء التطبيق');
      },
    });
  }
  changed(snapshot) {
    this.ui.render(snapshot);
    this.hud?.update(snapshot);
  }
  event(event) {
    if (event.type === 'chapter-enter' || event.type === 'chapter-restart') {
      this.chapters?.build(event.chapter);
      this.audio.reset();
      this.ui.previous = '';
      this.navigation.setMode('interact');
      this.ui.navigation('interact');
      if (!this.xr?.active) this.resetCamera(false);
      document.querySelector('#coffee-tilt').value = 0;
    } else if (event.type === 'reset') {
      this.chapters?.build('GATE');
      this.audio.reset();
      this.navigation.setMode('orbit');
      this.ui.navigation('orbit');
      this.ui.previous = '';
      this.hud.root.visible = false;
      this.xr?.exit().catch(() => {});
      this.resetCamera(true);
    } else {
      this.chapters?.event(event);
      const script = {
        'incense-lit': 'incenseSuccess',
        'perfect-pour': 'pourSuccess',
        'pour-failed':
          event.reason === 'underfilled' ? 'challengeFail' : 'pourFail',
        'invalid-drop': 'challengeFail',
      }[event.type];
      if (script) {
        this.ui.toast(CHALLENGE_MESSAGES[script]);
      }
    }
  }
  resetCamera(welcome = false) {
    if (this.xr?.active) return;
    this.camera.position.set(
      welcome ? 0.8 : 0,
      welcome ? 0.94 : 1.05,
      welcome ? 2.15 : 2.05,
    );
    this.controls.target.set(0, 0.37, 0);
    this.controls.update();
  }
  resize() {
    const { width, height } = this.viewport.getBoundingClientRect();
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
  async action(action, data) {
    if (action === 'movement-menu') {
      this.hud.toggleMovementMenu();
      this.audio.effect('ui-select');
      return;
    }
    if (action === 'third-person') {
      if (!this.game.paused) {
        this.chapters.cancelAll();
        this.xr.toggleThirdPerson();
      }
      return;
    }
    if (action === 'move-forward' || action === 'move-backward') {
      if (!this.game.paused) this.xr.moveStep(action.slice(5));
      return;
    }
    if (action === 'turn-left' || action === 'turn-right') {
      if (!this.game.paused) this.xr.turnStep(action === 'turn-left' ? -1 : 1);
      return;
    }
    if (action === 'light-kiln') {
      this.audio.unlock();
      this.game.input('light-kiln');
      return;
    }
    if (action === 'start') {
      this.audio.unlock();
      this.game.start();
      return;
    }
    if (action === 'xr') {
      if (!this.game.beginXR()) return;
      this.audio.unlock();
      try {
        await this.xr.enter();
      } catch (error) {
        this.game.cancelXR();
        this.ui.toast(error.message);
      }
      return;
    }
    if (action === 'light-incense' || action === 'light-coal') {
      this.audio.unlock();
      this.game.input('light-coal');
      return;
    }
    if (action.startsWith('decorate-')) {
      this.game.input('decorate', { id: Number(action.slice(9)) });
      return;
    }
    if (action.startsWith('shape-slot-')) {
      this.game.input('select-shape', { id: action.slice(11) });
      return;
    }
    if (action === 'hold-cup') {
      this.chapters.toggleDesktopCup();
      return;
    }
    if (action === 'stop-pour') {
      this.chapters.stopCoffeePour();
      return;
    }
    if (action === 'audio' || action === 'effects') {
      this.audio.unlock();
      this.audio.toggleEffects();
      return;
    }
    if (action === 'navigation') {
      this.chapters.cancelAll();
      this.dragging = false;
      this.ui.navigation(this.navigation.toggle());
      return;
    }
    if (action === 'volume') {
      this.ui.volume = data;
      this.audio.setVolume(data);
      return;
    }
    if (action === 'motion') {
      this.reduced = data;
      this.ui.reduced = data;
      this.chapters.reduced = data;
      return;
    }
    if (action === 'seated') {
      this.ui.seated = data;
      this.xr.setComfort({ seated: data });
      this.xr.recenter();
      return;
    }
    if (action === 'quality') {
      this.quality = data;
      this.renderer.setPixelRatio(
        data === 'low' ? 1 : Math.min(devicePixelRatio, CONFIG.pixelRatio),
      );
      this.resize();
      return;
    }
    if (action === 'subtitles') {
      this.hud.subtitles = data;
      this.ui.render(this.game.snapshot());
      return;
    }
    if (action === 'recenter') {
      this.chapters.cancelAll();
      this.xr.active
        ? this.xr.recenter()
        : this.resetCamera(this.game.state === 'READY');
      return;
    }
    if (action === 'pause') {
      if (!this.game.chapter) return;
      this.chapters.cancelAll();
      this.xr.cancelInputs();
      this.audio.pause(this.game.pause());
      return;
    }
    if (action === 'restart') {
      this.chapters.cancelAll();
      this.audio.pause(false);
      this.game.restartChapter();
      return;
    }
    if (action === 'exit') {
      this.chapters.cancelAll();
      await this.xr.exit().catch(() => {});
      this.audio.pause(false);
      this.game.reset();
      return;
    }
    if (action === 'shape') {
      this.game.input('shape', {
        height: data.height,
        width: data.width / 0.2,
      });
      return;
    }
    if (action === 'tilt') {
      this.chapters.tilt = data;
      return;
    }
    if (action === 'pour-coffee') {
      this.audio.unlock();
      this.chapters.startCoffeePour();
      return;
    }
    if (action === 'assist-start') {
      this.audio.unlock();
      this.chapters.assistStart(data);
      return;
    }
    if (action === 'assist-end') {
      this.chapters.assistEnd();
      return;
    }
    if (action.startsWith('assist-')) {
      this.chapters.grabById(action.slice(7));
      return;
    }
    if (action === 'release') {
      this.chapters.release('assist');
      return;
    }
    if (action === 'lantern') {
      this.game.input('touch');
    }
  }
  session(active, info) {
    this.hud.setVRState({
      active: active && info.mode === 'immersive-vr',
      thirdPerson: false,
    });
    document.body.classList.toggle('xr', active);
    document.body.classList.toggle(
      'vr',
      active && info.mode === 'immersive-vr',
    );
    this.controls.enabled = !active;
    this.hud.root.visible = active;
    this.hud.needsPlacement = true;
    this.hud.clearInput();
    if (active) {
      this.game.placement();
      this.game.start();
    } else {
      // XRManager restores the pre-session camera, including its field of view.
      this.controls.update();
      this.resize();
    }
    this.ui.toast(
      active
        ? info.mode === 'immersive-vr'
          ? 'الواقع الافتراضي جاهز — حرّك رأسك واستكشف'
          : info.domOverlay
            ? 'المعرض جاهز — المس أو أمسك بإصبعيك'
            : 'المعرض جاهز — استخدم أزرار اللوحة الجانبية'
        : 'عدت إلى نسخة الشاشة',
    );
  }
  xrStatus(status) {
    if (status.kind === 'locomotion') {
      this.hud?.setVRState({ thirdPerson: status.thirdPerson });
    }
    if (status.kind === 'locomotion-step')
      this.audio.effect('footstep', status.position);
    if (status.kind === 'locomotion-turn') this.audio.effect('turn');
    if (status.kind === 'placement' && status.placed === false)
      this.hud.needsPlacement = true;
    if (status.kind === 'tracking')
      document.querySelector('#hand-status').textContent = status.message;
    if (status.kind === 'visibility' && this.game.chapter) {
      if (!status.visible && !this.game.paused) {
        this.game.pause(true);
        this.audio.pause(true);
      }
      return;
    }
    if (status.kind === 'error') this.ui.toast(status.message);
  }
  xrInput(event) {
    if (event.phase === 'end' || event.phase === 'cancel') {
      this.chapters.release(event.id, event.phase === 'cancel');
      this.hud.releasePointer(event.id, event.phase === 'cancel');
      return;
    }
    const held =
      this.chapters.grabs.has(event.id) || this.chapters.tracing.has(event.id);
    if (!held && this.hud.interact(event)) return;
    if (!held && !this.game.paused && this.chapters.activate(event)) return;
    if (event.ray) {
      const grab = this.chapters.grabs.get(event.id);
      const target =
        event.phase === 'start'
          ? this.chapters.pick(new THREE.Vector3(), event.ray)
          : null;
      const freeTarget =
        target &&
        !target.cord &&
        !['rope', 'scraper', 'vase', 'stick'].includes(target.id);
      const targetPosition = freeTarget
        ? this.chapters.root.localToWorld(this.chapters.targetPoint(target))
        : null;
      const p = targetPosition
        ? event.ray.closestPointToPoint(targetPosition, new THREE.Vector3())
        : Number.isFinite(grab?.rayDistance)
          ? event.ray.at(grab.rayDistance, new THREE.Vector3())
          : this.chapters.desktopPlane(
              event.ray,
              event.id,
              this.game.chapter?.stage,
            );
      if (!p) return;
      event = {
        ...event,
        position: p,
        freeGrip: Number.isFinite(grab?.rayDistance),
      };
    }
    this.chapters.pointer(event);
    if (event.phase === 'start' && event.ray) {
      const grab = this.chapters.grabs.get(event.id);
      if (
        grab &&
        !grab.target.cord &&
        !['rope', 'scraper', 'vase', 'stick'].includes(grab.target.id)
      ) {
        const point = this.chapters.root.localToWorld(
          this.chapters.targetPoint(grab.target),
        );
        grab.rayDistance = Math.max(
          0.12,
          point.sub(event.ray.origin).dot(event.ray.direction),
        );
      }
    }
  }
  pointerEvent(event, phase, actionsOnly = false) {
    if (phase === 'end' || phase === 'cancel') {
      this.chapters.release('desktop', phase === 'cancel');
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const id = 'desktop',
      now = performance.now(),
      dt = Math.min(
        0.1,
        Math.max(0.008, (now - (this.pointerTimes.get(id) || now - 16)) / 1000),
      );
    this.pointerTimes.set(id, now);
    const p = this.chapters.desktopPlane(
      this.raycaster.ray,
      id,
      this.game.chapter?.stage,
    );
    if (p) {
      const input = {
        id,
        phase,
        position: p,
        ray: phase === 'start' || phase === 'hover' ? this.raycaster.ray : null,
        source: 'desktop',
        pinching: this.dragging,
        dt,
      };
      if (
        !this.game.paused &&
        !this.chapters.grabs.has(id) &&
        this.chapters.activate(input)
      )
        return;
      if (!actionsOnly) this.chapters.pointer(input);
    }
  }
  bindPointer() {
    const canvas = this.renderer.domElement;
    const touches = new Set();
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('pointerdown', (event) => {
      this.orbitTap = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      if (event.pointerType === 'touch') touches.add(event.pointerId);
      if (touches.size > 1) {
        this.chapters.release('desktop', true);
        this.dragging = false;
        return;
      }
      if (
        event.button !== 0 ||
        !this.game.chapter ||
        this.navigation.mode === 'orbit'
      )
        return;
      this.dragging = true;
      canvas.setPointerCapture(event.pointerId);
      this.pointerEvent(event, 'start');
    });
    canvas.addEventListener('pointermove', (event) => {
      if (this.navigation.mode === 'orbit' || touches.size > 1) return;
      this.pointerEvent(event, this.dragging ? 'move' : 'hover');
    });
    canvas.addEventListener('pointerup', (event) => {
      touches.delete(event.pointerId);
      if (
        this.navigation.mode === 'orbit' &&
        event.button === 0 &&
        this.game.chapter &&
        this.orbitTap?.id === event.pointerId &&
        Math.hypot(
          event.clientX - this.orbitTap.x,
          event.clientY - this.orbitTap.y,
        ) < 6
      )
        this.pointerEvent(event, 'start', true);
      if (event.button === 0 && this.dragging) this.pointerEvent(event, 'end');
      this.dragging = false;
      this.orbitTap = null;
    });
    canvas.addEventListener('pointercancel', (event) => {
      touches.delete(event.pointerId);
      this.pointerEvent(event, 'cancel');
      this.dragging = false;
    });
    canvas.addEventListener('lostpointercapture', () => {
      if (this.dragging) {
        this.chapters.release('desktop', true);
        this.dragging = false;
      }
    });
  }
  loop(time, frame) {
    if (this.disposed) return;
    const rawDelta = this.lastTime ? (time - this.lastTime) / 1000 : 1 / 60,
      dt = Math.min(0.05, rawDelta);
    this.lastTime = time;
    this.frames++;
    this.frameSeconds += rawDelta;
    if (this.frameSeconds >= 1) {
      this.fps = this.frames / this.frameSeconds;
      this.frames = 0;
      this.frameSeconds = 0;
      if (
        this.quality === 'auto' &&
        !this.xr.active &&
        this.fps < 38 &&
        this.renderer.getPixelRatio() > 1
      ) {
        this.renderer.setPixelRatio(
          Math.max(1, this.renderer.getPixelRatio() - 0.15),
        );
        this.resize();
      }
      if (this.quality === 'auto' && this.xr.active)
        this.renderer.xr.setFoveation?.(this.fps < 58 ? 0.8 : 0.5);
    }
    this.xr.setLocomotionEnabled(!this.game.paused);
    this.xr.update(frame, dt);
    if (!this.xr.active) this.controls.update();
    const audioCamera = this.xr.active
      ? this.renderer.xr.getCamera()
      : this.camera;
    audioCamera.getWorldPosition(this.audioPosition);
    audioCamera.getWorldQuaternion(this.audioRotation);
    this.audioForward.set(0, 0, -1).applyQuaternion(this.audioRotation);
    this.audioUp.set(0, 1, 0).applyQuaternion(this.audioRotation);
    this.audio.listener(this.audioPosition, this.audioForward, this.audioUp);
    if (!this.game.paused) {
      this.chapters.shapeWithHands(this.xr.hands);
      this.chapters.update(dt);
      this.game.update(dt);
      this.audio.update(dt);
    }
    this.hud.update(this.game.snapshot());
    this.renderer.render(this.scene, this.camera);
    if (CONFIG.debug) {
      const info = this.renderer.info.render;
      document.querySelector('#debug').textContent =
        `FPS ${this.fps.toFixed(0)} | calls ${info.calls} | triangles ${info.triangles}\n${this.game.state} / ${this.game.chapter?.stage || 'READY'}\ntracking ${this.xr.hands.filter((h) => h.tracked).length} | gesture ${this.chapters.grabs.size ? 'grab' : 'idle'}\nXR ${this.xr.mode || 'desktop'} | geometries ${this.renderer.info.memory.geometries}`;
    }
  }
  project(point) {
    const p = this.chapters.root
        .localToWorld(new THREE.Vector3(...point))
        .project(this.camera),
      r = this.renderer.domElement.getBoundingClientRect();
    return {
      x: r.left + ((p.x + 1) * r.width) / 2,
      y: r.top + ((-p.y + 1) * r.height) / 2,
    };
  }
  installDebug() {
    document.querySelector('#debug').hidden = false;
    globalThis.__lamsat = {
      bootId: crypto.randomUUID(),
      snapshot: () => this.game.snapshot(),
      audio: () => this.audio.getStatus(),
      navigation: () => ({
        mode: this.navigation.mode,
        azimuth: this.controls.getAzimuthalAngle(),
        camera: this.camera.position.toArray(),
      }),
      pour: () => ({
        active: !!this.chapters.pourAnimator?.active,
        phase: this.chapters.pourAnimator?.phase,
        quaternion:
          this.chapters.models.coffee?.userData.dallah.quaternion.toArray(),
      }),
      project: (p) => this.project(p),
      trace: () =>
        (this.game.chapter?.path || []).map((p) =>
          this.project(this.chapters.engravingPoint(p).toArray()),
        ),
      engravingSlots: () =>
        (this.chapters.models.gate?.userData.slots || []).map((s) => ({
          id: s.id,
          screen: this.project(s.center.toArray()),
        })),
      targets: () =>
        this.chapters.targets.map((t) => ({
          id: t.id,
          position: this.chapters.targetPoint(t, true).toArray(),
          screen: this.project(this.chapters.targetPoint(t, true).toArray()),
        })),
      weaving: () =>
        (this.chapters.models.dhow?.userData.cords || []).map(
          ({ id, definition }) => ({
            id,
            path: definition.path.map((p) => ({
              position: p,
              screen: this.project(p),
            })),
          }),
        ),
      kiln: () => {
        const igniter = this.chapters.models.workshop?.userData.kilnIgniter;
        if (!igniter) return null;
        const p = this.chapters.root.worldToLocal(
          igniter.getWorldPosition(new THREE.Vector3()),
        );
        return this.project(p.toArray());
      },
      metrics: () => ({
        fps: this.fps,
        ...this.renderer.info.render,
        memory: { ...this.renderer.info.memory },
      }),
    };
  }
  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    document.removeEventListener('keydown', this.keydown);
    document.removeEventListener('keydown', this.keyGesture, true);
    document.removeEventListener('pointerdown', this.userGesture, true);
    document.removeEventListener('visibilitychange', this.visibility);
    this.vrButton.dispose();
    this.xr.dispose();
    this.navigation.dispose();
    this.chapters.dispose();
    this.hud.dispose();
    this.audio.dispose();
    this.environmentTarget.dispose();
    this.renderer.dispose();
  }
}
