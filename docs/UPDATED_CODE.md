# Lamsat Oman — complete updated code blocks

هذه نسخة كاملة من HTML وCSS وجميع وحدات JavaScript الخاصة بالتطبيق، دون اختصار. احفظ الملفات بمساراتها داخل المشروع؛ الصور والخط موجودان في مجلد public. المؤثرات التفاعلية مولّدة برمجياً، ولا تُشغّل موسيقى أو تعليقات صوتية.

Run `npm install` and `npm run dev`. This is the existing modular Vite project. Edit written Arabic challenge messages in `src/audio/ArabicScripts.js`. See [README](../README.md) and [current update report](GAMIFICATION_UPDATE.md) for controls, HTTPS/Quest instructions, verification and equivalent CDN links. Music and speech are removed. Only short Web Audio interaction effects play; historical WAV files are unused. Side keepsakes are removed and door tracing needs no tool. See docs/EFFECTS_AND_DOOR_UPDATE.md for the current revision.

## index.html

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="theme-color" content="#101e20" />
    <meta
      name="description"
      content="لمسة عُمان — تحديات اللبان والقهوة، وقطع ثقافية مخفية، مع الواقع الافتراضي والمختلط ودوران ٣٦٠ درجة."
    />
    <title>لمسة عُمان | Lamsat Oman</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <!-- UIManager mounts the right-side exhibit menus and independent audio controls. -->
    <!-- Edit visual Arabic feedback and trivia facts in src/audio/ArabicScripts.js. -->
    <div id="app" aria-label="تجربة لمسة عُمان"></div>
    <noscript>تحتاج تجربة لمسة عُمان إلى تفعيل JavaScript في المتصفح.</noscript>
    <!-- Vite bundles the pinned Three.js module and its VRButton/OrbitControls addons. -->
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

## package.json

```json
{
  "name": "lamsat-oman",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "An interactive Omani heritage exhibition for WebXR and desktop",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "node --test src/tests/*.test.js",
    "test:browser": "npm run build && node scripts/browser-test.mjs"
  },
  "dependencies": { "three": "0.181.2" },
  "devDependencies": { "vite": "7.3.8", "@playwright/test": "1.58.2" },
  "engines": { "node": ">=22.12.0" }
}
```

## vite.config.js

```javascript
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', rollupOptions: { output: { manualChunks: { three: ['three'] } } } }
});
```

## src/app/App.js

```javascript
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
      const p = this.chapters.desktopPlane(
        event.ray,
        event.id,
        this.game.chapter?.stage,
      );
      if (!p) return;
      event = { ...event, position: p };
    }
    this.chapters.pointer(event);
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
```

## src/app/Config.js

```javascript
export const CONFIG = Object.freeze({
  transitionSeconds: 2.4,
  particleBudget: 220,
  pixelRatio: 1.7,
  debug: new URLSearchParams(location.search).has('debug'),
});
export const CHAPTERS = {
  GATE: {
    title: 'باب الحكاية',
    english: 'THE OMANI GATE',
    tag: 'المقدمة',
    detail:
      'اختر النجمة والمربع والقالب المبتكر. تتبّعها بإصبعك أو المؤشر مباشرة على كسوة الباب لتفتح الحكاية.',
    icon: '◇',
  },
  FRANKINCENSE: {
    title: 'عبق ظفار',
    english: 'FRANKINCENSE',
    tag: 'اللمسة الأولى',
    detail: 'من شجرة اللبان إلى المبخرة، حكاية عطرٍ عبر العالم.',
    icon: '♧',
  },
  DHOW: {
    title: 'أشرعة المجد',
    english: 'MARITIME HERITAGE',
    tag: 'اللمسة الثانية',
    detail: 'ارفع الشراع، ودع حكاية البحر تبدأ.',
    icon: '△',
  },
  POTTERY: {
    title: 'ذاكرة الطين',
    english: 'NIZWA & POTTERY',
    tag: 'اللمسة الثالثة',
    detail: 'من تراب الأرض، ومن مهارة اليد، يولد الجمال.',
    icon: '♜',
  },
  HALWA: {
    title: 'حلاوة اللقاء',
    english: 'OMANI HALWA',
    tag: 'اللمسة الرابعة',
    detail: 'مقادير بسيطة، وحرفة تتوارثها الأجيال.',
    icon: '✺',
  },
  COFFEE: {
    title: 'أهلاً وسهلاً',
    english: 'OMANI HOSPITALITY',
    tag: 'اللمسة الخامسة',
    detail: 'فنجان قهوة يختصر دفء الضيافة العُمانية.',
    icon: '♧',
  },
  FINALE: {
    title: 'كل عام وعُمان بخير 🇴🇲',
    english: 'A HERITAGE THAT LIVES ON',
    tag: 'اكتملت الحكاية',
    detail: 'خمس لمسات، وحكاية تبقى. المس الفانوس لإعادة الرحلة.',
    icon: '✧',
  },
};
export const NARRATION = {
  GATE: 'أهلاً بك في لمسة عُمان. هنا تبدأ رحلتك عبر ملامح تراثنا العريق. بلمستك، تنبض الحكايات من جديد.',
  FRANKINCENSE:
    'من أرض ظفار، انتشر اللبان العُماني إلى أنحاء العالم، حاملاً عبق التاريخ وأصالة المكان.',
  DHOW: 'عبر البحار والمحيطات، أبحر العُمانيون بسفنهم، حاملين التجارة والمعرفة ورسائل السلام.',
  POTTERY:
    'في قلاع عُمان وحرفها التقليدية، تتجسد مهارة الأجداد. ومن الطين، تتشكل قطع فنية تحفظ ذاكرة المكان.',
  HALWA:
    'الحلوى العُمانية رمز من رموز الضيافة والاحتفاء. بمذاقها المميز، تجتمع العائلة وتُروى الحكايات.',
  COFFEE:
    'بالقهوة والحلوى نستقبل ضيوفنا، فكرم الضيافة من أجمل ما يميز المجتمع العُماني.',
  FINALE: 'كل عام وعُمان بخير. شكراً لمشاركتك في لمسة عُمان.',
};
```

## src/app/DesktopNavigation.js

```javascript
import { MOUSE, TOUCH } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Keep scene orbit and exhibit dragging separate on touch screens. */
export class DesktopNavigation {
  constructor(camera, canvas) {
    this.controls = new OrbitControls(camera, canvas);
    Object.assign(this.controls, {
      enablePan: false,
      enableDamping: true,
      dampingFactor: 0.08,
      rotateSpeed: 0.65,
      zoomSpeed: 0.75,
      minDistance: 1.05,
      maxDistance: 3,
      minPolarAngle: 0.35,
      maxPolarAngle: Math.PI / 2 + 0.12,
      // No azimuth clamp: repeated drags can circle the exhibit indefinitely.
      minAzimuthAngle: -Infinity,
      maxAzimuthAngle: Infinity,
    });
    this.controls.target.set(0, 0.36, 0);
    this.setMode('orbit');
  }

  setMode(mode) {
    this.mode = mode === 'orbit' ? 'orbit' : 'interact';
    this.controls.mouseButtons = {
      LEFT: this.mode === 'orbit' ? MOUSE.ROTATE : null,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.ROTATE,
    };
    this.controls.touches = {
      ONE: this.mode === 'orbit' ? TOUCH.ROTATE : null,
      TWO: TOUCH.DOLLY_ROTATE,
    };
    return this.mode;
  }

  toggle() {
    return this.setMode(this.mode === 'orbit' ? 'interact' : 'orbit');
  }

  dispose() {
    this.controls.dispose();
  }
}
```

## src/audio/ArabicScripts.js

```javascript
/**
 * EDIT ARABIC FEEDBACK HERE / عدّل رسائل التحديات المكتوبة هنا.
 * These messages are displayed visually; no automatic voiceover is played.
 */
export const CHALLENGE_MESSAGES = Object.freeze({
  incenseSuccess:
    'أحسنت! اشتعل اللبان، وتصاعد عبقه من المبخرة. لقد أتممت تحدّي إشعال البخور.',
  pourSuccess:
    'صبّة متقنة! وصل الفنجان إلى المستوى المناسب. هكذا تكتمل لمسة الكرم، وقد نجحت في تحدّي القهوة.',
  pourFail:
    'امتلأ الفنجان أكثر من اللازم. لا بأس، أفرغناه لتجرّب من جديد. أوقف الصب مبكراً عند المنطقة المضيئة.',
  challengeFail:
    'اقتربت من النجاح. أعد المحاولة بهدوء، واتبع الإشارة المضيئة؛ كل تجربة تزيد مهارتك.',
});

/** EDIT HIDDEN-OBJECT FACTS HERE / حقائق القطع المخفية. Verified UNESCO sources. */
export const TRIVIA_FACTS = Object.freeze([
  Object.freeze({
    id: 'frankincense',
    title: 'سرّ أرض اللبان',
    text: 'هل تعلم؟ تضم أرض اللبان في ظفار أربعة مواقع مدرجة على قائمة التراث العالمي لليونسكو، منها وادي دوكة. وتروي هذه المواقع تاريخ زراعة اللبان وتجارته عبر طرق القوافل والموانئ.',
    source: 'https://whc.unesco.org/en/list/1010/',
  }),
  Object.freeze({
    id: 'aflaj',
    title: 'حكمة الأفلاج',
    text: 'هل تعلم؟ تنقل الأفلاج العُمانية الماء بقوّة الجاذبية إلى المزارع والبيوت. وتعتمد إدارتها على تقاسم الماء والتعاون بين الأهالي، وقد أُدرجت خمسة أفلاج عُمانية على قائمة التراث العالمي لليونسكو.',
    source: 'https://whc.unesco.org/en/list/1207/',
  }),
  Object.freeze({
    id: 'khanjar',
    title: 'حكاية الخنجر',
    text: 'هل تعلم؟ الخنجر جزء من الزي التقليدي العُماني في المناسبات، وتنتقل مهارات صناعته وزخرفته بين الأجيال. وفي عام ألفين واثنين وعشرين، أدرجت اليونسكو هذه المهارات والممارسات الاجتماعية في قائمتها للتراث الثقافي غير المادي.',
    source:
      'https://ich.unesco.org/en/RL/al-khanjar-craft-skills-and-social-practices-01844',
  }),
]);
```

## src/audio/AudioManager.js

```javascript
/** Short material sounds only: no music, media elements, narration or idle loops. */
const PROFILES = {
  'shape-selected': ['tap', 0.07, 0.17, 1600, 0.1],
  carve: ['scrape', 0.13, 0.18, 1800, 0.065],
  'shape-engraved': ['tap', 0.11, 0.15, 1050, 0.25],
  'door-open': ['creak', 0.72, 0.2, 760, 1],
  'tree-scraped': ['scrape', 0.2, 0.19, 850, 0.16],
  'coal-lit': ['crackle', 0.48, 0.2, 1900, 0.4],
  'resin-collected': ['grains', 0.13, 0.14, 1300, 0.2],
  'incense-lit': ['crackle', 0.32, 0.16, 1000, 0.3],
  'sail-hoist': ['creak', 0.21, 0.17, 560, 0.16],
  'clay-placed': ['thud', 0.13, 0.21, 400, 0.2],
  'clay-shaped': ['wet', 0.14, 0.12, 620, 0.16],
  'pottery-decorated': ['ceramic', 0.13, 0.14, 2200, 0.16],
  'kiln-start': ['crackle', 0.35, 0.15, 950, 0.4],
  'pottery-shaped': ['ceramic', 0.16, 0.14, 2000, 0.35],
  'ingredient-added': ['grains', 0.19, 0.18, 1150, 0.15],
  stirring: ['wet', 0.22, 0.17, 1050, 0.23],
  'mixture-ready': ['thud', 0.13, 0.15, 550, 0.4],
  'fire-fanned': ['whoosh', 0.3, 0.19, 800, 0.25],
  'halwa-cooked': ['tap', 0.13, 0.15, 700, 0.5],
  'cup-held': ['ceramic', 0.1, 0.12, 2000, 0.2],
  'pour-start': ['water', 0.38, 0.18, 1800, 0.28],
  pouring: ['water', 0.3, 0.15, 1500, 0.28],
  'pour-failed': ['water', 0.15, 0.12, 1100, 0.5],
  'perfect-pour': ['ceramic', 0.14, 0.13, 1600, 0.4],
  'symbol-earned': ['tap', 0.12, 0.13, 900, 0.5],
  'replay-countdown': ['tap', 0.08, 0.12, 700, 0.5],
  pickup: ['tap', 0.07, 0.12, 1200, 0.09],
  'put-down': ['thud', 0.1, 0.15, 600, 0.1],
};

export class AudioManager {
  constructor({
    onStatus = () => {},
    Context = globalThis.AudioContext || globalThis.webkitAudioContext,
  } = {}) {
    this.onStatus = onStatus;
    this.Context = Context;
    this.volume = 0.5;
    this.muted = false;
    this.paused = false;
    this.unlocked = false;
    this.disposed = false;
    this.audioError = null;
    this.maxVoices = 8;
    this.nodes = new Set();
    this.voices = new Map();
    this.buffers = new Map();
    this.lastPlayed = new Map();
    this.effectCount = 0;
    this.lastEffect = null;
  }

  getStatus() {
    return {
      musicMuted: true,
      musicPlaying: false,
      musicError: null,
      ttsMuted: true,
      ttsAvailable: false,
      speechChannel: null,
      unlocked: this.unlocked,
      effectsAvailable: typeof this.Context === 'function' && !this.disposed,
      effectsEnabled: this.canPlay(),
      effectsMuted: this.muted,
      activeEffects: this.voices.size,
      effectCount: this.effectCount,
      lastEffect: this.lastEffect,
      audioError: this.audioError,
    };
  }
  notify() {
    if (!this.disposed) this.onStatus(this.getStatus());
  }
  canPlay() {
    return (
      !!this.context &&
      this.context.state === 'running' &&
      this.unlocked &&
      !this.disposed &&
      !this.paused &&
      !this.muted &&
      this.volume > 0
    );
  }

  /** Resume synchronously within the gesture; skipped sounds are never queued. */
  async unlock() {
    if (this.disposed) return false;
    this.unlocked = true;
    try {
      if (!this.context) {
        if (typeof this.Context !== 'function') {
          this.notify();
          return false;
        }
        this.context = new this.Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.context.destination);
        this.context.onstatechange = () => this.notify();
      }
      if (!this.paused && this.context.state !== 'running')
        await this.context.resume();
      this.audioError = null;
    } catch {
      this.audioError = 'تعذّر تفعيل أصوات التفاعل — اضغط مجدداً للمحاولة';
    }
    this.notify();
    return this.canPlay();
  }

  setVolume(volume) {
    if (!Number.isFinite(volume)) return;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.volume === 0) this.stopAll();
    this.master?.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime,
      0.015,
    );
    this.notify();
  }
  toggleEffects() {
    this.muted = !this.muted;
    if (this.muted) this.stopAll();
    this.setVolume(this.volume);
    return this.muted;
  }
  toggle() {
    return this.toggleEffects();
  }
  // Old callers cannot restore either removed audio channel.
  toggleMusic() {
    return true;
  }
  playMusic() {
    return Promise.resolve(false);
  }
  toggleTTS() {
    return true;
  }
  speakText() {
    return false;
  }
  ambient() {}
  update() {}

  listener(position, forward, up) {
    const listener = this.context?.listener;
    if (!listener?.positionX) return;
    for (const [prefix, value] of [
      ['position', position],
      ['forward', forward],
      ['up', up],
    ])
      for (const axis of ['X', 'Y', 'Z']) {
        const n = value?.[axis.toLowerCase()];
        if (Number.isFinite(n)) listener[prefix + axis].value = n;
      }
  }

  /** Cache compact, non-musical material textures instead of creating media files. */
  materialBuffer(kind, duration) {
    const key = `${kind}:${duration}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const rate = this.context.sampleRate;
    const buffer = this.context.createBuffer(
      1,
      Math.max(2, Math.round(duration * rate)),
      rate,
    );
    const data = buffer.getChannelData(0);
    let seed =
        173 + [...kind].reduce((sum, letter) => sum + letter.charCodeAt(0), 0),
      brown = 0,
      crack = 0,
      peak = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1,
        t = i / rate,
        phase = i / (data.length - 1);
      brown = 0.96 * brown + 0.04 * noise;
      let sample;
      if (kind === 'tap' || kind === 'thud') {
        const resonance = kind === 'thud' ? 105 : 225;
        sample =
          (0.55 * noise + Math.sin(2 * Math.PI * resonance * t) * 0.45) *
          Math.exp(-phase * 6);
      } else if (kind === 'ceramic') {
        sample =
          (0.45 * Math.sin(2 * Math.PI * 920 * t) +
            0.25 * Math.sin(2 * Math.PI * 1470 * t) +
            0.3 * noise) *
          Math.exp(-phase * 6);
      } else if (kind === 'crackle' || kind === 'grains') {
        crack =
          crack * 0.72 +
          (Math.abs(noise) > (kind === 'crackle' ? 0.986 : 0.965) ? noise : 0);
        sample = crack * 2 + brown * 0.2;
      } else if (kind === 'creak') {
        sample =
          (noise * 0.25 + brown * 3) *
          (0.35 + 0.65 * Math.pow(Math.sin(t * 53), 2));
      } else if (kind === 'water' || kind === 'wet') {
        sample =
          (noise * 0.3 + brown * 1.8) *
          (0.5 + 0.5 * Math.pow(Math.sin(t * (kind === 'water' ? 71 : 27)), 2));
      } else if (kind === 'scrape') {
        sample = noise * (0.45 + 0.55 * Math.pow(Math.sin(t * 165), 2));
      } else sample = noise;
      // Fade every finite texture at both ends; no start/stop clicks or loops.
      data[i] = sample * Math.pow(Math.sin(Math.PI * phase), 0.7);
      peak = Math.max(peak, Math.abs(data[i]));
    }
    const scale = peak > 0 ? 0.5 / peak : 1;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
    this.buffers.set(key, buffer);
    return buffer;
  }

  effect(type, position = null) {
    if (type === 'pour-stop' || type === 'pour-reset') {
      for (const [source, voice] of [...this.voices])
        if (voice.type === 'pouring' || voice.type === 'pour-start')
          this.stopVoice(source);
      return false;
    }
    const profile = PROFILES[type];
    if (!profile || !this.canPlay()) return false;
    const [kind, duration, level, cutoff, cooldown] = profile;
    const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(type) ?? -Infinity) < cooldown) return false;
    if (this.voices.size >= this.maxVoices)
      this.stopVoice(this.voices.keys().next().value);
    let source, filter, gain, output;
    try {
      source = this.context.createBufferSource();
      source.buffer = this.materialBuffer(kind, duration);
      source.loop = false;
      filter = this.context.createBiquadFilter();
      filter.type = kind === 'scrape' ? 'bandpass' : 'lowpass';
      filter.frequency.value = cutoff;
      filter.Q.value = kind === 'scrape' ? 0.55 : 0.7;
      gain = this.context.createGain();
      gain.gain.value = level;
      const spatial =
        Array.isArray(position) &&
        position.length === 3 &&
        position.every(Number.isFinite);
      output = spatial
        ? this.context.createPanner()
        : this.context.createGain();
      if (spatial) {
        output.panningModel = 'HRTF';
        output.distanceModel = 'inverse';
        output.refDistance = 0.7;
        output.rolloffFactor = 0.6;
        [
          output.positionX.value,
          output.positionY.value,
          output.positionZ.value,
        ] = position;
      }
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      output.connect(this.master);
      const cleanup = () => {
        source.onended = null;
        for (const node of [source, filter, gain, output]) node.disconnect();
        this.nodes.delete(source);
        this.voices.delete(source);
      };
      source.onended = cleanup;
      this.nodes.add(source);
      this.voices.set(source, { type, cleanup });
      source.start(now);
      source.stop(now + duration + 0.01);
      this.lastPlayed.set(type, now);
      this.effectCount++;
      this.lastEffect = type;
      return true;
    } catch {
      if (source && this.voices.has(source)) this.stopVoice(source);
      else
        for (const node of [source, filter, gain, output]) {
          try {
            node?.disconnect();
          } catch {}
        }
      return false;
    }
  }

  stopVoice(source) {
    const voice = this.voices.get(source);
    if (!voice) return;
    try {
      source.stop(this.context.currentTime);
    } catch {
      /* Already ended. */
    }
    // Disconnect immediately, including while the AudioContext is suspended.
    voice.cleanup();
  }
  stopAll() {
    for (const source of [...this.voices.keys()]) this.stopVoice(source);
  }
  pause(value) {
    this.paused = Boolean(value);
    if (this.paused) {
      this.stopAll();
      this.lastPlayed.clear();
      Promise.resolve(this.context?.suspend()).catch(() => {});
    } else if (this.unlocked) {
      Promise.resolve(this.context?.resume()).catch(() => {});
    }
    this.notify();
  }
  reset() {
    this.stopAll();
    this.lastPlayed.clear();
    this.lastEffect = null;
    // Keep cumulative diagnostics and the user's mute/volume preference.
  }
  dispose() {
    this.disposed = true;
    this.reset();
    this.buffers.clear();
    this.master?.disconnect();
    if (this.context) this.context.onstatechange = null;
    Promise.resolve(this.context?.close()).catch(() => {});
  }
}
```

## src/audio/NarrationManager.js

```javascript
/** Requested text reading only; chapter events never generate narration. */
export class NarrationManager {
  constructor({
    onStatus = () => {},
    synth = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    now = () => performance.now(),
  } = {}) {
    Object.assign(this, { onStatus, synth, Utterance, now });
    this.enabled = true;
    this.unlocked = false;
    this.paused = false;
    this.volume = 0.5;
    this.voices = [];
    this.utterance = null;
    this.timer = null;
    this.lastSpoken = null;
    this.watchdog = null;
    this.disposed = false;
    this.boundVoicesChanged = () => {
      this.refreshVoices();
      this.onStatus();
    };
    this.synth?.addEventListener?.('voiceschanged', this.boundVoicesChanged);
    this.refreshVoices();
  }

  get available() {
    return !!this.synth && typeof this.Utterance === 'function';
  }
  get speaking() {
    return !!this.utterance;
  }
  get activeChannel() {
    return this.speaking ? 'tts' : null;
  }
  refreshVoices() {
    try {
      this.voices = this.synth?.getVoices?.() || [];
    } catch {
      this.voices = [];
    }
  }
  unlock() {
    this.unlocked = true;
  }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.stop();
    this.onStatus();
  }
  setVolume(volume) {
    if (Number.isFinite(volume)) this.volume = Math.max(0, Math.min(1, volume));
  }
  canSpeak() {
    return !this.disposed && this.enabled && this.unlocked && !this.paused;
  }

  /** A new label replaces the previous request; explicit clicks bypass debounce. */
  speakText(
    text,
    { delay = 0, force = false, rate = 0.92, pitch = 1.02 } = {},
  ) {
    const clean = String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);
    if (!clean || !this.canSpeak() || !this.available) return false;
    if (
      !force &&
      clean === this.lastSpoken?.text &&
      this.now() - this.lastSpoken.time < 1500
    )
      return false;
    this.cancelPending();
    const request = { text: clean, rate, pitch };
    if (delay > 0) {
      this.timer = setTimeout(
        () => {
          this.timer = null;
          this.request(request);
        },
        Math.min(delay, 1000),
      );
    } else this.request(request);
    return true;
  }

  request(request) {
    if (!this.canSpeak()) return;
    this.stopActive();
    this.refreshVoices();
    const voice =
      this.voices.find((v) => /^ar[-_]SA$/i.test(v.lang)) ||
      this.voices.find((v) => /^ar(?:-|_|$)/i.test(v.lang)) ||
      this.voices.find((v) => v.default) ||
      this.voices[0];
    const utterance = new this.Utterance(request.text);
    if (voice) utterance.voice = voice;
    utterance.lang = 'ar-SA';
    utterance.rate = Math.max(0.6, Math.min(1.2, request.rate));
    utterance.pitch = Math.max(0.8, Math.min(1.2, request.pitch));
    utterance.volume = this.volume;
    this.utterance = utterance;
    this.lastSpoken = { text: request.text, time: this.now() };
    const ended = () => {
      if (this.utterance !== utterance) return;
      clearTimeout(this.watchdog);
      this.watchdog = null;
      this.utterance = null;
      this.onStatus();
    };
    utterance.onend = ended;
    utterance.onerror = ended;
    this.startWatchdog(utterance);
    try {
      this.synth.speak(utterance);
    } catch {
      ended();
    }
    this.onStatus();
  }

  startWatchdog(utterance) {
    // Recover if an installed voice never reports completion.
    this.watchdog = setTimeout(
      () => {
        if (this.utterance !== utterance || this.paused) return;
        this.stopActive();
        this.onStatus();
      },
      Math.max(12000, utterance.text.length * 180),
    );
    this.watchdog.unref?.();
  }
  cancelPending() {
    clearTimeout(this.timer);
    this.timer = null;
  }
  stopActive() {
    const active = this.utterance;
    clearTimeout(this.watchdog);
    this.watchdog = null;
    this.utterance = null;
    if (active) this.synth?.cancel();
  }
  pause() {
    this.paused = true;
    this.cancelPending();
    clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.utterance) this.synth?.pause();
  }
  resume() {
    this.paused = false;
    if (this.utterance && this.canSpeak()) {
      this.synth?.resume();
      this.startWatchdog(this.utterance);
    }
  }
  stop() {
    this.cancelPending();
    this.stopActive();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.synth?.removeEventListener?.('voiceschanged', this.boundVoicesChanged);
  }
}
```

## src/chapters/BaseChapter.js

```javascript
import { CHAPTER_TEXT } from './ChapterData.js';
import { clamp } from '../utils/MathUtils.js';

export class BaseChapter {
  constructor(id, { emit = () => {}, complete = () => {} } = {}) { this.id = id; this.emit = emit; this.onComplete = complete; this.stage = 'ACTIVE'; this.progress = 0; this.elapsed = 0; this.completed = false; this.instruction = ''; }
  event(type, details = {}) { this.emit({ type, chapter: this.id, ...details }); }
  finish() { if (this.completed) return false; this.completed = true; this.stage = 'COMPLETE'; this.progress = 1; this.event('chapter-complete'); this.onComplete(this.id); return true; }
  update(dt) { this.elapsed += dt; }
  interrupt() {}
  snapshot() { return { id: this.id, ...CHAPTER_TEXT[this.id], stage: this.stage, progress: clamp(this.progress), completed: this.completed, instruction: this.instruction }; }
}
```

## src/chapters/ChapterData.js

```javascript
export const CHAPTER_ORDER = [
  'GATE',
  'FRANKINCENSE',
  'DHOW',
  'POTTERY',
  'HALWA',
  'COFFEE',
  'FINALE',
];
export const COLLECTIBLE_CHAPTERS = [
  'FRANKINCENSE',
  'DHOW',
  'POTTERY',
  'HALWA',
  'COFFEE',
];

export const INTERACTION_LAYOUT = {
  frankincense: {
    resin: [-0.25, 0.32, 0.15],
    bowl: { center: [0, 0.47, 0], radius: 0.115, below: 0.035, above: 0.13 },
  },
  dhow: { pullDistance: 0.48, maxStep: 0.12 },
  pottery: {
    wheel: { center: [0, 0.18, 0.18], radius: 0.15, below: 0.025, above: 0.15 },
    targetHeight: [0.27, 0.33],
    targetWidth: [0.83, 1.12],
  },
  halwa: {
    cauldron: { center: [0, 0.22, 0], radius: 0.17, below: 0.03, above: 0.17 },
    fan: { center: [0, 0.12, 0.24], halfSize: [0.3, 0.2, 0.22] },
    turns: 3,
    strokes: 6,
  },
  // Perfect Pour: fill is measured from real aligned flow, then judged on stop.
  coffee: {
    cup: { center: [0.25, 0.1, 0.08], radius: 0.05, below: 0, above: 0.2 },
    minAngle: 0.6,
    maxAngle: 1.6,
    pourDuration: 2.8,
    fillRate: 0.2,
    perfectMin: 0.6,
    perfectMax: 0.8,
    overflowLevel: 1,
    settleSeconds: 0.5,
    resetSeconds: 1,
  },
  finale: { countdown: 10 },
};

export const CHAPTER_TEXT = {
  GATE: {
    title: 'بوابة الحكاية',
    subtitle: 'ثلاثة قوالب للنقش على الباب',
    narration:
      'أهلاً بك في لمسة عُمان. هنا تبدأ رحلتك عبر ملامح تراثنا العريق. بلمستك، تنبض الحكايات من جديد.',
  },
  FRANKINCENSE: {
    title: 'عبق ظفار',
    subtitle: 'اللبان العُماني',
    narration:
      'من أرض ظفار، انتشر اللبان العُماني إلى أنحاء العالم، حاملاً عبق التاريخ وأصالة المكان.',
  },
  DHOW: {
    title: 'أشرعة عُمان',
    subtitle: 'إرث البحّارة',
    narration:
      'عبر البحار والمحيطات، أبحر العُمانيون بسفنهم، حاملين التجارة والمعرفة ورسائل السلام.',
  },
  POTTERY: {
    title: 'من الطين حكاية',
    subtitle: 'قلعة نزوى وصناعة الفخار',
    narration:
      'في قلاع عُمان وحرفها التقليدية، تتجسد مهارة الأجداد. ومن الطين، تتشكل قطع فنية تحفظ ذاكرة المكان.',
  },
  HALWA: {
    title: 'حلاوة اللقاء',
    subtitle: 'الحلوى العُمانية',
    narration:
      'الحلوى العُمانية رمز من رموز الضيافة والاحتفاء. بمذاقها المميز، تجتمع العائلة وتُروى الحكايات.',
  },
  COFFEE: {
    title: 'فنجان كرم',
    subtitle: 'الضيافة العُمانية',
    narration:
      'بالقهوة والحلوى نستقبل ضيوفنا، فكرم الضيافة من أجمل ما يميز المجتمع العُماني.',
  },
  FINALE: {
    title: 'كل عام وعُمان بخير 🇴🇲',
    subtitle: 'خمس لمسات… حكاية واحدة',
    narration: 'شكراً لمشاركتك في لمسة عُمان.',
  },
};
```

## src/chapters/CoffeeChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { clamp } from '../utils/MathUtils.js';

/**
 * Perfect Pour uses the actual transformed outlet/angle samples from the scene.
 * Reaching the green band is not success: stop pouring and let the cup settle.
 */
export class CoffeeChapter extends BaseChapter {
  constructor(callbacks) {
    super('COFFEE', callbacks);
    this.stage = 'POUR';
    this.poured = 0; // Seconds of physically valid flow, retained for diagnostics.
    this.fillLevel = 0;
    this.isPouring = false;
    this.settleRemaining = 0;
    this.resetRemaining = 0;
    this.attempts = 0;
    this.overfills = 0;
    this.attemptStarted = false;
    this.lastResult = null;
    this.cupHeld = false;
    this.instruction =
      'احمل الفنجان بيد، ثم أمل الدلّة باليد الأخرى وأوقف السكب داخل النطاق الأخضر';
  }

  input(action, { angle, aligned, dt, held } = {}) {
    if (this.completed) return false;
    // This comes from the scene's exclusive cup grab, never from a pour sample.
    if (action === 'cup-held') {
      if (typeof held !== 'boolean' || held === this.cupHeld) return false;
      this.cupHeld = held;
      if (!held) {
        this.interrupt();
        this.instruction = 'احمل الفنجان مجدداً قبل متابعة السكب';
      } else if (this.stage === 'POUR') {
        this.instruction = 'ثبّت الفنجان تحت فوهة الدلّة وأملها برفق';
      }
      this.event('cup-held', { held });
      return true;
    }
    if (action === 'interrupt') {
      this.interrupt();
      return true;
    }
    if (this.stage === 'RESETTING') return false;
    if (!this.cupHeld) return false;
    if (action === 'stop-pour') return this.stopFlow(true);
    if (action !== 'pour') return false;

    // A stale/invalid sample cannot fill a cup or manufacture a stopped pour.
    if (
      !Number.isFinite(dt) ||
      dt <= 0 ||
      dt > 0.1 ||
      !Number.isFinite(angle) ||
      typeof aligned !== 'boolean'
    )
      return false;
    const zone = INTERACTION_LAYOUT.coffee;
    const valid =
      aligned === true &&
      Number.isFinite(angle) &&
      angle >= zone.minAngle &&
      angle <= zone.maxAngle;
    if (!valid) {
      return this.stopFlow();
    }

    this.settleRemaining = 0;
    this.stage = 'POUR';
    if (!this.attemptStarted) {
      this.attemptStarted = true;
      this.attempts++;
      this.lastResult = null;
    }
    if (!this.isPouring) {
      this.isPouring = true;
      this.event('pour-start', { attempt: this.attempts });
    }
    this.poured += dt;
    this.fillLevel = Math.min(
      zone.overflowLevel,
      this.fillLevel + dt * zone.fillRate,
    );
    this.progress = clamp(this.fillLevel);
    this.instruction =
      this.fillLevel >= zone.perfectMin
        ? this.fillLevel <= zone.perfectMax
          ? 'المستوى مثالي الآن؛ أعد الدلّة إلى وضعها المستقيم أو اضغط إيقاف السكب'
          : 'المستوى تجاوز النطاق المثالي؛ أوقف السكب وأعد المحاولة'
        : 'استمر برفق حتى يصل مستوى القهوة إلى النطاق الأخضر';
    if (this.fillLevel + 1e-9 >= zone.overflowLevel) this.failPour('overflow');
    return true;
  }

  stopFlow(explicit = false) {
    const wasPouring = this.isPouring;
    this.isPouring = false;
    if (wasPouring) this.event('pour-stop');
    if (this.stage === 'SETTLING') return false;
    // Lost tracking / pause calls interrupt(), not stopFlow(), and cannot win.
    if (this.cupHeld && (wasPouring || explicit) && this.fillLevel > 0.001) {
      this.stage = 'SETTLING';
      this.settleRemaining = INTERACTION_LAYOUT.coffee.settleSeconds;
      this.instruction = 'توقّف السكب… نتحقق من مستوى الفنجان';
      return true;
    }
    return false;
  }

  failPour(reason) {
    if (this.stage === 'RESETTING' || this.completed) return;
    const wasPouring = this.isPouring;
    this.isPouring = false;
    this.settleRemaining = 0;
    this.stage = 'RESETTING';
    this.resetRemaining = INTERACTION_LAYOUT.coffee.resetSeconds;
    this.lastResult = reason;
    if (reason === 'overflow') this.overfills++;
    this.instruction =
      reason === 'underfilled'
        ? 'القهوة أقل من النطاق المطلوب. يُفرّغ الفنجان لتجربة جديدة'
        : 'امتلأ الفنجان أكثر من المطلوب. يُفرّغ الفنجان لتجربة جديدة';
    if (wasPouring) this.event('pour-stop');
    this.event('pour-failed', {
      reason,
      fillLevel: this.fillLevel,
      attempt: this.attempts,
    });
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.completed) return;
    const step = Math.min(dt, 0.1);
    super.update(step);
    const zone = INTERACTION_LAYOUT.coffee;
    if (this.stage === 'RESETTING') {
      this.resetRemaining = Math.max(0, this.resetRemaining - step);
      if (this.resetRemaining <= 1e-9) {
        this.fillLevel = 0;
        this.poured = 0;
        this.progress = 0;
        this.attemptStarted = false;
        this.stage = 'POUR';
        this.instruction = 'جرّب مجدداً: أوقف السكب بين ٦٠٪ و٨٠٪';
        this.event('pour-reset', { attempt: this.attempts });
      }
    } else if (this.stage === 'SETTLING' && !this.isPouring && this.cupHeld) {
      this.settleRemaining = Math.max(0, this.settleRemaining - step);
      if (this.settleRemaining > 1e-9) return;
      if (
        this.fillLevel + 1e-9 >= zone.perfectMin &&
        this.fillLevel <= zone.perfectMax + 1e-9
      ) {
        this.lastResult = 'perfect';
        this.instruction = 'سكبٌ متقن وفنجانٌ مثالي. اكتملت لمساتك الخمس!';
        this.event('perfect-pour', {
          fillLevel: this.fillLevel,
          attempt: this.attempts,
        });
        this.finish();
      } else
        this.failPour(
          this.fillLevel < zone.perfectMin ? 'underfilled' : 'overfilled',
        );
    }
  }

  interrupt() {
    if (this.isPouring) this.event('pour-stop');
    this.isPouring = false;
    this.settleRemaining = 0;
    if (this.stage === 'SETTLING') this.stage = 'POUR';
  }

  snapshot() {
    const zone = INTERACTION_LAYOUT.coffee;
    return {
      ...super.snapshot(),
      poured: this.poured,
      fillLevel: this.fillLevel,
      perfectMin: zone.perfectMin,
      perfectMax: zone.perfectMax,
      attempts: this.attempts,
      overfills: this.overfills,
      lastResult: this.lastResult,
      isPouring: this.isPouring,
      cupHeld: this.cupHeld,
      resetRemaining: this.resetRemaining,
    };
  }
}
```

## src/chapters/DhowChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { clamp } from '../utils/MathUtils.js';

export class DhowChapter extends BaseChapter {
  constructor(callbacks) { super('DHOW', callbacks); this.stage = 'HOIST'; this.pulled = 0; this.instruction = 'أمسك مقبض الحبل واسحبه إلى الأسفل لرفع الشراع'; }
  input(action, { distance } = {}) {
    if (this.completed || action !== 'pull' || !Number.isFinite(distance) || distance <= 0 || distance > INTERACTION_LAYOUT.dhow.maxStep) return false;
    // Input is incremental downward movement in metres, never an absolute position.
    this.pulled += distance; this.progress = clamp(this.pulled / INTERACTION_LAYOUT.dhow.pullDistance);
    this.event('sail-hoist', { progress: this.progress });
    if (this.progress >= 1) { this.instruction = 'أبحر نحو المجد'; this.finish(); }
    return true;
  }
  snapshot() { return { ...super.snapshot(), pulled: this.pulled }; }
}
```

## src/chapters/EngravingPatterns.js

```javascript
// Coordinates are door-local metres. Every pattern fits one hinged stone inlay.
export const ENGRAVING_SURFACE_Z = 0.006;
export const ENGRAVING_TOLERANCE = 0.022;
export const ENGRAVING_INLAYS = Object.freeze([
  {
    id: 'star',
    center: [-0.12475, 0.342, ENGRAVING_SURFACE_Z],
    width: 0.185,
    height: 0.19,
    leaf: 0,
  },
  {
    id: 'square',
    center: [0.12475, 0.342, ENGRAVING_SURFACE_Z],
    width: 0.185,
    height: 0.19,
    leaf: 1,
  },
  {
    id: 'random',
    center: [-0.12475, 0.118, ENGRAVING_SURFACE_Z],
    width: 0.185,
    height: 0.14,
    leaf: 0,
  },
]);

function sampleOutline(outline, center) {
  const path = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.018),
    );
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      path.push([
        center[0] + a[0] + (b[0] - a[0]) * t,
        center[1] + a[1] + (b[1] - a[1]) * t,
        center[2],
      ]);
    }
  }
  path.push([...path[0]]);
  return path;
}

/** Generate once per chapter and share the exact outline with the model/UI. */
export function createEngravingPatterns(random = Math.random) {
  const sample = () => {
    const n = random();
    return Number.isFinite(n) ? Math.max(0, Math.min(0.999999, n)) : 0.5;
  };
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5,
      r = i % 2 ? 0.032 : 0.068;
    return [Math.sin(a) * r, Math.cos(a) * r];
  });
  const square = [
    [-0.065, -0.065],
    [-0.065, 0.065],
    [0.065, 0.065],
    [0.065, -0.065],
  ];
  const sides = 5 + Math.floor(sample() * 3),
    rotation = (sample() * Math.PI) / 3;
  const generated = Array.from({ length: sides }, (_, i) => {
    const a = rotation + (i * 2 * Math.PI) / sides,
      r = 0.044 + sample() * 0.011;
    return [Math.sin(a) * r, Math.cos(a) * r];
  });
  return [star, square, generated].map((outline, index) => {
    const inlay = ENGRAVING_INLAYS[index];
    return {
      ...inlay,
      center: [...inlay.center],
      label: ['نجمة', 'مربع', 'شكل مبتكر'][index],
      outline,
      path: sampleOutline(outline, inlay.center),
    };
  });
}
```

## src/chapters/FinaleChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';

export class FinaleChapter extends BaseChapter {
  constructor(callbacks) { super('FINALE', callbacks); this.stage = 'CELEBRATE'; this.countdown = null; this.progress = 1; this.instruction = 'المس الفانوس لتبدأ حكاية جديدة'; }
  input(action) {
    if (action !== 'touch' || this.stage !== 'CELEBRATE') return false;
    this.stage = 'COUNTDOWN'; this.countdown = INTERACTION_LAYOUT.finale.countdown; this.instruction = 'شكراً لمشاركتك في لمسة عُمان'; this.event('replay-countdown'); return true;
  }
  update(dt) { super.update(dt); if (this.stage === 'COUNTDOWN') { this.countdown = Math.max(0, this.countdown - dt); if (this.countdown === 0) this.finish(); } }
  snapshot() { return { ...super.snapshot(), countdown: this.countdown }; }
}
```

## src/chapters/FrankincenseChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { insideCylinder, insideBox } from '../utils/InteractionUtils.js';
import { FanGesture } from '../xr/GestureDetector.js';

// Positions are local to the tree, so placing the scene never changes the
// physical hit area. The front of the pale bark patch is the scrape surface.
export const FRANKINCENSE_SCRAPE_ZONE = Object.freeze({
  center: [0, 0.38, 0.045],
  halfSize: [0.08, 0.17, 0.085],
});
export const FRANKINCENSE_SCRAPE_STROKES = 4;

/** Ignite charcoal, scrape bark, then carry the harvested resin to the bowl. */
export class FrankincenseChapter extends BaseChapter {
  constructor(callbacks) {
    super('FRANKINCENSE', callbacks);
    this.stage = 'LIGHT_COAL';
    this.coalLit = false;
    this.lit = false;
    this.scraperHeld = false;
    this.scraping = new FanGesture({
      strokeDistance: 0.065,
      minDuration: 0.14,
      maxDuration: 1.8,
    });
    this.previousScrape = null;
    this.instruction = 'أشعل الفحم داخل المجمر أولاً، ثم انتقل إلى شجرة اللبان';
  }

  input(action, { id, position, time, held } = {}) {
    if (this.completed) return false;
    // The scene sends this only after acquiring/releasing the dedicated tool.
    if (action === 'scraper-held') {
      if (typeof held !== 'boolean' || held === this.scraperHeld) return false;
      if (held && this.stage !== 'SCRAPE_TREE') return false;
      this.scraperHeld = held;
      this.interrupt();
      // Re-gripping starts a new stroke in either direction without erasing earned strokes.
      this.scraping.direction = 0;
      if (this.stage === 'SCRAPE_TREE') {
        this.instruction = held
          ? 'مرّر شفرة أداة الكشط على اللحاء الفاتح صعوداً ونزولاً أربع مرات'
          : 'أمسك أداة كشط اللبان بجانب الشجرة، ثم اكشط اللحاء الفاتح';
      }
      return true;
    }
    if (action === 'interrupt') {
      this.interrupt();
      return false;
    }
    if (action === 'light-coal' || action === 'light-incense') {
      if (this.stage !== 'LIGHT_COAL') return false;
      this.coalLit = true;
      this.stage = 'SCRAPE_TREE';
      this.progress = 0.2;
      this.instruction =
        'أمسك أداة كشط اللبان بجانب الشجرة، ثم اكشط اللحاء الفاتح أربع مرات';
      this.event('coal-lit');
      return true;
    }
    if (action === 'scrape-tree' && this.stage === 'SCRAPE_TREE') {
      if (!this.scraperHeld) return false;
      if (
        !insideBox(position, FRANKINCENSE_SCRAPE_ZONE) ||
        !Number.isFinite(time)
      ) {
        this.interrupt();
        return false;
      }
      // A real stroke needs continuous samples, not unrelated endpoint clicks.
      if (this.previousScrape) {
        const elapsed = time - this.previousScrape.time;
        const distance = Math.hypot(
          ...position.map(
            (value, index) => value - this.previousScrape.position[index],
          ),
        );
        if (elapsed <= 0 || elapsed > 0.4 || distance > 0.06) {
          this.interrupt();
          return false;
        }
      }
      this.previousScrape = { position: [...position], time };
      // Reuse the alternating stroke detector, rotating Y into its X axis.
      const accepted = this.scraping.update(
        [position[1], position[0], position[2]],
        time,
      );
      this.progress =
        0.2 + (0.5 * this.scraping.strokes) / FRANKINCENSE_SCRAPE_STROKES;
      if (accepted)
        this.event('tree-scraped', { strokes: this.scraping.strokes });
      if (this.scraping.strokes >= FRANKINCENSE_SCRAPE_STROKES) {
        this.stage = 'PLACE_RESIN';
        this.instruction =
          'جمعت اللبان! أمسك الحبّة الذهبية وضعها فوق الفحم المتوهّج';
        this.event('resin-collected');
      }
      return accepted;
    }
    if (action !== 'drop' || id !== 'resin') return false;
    if (
      this.stage !== 'PLACE_RESIN' ||
      !this.coalLit ||
      !insideCylinder(position, INTERACTION_LAYOUT.frankincense.bowl)
    ) {
      this.event('invalid-drop', { id });
      return false;
    }
    this.lit = true;
    this.event('incense-lit', { position: [...position] });
    this.instruction =
      'أحسنت! أشعلت الفحم وجمعت اللبان، والآن يتصاعد عبقه من المجمر';
    return this.finish();
  }

  interrupt() {
    this.scraping.interrupt();
    // A newly acquired grip starts a new alternating run in either direction.
    // Keeping the old direction with a new anchor can otherwise lock progress.
    this.scraping.direction = 0;
    this.previousScrape = null;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      coalLit: this.coalLit,
      lit: this.lit,
      scraperHeld: this.scraperHeld,
      scrapeStrokes: this.scraping.strokes,
      scrapeProgress: Math.min(
        1,
        this.scraping.strokes / FRANKINCENSE_SCRAPE_STROKES,
      ),
    };
  }
}
```

## src/chapters/GateChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { distance3, isVector3 } from '../utils/MathUtils.js';
import {
  createEngravingPatterns,
  ENGRAVING_TOLERANCE,
} from './EngravingPatterns.js';

export class GateChapter extends BaseChapter {
  constructor(callbacks) {
    super('GATE', callbacks);
    this.shapes = createEngravingPatterns();
    this.shapeProgress = Object.fromEntries(
      this.shapes.map((shape) => [shape.id, 0]),
    );
    this.selectedShape = null;
    this.finishedShapes = new Set();
    this.stage = 'SELECT_SHAPE';
    this.lastPoint = null;
    this.instruction =
      'اختر أحد القوالب الثلاثة، ثم اضغط وتتبع المسار المضيء مباشرة';
  }
  get path() {
    return (
      this.shapes.find((shape) => shape.id === this.selectedShape)?.path || []
    );
  }
  get index() {
    return this.selectedShape ? this.shapeProgress[this.selectedShape] : 0;
  }
  input(action, { id, point } = {}) {
    if (this.completed) return false;
    if (action === 'interrupt') {
      this.interrupt();
      return false;
    }
    if (action === 'select-shape') {
      const shape = this.shapes.find((shape) => shape.id === id);
      if (!shape || this.finishedShapes.has(id) || this.selectedShape === id)
        return false;
      this.selectedShape = id;
      this.stage = 'ENGRAVE';
      this.interrupt();
      this.instruction = `قالب ${shape.label}: اضغط واسحب على المسار المضيء بإصبعك أو المؤشر`;
      this.event('shape-selected', { id });
      return true;
    }
    if (action !== 'trace' || !this.selectedShape || !isVector3(point))
      return false;
    const path = this.path,
      index = this.index;
    if (!path[index] || distance3(point, path[index]) > ENGRAVING_TOLERANCE)
      return false;
    if (this.lastPoint && distance3(point, this.lastPoint) < 0.008)
      return false;
    this.lastPoint = [...point];
    const shapeId = this.selectedShape;
    this.shapeProgress[shapeId]++;
    this.progress =
      this.shapes.reduce(
        (sum, shape) => sum + this.shapeProgress[shape.id] / shape.path.length,
        0,
      ) / this.shapes.length;
    this.event('carve', {
      id: shapeId,
      index: this.shapeProgress[shapeId],
      point: [...point],
      progress: this.progress,
    });
    if (this.shapeProgress[shapeId] === path.length) {
      this.finishedShapes.add(shapeId);
      this.selectedShape = null;
      this.interrupt();
      this.event('shape-engraved', {
        id: shapeId,
        count: this.finishedShapes.size,
      });
      if (this.finishedShapes.size === this.shapes.length) {
        this.instruction = 'اكتملت النقوش الثلاثة، وتنفتح أبواب الحكاية';
        this.finish();
      } else {
        this.stage = 'SELECT_SHAPE';
        this.instruction = 'أحسنت! اختر قالباً آخر لإكمال نقوش الباب';
      }
    }
    return true;
  }
  interrupt() {
    this.lastPoint = null;
  }
  snapshot() {
    return {
      ...super.snapshot(),
      shapes: this.shapes,
      selectedShape: this.selectedShape,
      shapeProgress: { ...this.shapeProgress },
      finishedShapes: [...this.finishedShapes],
      path: this.path,
      traceIndex: this.index,
      nextPoint: this.path[this.index] ?? null,
    };
  }
}
```

## src/chapters/HalwaChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { insideCylinder, insideBox } from '../utils/InteractionUtils.js';
import { CircularGesture, FanGesture } from '../xr/GestureDetector.js';
import { clamp } from '../utils/MathUtils.js';

const INGREDIENTS = ['sugar', 'saffron', 'nuts'];
const LABELS = { sugar: 'السكر', saffron: 'الزعفران', nuts: 'المكسّرات' };
export class HalwaChapter extends BaseChapter {
  constructor(callbacks) {
    super('HALWA', callbacks);
    this.ingredients = [];
    this.stage = 'ADD_SUGAR';
    this.stirring = new CircularGesture();
    this.fanning = new FanGesture();
    this.fanHeld = false;
    this.instruction = 'أضف السكر إلى القدر';
  }
  input(action, data = {}) {
    if (this.completed) return false;
    if (action === 'fan-held') {
      if (
        typeof data.held !== 'boolean' ||
        this.fanHeld === data.held ||
        (data.held && this.stage !== 'FAN_FIRE')
      )
        return false;
      this.fanHeld = data.held;
      this.fanning.interrupt();
      this.instruction = data.held
        ? 'لوّح بالمهفّة يميناً ويساراً أمام الموقد لتقوية النار'
        : 'احمل المهفّة المصنوعة من سعف النخيل وحرّكها أمام الموقد';
      this.event('fan-held', { held: data.held });
      return true;
    }
    if (this.stage.startsWith('ADD_') && action === 'drop') {
      const next = INGREDIENTS[this.ingredients.length];
      if (
        data.id !== next ||
        !insideCylinder(data.position, INTERACTION_LAYOUT.halwa.cauldron)
      ) {
        this.event('invalid-drop', { id: data.id });
        return false;
      }
      this.ingredients.push(next);
      this.progress = this.ingredients.length * 0.1;
      this.event('ingredient-added', { id: next });
      const remaining = INGREDIENTS[this.ingredients.length];
      this.stage = remaining ? `ADD_${remaining.toUpperCase()}` : 'STIR';
      this.instruction = remaining
        ? `أضف ${LABELS[remaining]} إلى القدر`
        : 'أمسك الملعقة وحرّك المزيج في دوائر متصلة';
      return true;
    }
    if (this.stage === 'STIR' && action === 'stir') {
      const added = this.stirring.update(data.angle, data.radius, data.dt);
      this.progress =
        0.3 +
        0.4 *
          clamp(
            this.stirring.travel /
              (Math.PI * 2 * INTERACTION_LAYOUT.halwa.turns),
          );
      if (
        this.stirring.travel >=
        Math.PI * 2 * INTERACTION_LAYOUT.halwa.turns
      ) {
        this.stage = 'FAN_FIRE';
        this.instruction =
          'احمل المهفّة المصنوعة من سعف النخيل وحرّكها أمام الموقد';
        this.event('mixture-ready');
      }
      return added > 0;
    }
    if (this.stage === 'FAN_FIRE' && action === 'fan') {
      if (
        !this.fanHeld ||
        !insideBox(data.position, INTERACTION_LAYOUT.halwa.fan)
      ) {
        this.fanning.interrupt();
        return false;
      }
      const accepted = this.fanning.update(data.position, data.time);
      this.progress =
        0.7 +
        0.3 * clamp(this.fanning.strokes / INTERACTION_LAYOUT.halwa.strokes);
      if (accepted)
        this.event('fire-fanned', { strokes: this.fanning.strokes });
      if (this.fanning.strokes >= INTERACTION_LAYOUT.halwa.strokes) {
        this.instruction = 'الحلوى جاهزة… أهلاً بالضيوف';
        this.event('halwa-cooked');
        this.finish();
      }
      return accepted;
    }
    if (action === 'interrupt') {
      this.interrupt();
      return false;
    }
    return false;
  }
  interrupt() {
    this.stirring.interrupt();
    this.fanning.interrupt();
  }
  snapshot() {
    return {
      ...super.snapshot(),
      ingredients: [...this.ingredients],
      nextIngredient: INGREDIENTS[this.ingredients.length] ?? null,
      turns: this.stirring.travel / (2 * Math.PI),
      fanStrokes: this.fanning.strokes,
      fanHeld: this.fanHeld,
    };
  }
}
```

## src/chapters/PotteryChapter.js

```javascript
import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { insideCylinder } from '../utils/InteractionUtils.js';
import { clamp } from '../utils/MathUtils.js';

/** Dimensions are metres; width remains a ratio of the .20 m reference diameter. */
export class PotteryChapter extends BaseChapter {
  constructor(callbacks) {
    super('POTTERY', callbacks);
    this.stage = 'PLACE_CLAY';
    this.height = 0.14;
    this.width = 1.35;
    this.targetHold = 0;
    this.firing = 0;
    this.decorations = new Set();
    this.instruction = 'ضع كتلة الطين على دولاب الفخار';
  }

  input(action, data = {}) {
    if (this.completed) return false;
    if (
      this.stage === 'PLACE_CLAY' &&
      action === 'drop' &&
      data.id === 'clay'
    ) {
      if (!insideCylinder(data.position, INTERACTION_LAYOUT.pottery.wheel)) {
        this.event('invalid-drop', { id: data.id });
        return false;
      }
      this.stage = 'SHAPE';
      this.progress = 0.2;
      this.instruction =
        'شكّل الفخار بارتفاع ٣٠ سم وقطر نحو ٢٠ سم حتى يطابق الشكل الذهبي';
      this.event('clay-placed');
      return true;
    }
    if (
      this.stage === 'SHAPE' &&
      action === 'shape' &&
      Number.isFinite(data.height) &&
      Number.isFinite(data.width)
    ) {
      this.height = clamp(data.height, 0.12, 0.38);
      this.width = clamp(data.width, 0.55, 1.5);
      const heightFit = clamp(1 - Math.abs(this.height - 0.3) / 0.16);
      const widthFit = clamp(1 - Math.abs(this.width - 0.98) / 0.5);
      this.progress = 0.2 + 0.35 * Math.min(heightFit, widthFit);
      this.event('clay-shaped', { height: this.height, width: this.width });
      return true;
    }
    // Each surface band must be decorated by a separate deliberate interaction.
    if (this.stage === 'DECORATE' && action === 'decorate') {
      if (
        !Number.isInteger(data.id) ||
        data.id < 0 ||
        data.id > 2 ||
        this.decorations.has(data.id)
      )
        return false;
      this.decorations.add(data.id);
      this.progress = 0.55 + (0.2 * this.decorations.size) / 3;
      this.event('pottery-decorated', {
        id: data.id,
        count: this.decorations.size,
      });
      if (this.decorations.size === 3) {
        this.stage = 'FIRING';
        this.instruction = 'اكتملت الزخارف الثلاث. يُحرق الفخار الآن في الفرن';
        this.event('kiln-start');
      } else
        this.instruction = `أضف الزخارف إلى أحزمة الفخار الثلاثة: ${this.decorations.size} من ٣`;
      return true;
    }
    return false;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.completed) return;
    const step = Math.min(dt, 0.1);
    super.update(step);
    if (this.stage === 'SHAPE') {
      const target = INTERACTION_LAYOUT.pottery;
      const matches =
        this.height >= target.targetHeight[0] &&
        this.height <= target.targetHeight[1] &&
        this.width >= target.targetWidth[0] &&
        this.width <= target.targetWidth[1];
      this.targetHold = matches ? this.targetHold + step : 0;
      if (this.targetHold + 1e-9 >= 1.2) {
        this.stage = 'DECORATE';
        this.progress = 0.55;
        this.instruction =
          'زيّن الفخار: المس أحزمة الزخرفة الثلاثة على سطح الإناء';
        this.event('pottery-shaped');
      }
    } else if (this.stage === 'FIRING') {
      this.firing += step;
      this.progress = 0.75 + 0.25 * clamp(this.firing / 2.4);
      if (this.firing + 1e-9 >= 2.4) {
        this.instruction = 'قطعة شكّلتها وزيّنتها بيديك وتحفظ ذاكرة المكان';
        this.finish();
      }
    }
  }

  interrupt() {
    this.targetHold = 0;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      height: this.height,
      width: this.width,
      targetHold: this.targetHold,
      firing: this.firing,
      decorations: [...this.decorations],
      decorationCount: this.decorations.size,
    };
  }
}
```

## src/core/ChapterManager.js

```javascript
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
      ['scraper', 'coffee', 'fan'].includes(t.id);
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
      if (event.source !== 'hand') {
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
    else if (this.state === 'FRANKINCENSE' && stage === 'SCRAPE_TREE')
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
      setSailProgress(ship, c.progress);
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
      vase.visible = c.stage !== 'PLACE_CLAY';
      this.models.targetVase.visible = c.stage === 'SHAPE';
      vase.userData.showDecorationGuides?.(c.stage === 'DECORATE');
      if (c.stage === 'SHAPE') {
        this.models.workshop.userData.wheel.rotation.y += dt * 2;
        vase.rotation.y += this.reduced ? 0 : dt * 0.6;
        updateVase(vase, c.height, c.width * 0.2);
      }
      if (c.stage === 'FIRING' || c.completed) {
        this.models.workshop.userData.kilnGlow.visible = true;
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
```

## src/core/ExperienceManager.js

```javascript
import { StateMachine } from './StateMachine.js';
import { ProgressManager } from './ProgressManager.js';
import { CHAPTER_ORDER } from '../chapters/ChapterData.js';
import { GateChapter } from '../chapters/GateChapter.js';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { DhowChapter } from '../chapters/DhowChapter.js';
import { PotteryChapter } from '../chapters/PotteryChapter.js';
import { HalwaChapter } from '../chapters/HalwaChapter.js';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { FinaleChapter } from '../chapters/FinaleChapter.js';

const CHAPTER_CLASSES = {
  GATE: GateChapter,
  FRANKINCENSE: FrankincenseChapter,
  DHOW: DhowChapter,
  POTTERY: PotteryChapter,
  HALWA: HalwaChapter,
  COFFEE: CoffeeChapter,
  FINALE: FinaleChapter,
};

export class ExperienceManager {
  constructor({ onChange = () => {}, onEvent = () => {} } = {}) {
    this.onChange = onChange;
    this.onEvent = onEvent;
    this.machine = new StateMachine();
    this.progress = new ProgressManager();
    this.chapter = null;
    this.paused = false;
    this.pendingTransition = null;
    this.error = null;
    this.machine.transition('COMPATIBILITY_CHECK');
    this.machine.transition('READY');
  }
  get state() {
    return this.machine.state;
  }
  changed() {
    this.onChange(this.snapshot());
  }
  event(type, details = {}) {
    this.onEvent({ type, ...details });
  }
  beginXR() {
    if (this.state !== 'READY') return false;
    this.machine.transition('XR_ENTERING');
    this.changed();
    return true;
  }
  placement() {
    if (this.state !== 'XR_ENTERING') return false;
    this.machine.transition('PLACEMENT');
    this.changed();
    return true;
  }
  cancelXR() {
    if (!['XR_ENTERING', 'PLACEMENT'].includes(this.state)) return false;
    this.machine.transition('READY');
    this.changed();
    return true;
  }
  start() {
    if (!['READY', 'PLACEMENT'].includes(this.state)) return false;
    this.enterChapter('GATE');
    return true;
  }
  enterChapter(id) {
    if (id === 'FINALE' && !this.progress.complete)
      throw new Error('The finale requires five earned symbols.');
    this.machine.transition(id);
    this.pendingTransition = null;
    this.paused = false;
    this.chapter = new CHAPTER_CLASSES[id]({
      emit: (event) => this.onEvent(event),
      complete: (completed) => this.finishChapter(completed),
    });
    this.event('chapter-enter', { chapter: id });
    this.changed();
  }
  finishChapter(id) {
    if (id !== this.state || this.pendingTransition !== null) return;
    if (id === 'FINALE') {
      this.reset();
      return;
    }
    if (this.progress.award(id))
      this.event('symbol-earned', { chapter: id, count: this.progress.count });
    this.pendingTransition = id === 'FRANKINCENSE' ? 5 : 2.4;
    this.changed();
  }
  input(action, payload = {}) {
    if (!this.chapter || this.paused || this.pendingTransition !== null)
      return false;
    const accepted = this.chapter.input(action, payload);
    if (accepted) this.changed();
    return Boolean(accepted);
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.paused || !this.chapter) return;
    // A suspended tab must not fast-forward cooking, transition, or replay timers.
    const step = Math.min(dt, 0.1),
      previousStage = this.chapter.stage;
    this.chapter.update(step);
    if (this.pendingTransition !== null) {
      this.pendingTransition = Math.max(0, this.pendingTransition - step);
      if (this.pendingTransition === 0)
        this.enterChapter(CHAPTER_ORDER[CHAPTER_ORDER.indexOf(this.state) + 1]);
    }
    if (
      this.chapter?.stage !== previousStage ||
      this.state === 'FINALE' ||
      this.state === 'POTTERY'
    )
      this.changed();
  }
  pause(value = !this.paused) {
    this.paused = Boolean(value);
    this.chapter?.interrupt();
    this.event(this.paused ? 'pause' : 'resume');
    this.changed();
    return this.paused;
  }
  restartChapter() {
    const id = this.state;
    if (!CHAPTER_CLASSES[id]) return false;
    this.chapter?.interrupt();
    this.pendingTransition = null;
    this.paused = false;
    this.chapter = new CHAPTER_CLASSES[id]({
      emit: (event) => this.onEvent(event),
      complete: (completed) => this.finishChapter(completed),
    });
    this.event('chapter-restart', { chapter: id });
    this.changed();
    return true;
  }
  reset() {
    this.chapter?.interrupt();
    this.machine.transition('RESETTING');
    this.chapter = null;
    this.pendingTransition = null;
    this.paused = false;
    this.error = null;
    this.progress.reset();
    this.event('reset');
    this.machine.transition('READY');
    this.changed();
  }
  fail(error) {
    this.chapter?.interrupt();
    this.error = error instanceof Error ? error.message : String(error);
    this.paused = true;
    this.pendingTransition = null;
    if (this.state !== 'ERROR') this.machine.transition('ERROR');
    this.event('error', { message: this.error });
    this.changed();
  }
  snapshot() {
    const chapter = this.chapter?.snapshot() ?? null;
    return {
      state: this.state,
      paused: this.paused,
      progress: this.progress.snapshot(),
      chapter,
      chapterProgress: chapter?.progress ?? 0,
      stage: chapter?.stage ?? this.state,
      instruction: chapter?.instruction ?? '',
      pendingTransition: this.pendingTransition,
      error: this.error,
    };
  }
}
```

## src/core/ProgressManager.js

```javascript
import { COLLECTIBLE_CHAPTERS } from '../chapters/ChapterData.js';

export class ProgressManager {
  constructor() { this._earned = new Set(); }
  get count() { return this._earned.size; }
  get earned() { return [...this._earned]; }
  get complete() { return this.count === COLLECTIBLE_CHAPTERS.length; }
  has(chapter) { return this._earned.has(chapter); }
  award(chapter) {
    if (this.has(chapter) || COLLECTIBLE_CHAPTERS[this.count] !== chapter) return false;
    this._earned.add(chapter); return true;
  }
  reset() { this._earned.clear(); }
  snapshot() { return { count: this.count, total: COLLECTIBLE_CHAPTERS.length, earned: this.earned, complete: this.complete }; }
}
```

## src/core/ResourceManager.js

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
/** Tracks geometry/material ownership; procedural scenes need no external models. */
export class ResourceManager {
  constructor(){this.loader=new GLTFLoader();}
  loadModel(url){return this.loader.loadAsync(url).then(gltf=>gltf.scene);}
  dispose(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.removeFromParent();root.clear();}
}
```

## src/core/StateMachine.js

```javascript
export const STATES = Object.freeze(['BOOT', 'COMPATIBILITY_CHECK', 'READY', 'XR_ENTERING', 'PLACEMENT', 'GATE', 'FRANKINCENSE', 'DHOW', 'POTTERY', 'HALWA', 'COFFEE', 'FINALE', 'RESETTING', 'ERROR']);

const TRANSITIONS = {
  BOOT: ['COMPATIBILITY_CHECK', 'ERROR'], COMPATIBILITY_CHECK: ['READY', 'ERROR'],
  READY: ['XR_ENTERING', 'GATE', 'RESETTING', 'ERROR'], XR_ENTERING: ['PLACEMENT', 'READY', 'RESETTING', 'ERROR'],
  PLACEMENT: ['GATE', 'READY', 'RESETTING', 'ERROR'], GATE: ['FRANKINCENSE', 'RESETTING', 'ERROR'],
  FRANKINCENSE: ['DHOW', 'RESETTING', 'ERROR'], DHOW: ['POTTERY', 'RESETTING', 'ERROR'],
  POTTERY: ['HALWA', 'RESETTING', 'ERROR'], HALWA: ['COFFEE', 'RESETTING', 'ERROR'],
  COFFEE: ['FINALE', 'RESETTING', 'ERROR'], FINALE: ['RESETTING', 'ERROR'],
  RESETTING: ['READY', 'ERROR'], ERROR: ['RESETTING'],
};

/** Deliberately has no unrestricted setState or production chapter-skip API. */
export class StateMachine {
  constructor(initialState = 'BOOT', onTransition = () => {}) {
    if (!STATES.includes(initialState)) throw new Error(`Unknown initial state: ${initialState}`);
    this.state = initialState; this.onTransition = onTransition;
  }
  canTransition(next) { return TRANSITIONS[this.state]?.includes(next) ?? false; }
  transition(next) {
    if (next === this.state) return false;
    if (!this.canTransition(next)) throw new Error(`Invalid state transition: ${this.state} → ${next}`);
    const previous = this.state; this.state = next; this.onTransition({ previous, state: next }); return true;
  }
}
```

## src/core/TriviaManager.js

```javascript
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
```

## src/effects/ConfettiEffect.js

```javascript
import {Vector3} from 'three';
export class ConfettiEffect {
  constructor(particles){this.particles=particles;this.clock=0;this.position=new Vector3();}
  update(dt,reduced=false){if(reduced)return;this.clock+=dt;if(this.clock>.07){this.clock=0;this.position.set((Math.random()-.5)*.9,.95,(Math.random()-.5)*.4);this.particles.emit(this.position,'confetti',3);}}
}
```

## src/effects/FireEffect.js

```javascript
export class FireEffect {
  constructor(group){this.group=group;this.time=0;}
  update(dt,reduced=false){this.time+=dt;this.group.children.forEach((flame,i)=>{if(flame.isMesh)flame.scale.y=reduced?1:.8+Math.sin(this.time*7+i)*.2;});}
}
```

## src/effects/LightingEffects.js

```javascript
export function pulseLight(light,time,{base=1.8,amount=.35,reduced=false}={}){light.intensity=base+(reduced?0:Math.sin(time*1.7)*amount);}
```

## src/effects/ParticleSystem.js

```javascript
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
```

## src/effects/SmokeEffect.js

```javascript
import { Vector3 } from 'three';

/** Finite emission; live smoke then expands and fades in the shared Points pool. */
export class SmokeEffect {
  constructor(particles, position, type = 'smoke') {
    this.particles = particles;
    this.position = new Vector3(...position);
    this.type = type;
    this.remaining = 0;
    this.clock = 0;
  }

  start(seconds = this.type === 'smoke' ? 5 : 1.2) {
    this.remaining = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    this.clock = 0;
  }

  stop() {
    this.remaining = 0;
    this.clock = 0;
  }

  update(dt, reduced = false) {
    if (this.remaining <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    const step = Math.min(dt, this.remaining);
    this.remaining = Math.max(0, this.remaining - dt);
    this.clock += Math.min(step, 0.3);
    const interval = reduced ? 0.2 : 0.075;
    let bursts = 0;
    while (this.clock >= interval && bursts < 4) {
      this.clock -= interval;
      this.particles.emit(this.position, this.type, reduced ? 1 : 3);
      bursts++;
    }
  }
}
```

## src/effects/WaterEffect.js

```javascript
import {Vector3} from 'three';
export class WaterEffect {
  constructor(particles){this.particles=particles;this.time=0;this.clock=0;this.active=false;this.position=new Vector3();}
  update(dt,reduced=false){this.time+=dt;if(!this.active||reduced)return;this.clock+=dt;if(this.clock>.1){this.clock=0;this.position.set(Math.sin(this.time)*.4,.025,.10);this.particles.emit(this.position,'water',3);}}
}
```

## src/main.js

```javascript
import './ui/styles.css';
import {App} from './app/App.js';
let app;
try{app=new App();}catch(error){console.error('Lamsat Oman initialization failed:',error);const viewport=document.querySelector('#viewport');if(viewport)viewport.innerHTML='<p role="alert" style="padding:30px">تعذّر بدء المعرض. أعد تحميل الصفحة، وتأكد من دعم WebGL.</p>';}
if(import.meta.hot)import.meta.hot.dispose(()=>app?.dispose());
```

## src/objects/DallahPourAnimator.js

```javascript
import { Quaternion, Vector3, MathUtils } from 'three';

const smoothstep = (value) => value * value * (3 - 2 * value);
const PHASES = ['lifting', 'tilting', 'pouring', 'untilting', 'returning'];

/**
 * Moves only geometry around the pot's bottom pivot. The chapter still checks
 * the transformed spout, pouring angle and fill time before awarding progress.
 */
export class DallahPourAnimator {
  constructor(
    pivot,
    {
      spout,
      cupPosition = new Vector3(0.25, 0.1, 0.08),
      tiltAngle = Math.PI / 3,
      spoutClearance = 0.16,
      durations = {},
    } = {},
  ) {
    if (!pivot?.isObject3D || !spout?.isObject3D)
      throw new TypeError('Dallah pivot and spout are required.');
    this.pivot = pivot;
    this.spout = spout;
    this.cupPosition = cupPosition.clone();
    this.tiltAngle = MathUtils.clamp(tiltAngle, 0.6, 1.45);
    this.spoutClearance = MathUtils.clamp(spoutClearance, 0.08, 0.23);
    this.durations = {
      lifting: 0.7,
      tilting: 0.8,
      pouring: 3.2,
      untilting: 0.8,
      returning: 0.7,
      ...durations,
    };
    for (const phase of PHASES)
      if (
        !Number.isFinite(this.durations[phase]) ||
        this.durations[phase] <= 0
      ) {
        throw new RangeError(`Invalid ${phase} duration.`);
      }
    this.homePosition = pivot.position.clone();
    this.homeQuaternion = pivot.quaternion.clone();
    this.startPosition = this.homePosition.clone();
    this.startQuaternion = this.homeQuaternion.clone();
    this.liftedPosition = new Vector3();
    this.targetPosition = new Vector3();
    this.spoutOffset = new Vector3();
    this.tiltedQuaternion = new Quaternion();
    this.localSpout = new Vector3();
    this.returnPosition = new Vector3();
    this.returnQuaternion = new Quaternion();
    this.phase = 'idle';
    this.elapsed = 0;
    this.phaseIndex = -1;
  }
  get active() {
    return this.phase !== 'idle';
  }
  get isPouring() {
    return this.phase === 'pouring';
  }

  /** Cup mouth coordinates must be in the pivot parent's local space. */
  setCupPosition(position) {
    if (!position?.isVector3 || !position.toArray().every(Number.isFinite))
      return false;
    this.cupPosition.copy(position);
    this.targetPosition.copy(position);
    this.targetPosition.y += this.spoutClearance;
    this.targetPosition.sub(this.spoutOffset);
    return true;
  }

  start({ cupPosition = this.cupPosition, manualStop = false } = {}) {
    if (this.active) return false;
    if (
      !cupPosition?.isVector3 ||
      !cupPosition.toArray().every(Number.isFinite)
    )
      return false;
    this.cupPosition.copy(cupPosition);
    this.startPosition.copy(this.pivot.position);
    this.startQuaternion.copy(this.pivot.quaternion);
    this.pivot.updateWorldMatrix(true, true);
    this.localSpout.copy(
      this.pivot.worldToLocal(this.spout.getWorldPosition(new Vector3())),
    );
    this.tiltedQuaternion
      .copy(this.homeQuaternion)
      .multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          -this.tiltAngle,
        ),
      );
    this.spoutOffset
      .copy(this.localSpout)
      .multiply(this.pivot.scale)
      .applyQuaternion(this.tiltedQuaternion);
    this.setCupPosition(cupPosition);
    this.liftedPosition.copy(this.targetPosition);
    this.phaseIndex = 0;
    this.manualStop = manualStop;
    this.returnPosition.copy(this.liftedPosition);
    this.returnQuaternion.copy(this.tiltedQuaternion);
    this.phase = PHASES[0];
    this.elapsed = 0;
    return true;
  }

  /** The challenge holds its tilt until the player stops; return without a snap. */
  stop() {
    if (!this.active || ['untilting', 'returning'].includes(this.phase))
      return false;
    this.returnPosition.copy(this.pivot.position);
    this.returnQuaternion.copy(this.pivot.quaternion);
    this.phaseIndex = 3;
    this.phase = 'untilting';
    this.elapsed = 0;
    return true;
  }

  applyPose(amount) {
    const t = smoothstep(MathUtils.clamp(amount, 0, 1));
    if (this.phase === 'lifting') {
      this.pivot.position.lerpVectors(
        this.startPosition,
        this.liftedPosition,
        t,
      );
      this.pivot.quaternion.slerpQuaternions(
        this.startQuaternion,
        this.homeQuaternion,
        t,
      );
    } else if (this.phase === 'tilting') {
      this.pivot.position.copy(this.liftedPosition);
      this.pivot.quaternion.slerpQuaternions(
        this.homeQuaternion,
        this.tiltedQuaternion,
        t,
      );
    } else if (this.phase === 'pouring') {
      this.pivot.position.copy(this.liftedPosition);
      this.pivot.quaternion.copy(this.tiltedQuaternion);
    } else if (this.phase === 'untilting') {
      this.pivot.position.copy(this.returnPosition);
      this.pivot.quaternion.slerpQuaternions(
        this.returnQuaternion,
        this.homeQuaternion,
        t,
      );
    } else if (this.phase === 'returning') {
      this.pivot.position.lerpVectors(
        this.returnPosition,
        this.homePosition,
        t,
      );
      this.pivot.quaternion.copy(this.homeQuaternion);
    }
    this.pivot.updateMatrixWorld(true);
  }

  update(dt) {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    // A moving held cup changes the destination, never the pot's pivot. Smooth
    // pursuit avoids teleporting a heavy vessel when controller poses jitter.
    if (['lifting', 'tilting', 'pouring'].includes(this.phase))
      this.liftedPosition.lerp(this.targetPosition, 1 - Math.exp(-12 * dt));
    // Consume boundaries exactly; 30 Hz and 72 Hz follow the same timeline.
    while (dt > 0 && this.active) {
      if (this.phase === 'pouring' && this.manualStop) {
        this.applyPose(1);
        return;
      }
      const duration = this.durations[this.phase],
        step = Math.min(dt, duration - this.elapsed);
      this.elapsed += step;
      dt -= step;
      this.applyPose(this.elapsed / duration);
      if (this.elapsed + 1e-9 >= duration) {
        if (this.phase === 'pouring') {
          this.returnPosition.copy(this.pivot.position);
          this.returnQuaternion.copy(this.pivot.quaternion);
        }
        this.phaseIndex++;
        this.elapsed = 0;
        this.phase = PHASES[this.phaseIndex] || 'idle';
        if (!this.active) {
          // Restore the exact stored transform; do not retain interpolation drift.
          this.pivot.position.copy(this.homePosition);
          this.pivot.quaternion.copy(this.homeQuaternion);
          this.pivot.updateMatrixWorld(true);
        }
      }
    }
  }

  cancel({ restore = true } = {}) {
    this.phase = 'idle';
    this.phaseIndex = -1;
    this.elapsed = 0;
    if (restore) {
      this.pivot.position.copy(this.homePosition);
      this.pivot.quaternion.copy(this.homeQuaternion);
      this.pivot.updateMatrixWorld(true);
    }
  }
}
export default DallahPourAnimator;
```

## src/objects/EngravingTool.js

```javascript
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
```

## src/objects/FrankincenseTree.js

```javascript
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
```

## src/objects/HalwaCookingSet.js

```javascript
import * as THREE from 'three';
import {
  V,
  palette,
  material,
  lathe,
  ring,
  rod,
  cylinder,
  sphere,
  box,
  tube,
  instance,
  batchStatic,
} from '../utils/GeometryUtils.js';

export function createHalwaSet() {
  const g = new THREE.Group();
  g.name = 'Omani halwa kitchen';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  cylinder(d, 0.235, 0.25, 0.025, m.sand, [0, 0.0125, 0], 40);
  for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
    const log = rod(
      d,
      [-Math.cos(a) * 0.14, 0.04, -Math.sin(a) * 0.14],
      [Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14],
      0.018,
      m.woodDark,
    );
  }
  const fire = new THREE.Group();
  g.add(fire);
  const flameMat = material('#ffb52d', 0, 0.5, {
    emissive: '#ff6508',
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      r = 0.015 + i * 0.007;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.095, 7), flameMat);
    f.position.set(Math.sin(a) * r, 0.075, Math.cos(a) * r);
    f.scale.y = 0.7 + (i % 3) * 0.13;
    fire.add(f);
  }
  for (const x of [-0.12, 0.12])
    for (const z of [-0.1, 0.1])
      rod(d, [x, 0.025, z], [x * 0.8, 0.125, z * 0.8], 0.009, m.charcoal);
  const cauldron = new THREE.Group();
  g.add(cauldron);
  const body = lathe(
    cauldron,
    [
      [0.035, 0.09],
      [0.095, 0.097],
      [0.145, 0.135],
      [0.174, 0.2],
      [0.181, 0.218],
      [0.179, 0.225],
      [0.17, 0.225],
      [0.165, 0.204],
      [0.135, 0.142],
      [0.088, 0.108],
      [0.035, 0.104],
    ],
    m.copper,
    40,
  );
  ring(cauldron, 0.177, 0.006, m.gold, [0, 0.221, 0]);
  ring(cauldron, 0.147, 0.003, m.goldDark, [0, 0.14, 0]);
  for (const x of [-0.195, 0.195]) {
    ring(
      cauldron,
      0.031,
      0.004,
      m.gold,
      [x, 0.193, 0],
      [Math.PI / 2, Math.PI / 2, 0],
    );
  }
  const mixture = cylinder(
    g,
    0.163,
    0.163,
    0.007,
    material('#b57336', 0.2, 0.28),
    [0, 0.203, 0],
    40,
  );
  mixture.name = 'Halwa mixture';
  const swirl = tube(
    g,
    Array.from({ length: 45 }, (_, i) => {
      const a = i * 0.32,
        r = 0.015 + i * 0.0028;
      return [Math.cos(a) * r, 0.208, Math.sin(a) * r];
    }),
    0.002,
    m.goldDark,
    false,
    44,
  );
  swirl.userData.dynamic = true;
  const ingredients = [];
  const names = ['sugar', 'saffron', 'nuts'];
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * 0.32,
      container = new THREE.Group();
    container.position.set(x, 0, 0.3);
    d.add(container);
    lathe(
      container,
      [
        [0, 0],
        [0.032, 0],
        [0.044, 0.008],
        [0.056, 0.033],
        [0.058, 0.044],
        [0.052, 0.044],
        [0.044, 0.015],
        [0, 0.008],
      ],
      m.goldDark,
      24,
    );
    ring(container, 0.056, 0.002, m.gold, [0, 0.043, 0]);
    const ingredient = new THREE.Group();
    ingredient.name = names[k];
    ingredient.position.set(x, 0.075, 0.3);
    g.add(ingredient);
    const mat = [m.ivory, material('#d85b16', 0, 0.8), m.woodLight][k],
      bits = [];
    for (let j = 0; j < 11; j++) {
      const a = j * 2.399,
        r = Math.sqrt(j / 11) * 0.029;
      bits.push({
        position: [Math.cos(a) * r, (j % 3) * 0.006, Math.sin(a) * r],
        rotation: [j * 0.3, j * 0.9, j * 0.5],
        scale: k === 1 ? [0.3, 1.6, 0.3] : k === 2 ? [0.6, 1, 0.5] : [1, 1, 1],
      });
    }
    instance(
      ingredient,
      k === 0
        ? new THREE.BoxGeometry(0.009, 0.009, 0.009)
        : new THREE.SphereGeometry(0.01, 6, 5),
      mat,
      bits,
    );
    const halo = ring(ingredient, 0.037, 0.002, m.turquoise, [0, 0.005, 0]);
    ingredient.userData = { ingredient: names[k], halo };
    ingredients.push(ingredient);
  }
  const stick = new THREE.Group();
  stick.position.set(0.09, 0.29, 0.025);
  g.add(stick);
  rod(stick, [0, -0.1, 0], [0, 0.13, 0], 0.006, m.woodLight, 10);
  box(stick, 0.025, 0.052, 0.009, m.wood, [0, -0.09, 0]);
  ring(stick, 0.012, 0.002, m.turquoise, [0, 0.105, 0]);
  stick.name = 'Wooden stirring stick';
  // A separate woven palm-leaf mahafa, with its origin at the handle grip.
  // The scene keeps this Group independent so either controller can carry it.
  const fan = new THREE.Group();
  fan.name = 'Palm-leaf mahafa';
  fan.position.set(0.34, 0.13, 0.12);
  g.add(fan);
  const straw = material('#d7bd82', 0, 0.88, { map: m.ivory.map }),
    weave = material('#a17b43', 0, 0.92),
    dyed = material('#804233', 0, 0.86);
  const leaf = new THREE.Shape();
  leaf.moveTo(-0.065, 0.09);
  leaf.quadraticCurveTo(-0.085, 0.09, -0.085, 0.11);
  leaf.lineTo(-0.085, 0.24);
  leaf.quadraticCurveTo(-0.085, 0.265, -0.06, 0.265);
  leaf.lineTo(0.06, 0.265);
  leaf.quadraticCurveTo(0.085, 0.265, 0.085, 0.24);
  leaf.lineTo(0.085, 0.11);
  leaf.quadraticCurveTo(0.085, 0.09, 0.065, 0.09);
  leaf.closePath();
  const leafMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(leaf, {
      depth: 0.004,
      bevelEnabled: false,
      curveSegments: 4,
    }),
    straw,
  );
  leafMesh.position.z = -0.002;
  leafMesh.castShadow = leafMesh.receiveShadow = true;
  fan.add(leafMesh);
  rod(fan, [0, -0.065, 0], [0, 0.247, 0], 0.007, m.woodLight, 8);
  // Alternating strips read as interlaced palm fibres on both sides.
  for (let i = 0; i < 12; i++) {
    const y = 0.105 + i * 0.013;
    for (const z of [-0.0035, 0.0035])
      box(fan, 0.155, 0.0015, 0.001, weave, [0, y, z]);
  }
  for (let i = 0; i < 11; i++) {
    const x = -0.07 + i * 0.014;
    for (const z of [-0.004, 0.004])
      box(fan, 0.0015, 0.15, 0.001, weave, [x, 0.18, z]);
  }
  tube(
    fan,
    [
      [-0.065, 0.09, 0],
      [-0.085, 0.11, 0],
      [-0.085, 0.24, 0],
      [-0.06, 0.265, 0],
      [0.06, 0.265, 0],
      [0.085, 0.24, 0],
      [0.085, 0.11, 0],
      [0.065, 0.09, 0],
    ],
    0.003,
    weave,
    true,
    24,
  );
  for (const x of [-0.045, 0, 0.045])
    for (const z of [-0.005, 0.005])
      box(fan, 0.014, 0.014, 0.001, dyed, [x, 0.18, z], [0, 0, Math.PI / 4]);
  for (const y of [-0.045, -0.03, -0.015])
    ring(fan, 0.0075, 0.0012, dyed, [0, y, 0]);
  fan.userData = { grabbable: true, grip: V(0, 0, 0), head: V(0, 0.18, 0) };
  batchStatic(fan);
  const servingBowl = new THREE.Group();
  servingBowl.position.set(0, 0.05, 0.32);
  servingBowl.visible = false;
  g.add(servingBowl);
  lathe(
    servingBowl,
    [
      [0, 0],
      [0.055, 0],
      [0.08, 0.025],
      [0.105, 0.06],
      [0.108, 0.065],
      [0.1, 0.066],
      [0.077, 0.035],
      [0, 0.016],
    ],
    m.gold,
    32,
  );
  ring(servingBowl, 0.105, 0.003, m.goldDark, [0, 0.065, 0]);
  cylinder(
    servingBowl,
    0.098,
    0.098,
    0.006,
    material('#71361d', 0.15, 0.28),
    [0, 0.055, 0],
    32,
  );
  const nuts = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4,
      r = Math.sqrt(i / 12) * 0.079;
    nuts.push({
      position: [Math.cos(a) * r, 0.06, Math.sin(a) * r],
      rotation: [0, a, 0],
      scale: [0.7, 0.4, 1],
    });
  }
  instance(servingBowl, new THREE.SphereGeometry(0.008, 7, 5), m.ivory, nuts);
  batchStatic(d);
  batchStatic(cauldron);
  g.userData = {
    cauldron,
    mixture,
    swirl,
    ingredients,
    stick,
    fan,
    fire,
    servingBowl,
    bowlCenter: V(0, 0.22, 0),
    bowlRadius: 0.16,
  };
  return g;
}
```

## src/objects/NizwaFort.js

```javascript
import * as THREE from 'three';
import {
  palette,
  cylinder,
  ring,
  box,
  arch,
  frame,
  instance,
  pointedShape,
  batchStatic,
  rosette,
} from '../utils/GeometryUtils.js';

export function createFort() {
  const g = new THREE.Group();
  g.name = 'Fort tower diorama';
  const d = new THREE.Group();
  g.add(d);
  const m = palette();
  cylinder(d, 0.286, 0.29, 0.025, m.sand, [0, 0.0125, 0], 48);
  cylinder(d, 0.225, 0.25, 0.61, m.sand, [0, 0.33, 0], 64);
  cylinder(d, 0.219, 0.219, 0.014, m.woodDark, [0, 0.64, 0], 48);
  const parapet = cylinder(
    d,
    0.228,
    0.229,
    0.047,
    m.sand,
    [0, 0.636, 0],
    64,
    true,
  );
  parapet.material = m.sand.clone();
  parapet.material.side = THREE.DoubleSide;
  for (const [y, r] of [
    [0.052, 0.249],
    [0.36, 0.238],
    [0.615, 0.229],
    [0.66, 0.23],
  ])
    ring(d, r, 0.0037, m.sand, [0, y, 0]);
  const crenelGeo = new THREE.ExtrudeGeometry(pointedShape(0.027, 0.045), {
    depth: 0.018,
    bevelEnabled: true,
    bevelSize: 0.0018,
    bevelThickness: 0.001,
    bevelSegments: 1,
    curveSegments: 6,
  });
  const battlements = [];
  for (let i = 0; i < 30; i++) {
    const a = (i * Math.PI * 2) / 30;
    battlements.push({
      position: [Math.sin(a) * 0.222, 0.654, Math.cos(a) * 0.222],
      rotation: [0, a, 0],
    });
  }
  instance(d, crenelGeo, m.sand, battlements);
  const slits = [];
  for (let i = 0; i < 22; i++) {
    const a = (i * Math.PI * 2) / 22;
    slits.push({
      position: [Math.sin(a) * 0.231, 0.588, Math.cos(a) * 0.231],
      rotation: [0, a, 0],
    });
  }
  instance(d, new THREE.BoxGeometry(0.0045, 0.022, 0.0017), m.woodDark, slits);
  const stones = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 35; i++) {
      const a = ((i + (row % 2) * 0.5) * Math.PI * 2) / 35;
      stones.push({
        position: [Math.sin(a) * 0.25, 0.04 + row * 0.022, Math.cos(a) * 0.25],
        rotation: [0, a, 0],
        scale: [0.9 + (i % 3) * 0.04, 0.9, 1],
      });
    }
  instance(d, new THREE.BoxGeometry(0.042, 0.019, 0.003), m.sand, stones);
  for (const a of [-0.9, 1.1, 2.4])
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4 - row; i++) {
        const t = a + (i + row * 0.2) * 0.1;
        box(
          d,
          0.022,
          0.013,
          0.0025,
          m.goldDark,
          [
            Math.sin(t) * (0.25 - row * 0.002),
            0.13 + row * 0.014,
            Math.cos(t) * (0.25 - row * 0.002),
          ],
          [0, t, 0],
        );
      }
  const windows = [];
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const panel = new THREE.Group();
    panel.position.set(Math.sin(a) * 0.24, 0.373, Math.cos(a) * 0.24);
    panel.rotation.y = a;
    g.add(panel);
    arch(panel, 0.054, 0.098, 0.006, m.goldDark);
    const win = arch(panel, 0.04, 0.081, 0.007, m.glow, [0, 0.007, 0.001]);
    windows.push(win);
    rosette(panel, 0, 0.045, 0.01, 0.014, m.goldDark);
    batchStatic(panel);
  }
  const door = box(d, 0.073, 0.18, 0.014, m.wood, [0.06, 0.123, 0.246]);
  frame(d, 0.098, 0.202, 0.025, 0.012, m.sand, [0.06, 0.126, 0.253]);
  const studs = [];
  for (const x of [0.035, 0.06, 0.085])
    for (const y of [0.06, 0.1, 0.14, 0.185])
      studs.push({ position: [x, y, 0.257] });
  instance(d, new THREE.SphereGeometry(0.0025, 7, 5), m.goldDark, studs);
  ring(d, 0.007, 0.0014, m.goldDark, [0.066, 0.11, 0.26], [0, 0, 0]);
  for (let i = 0; i < 2; i++)
    box(d, 0.12 - i * 0.014, 0.012, 0.05, m.sand, [
      0.06,
      0.012 + i * 0.012,
      0.285 - i * 0.014,
    ]);
  // Increase the landmark itself without changing the workshop or interaction scale.
  g.scale.setScalar(1.2);
  batchStatic(d);
  g.userData = { door, windows, height: 0.84, baseDiameter: 0.696 };
  return g;
}
```

## src/objects/OmaniCoffeeSet.js

```javascript
import * as THREE from 'three';
import {
  V,
  palette,
  material,
  lathe,
  ring,
  tube,
  cylinder,
  rod,
  sphere,
  rosette,
  batchStatic,
} from '../utils/GeometryUtils.js';

export function createCoffeeSet() {
  const g = new THREE.Group();
  g.name = 'Omani hospitality tray';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  cylinder(d, 0.39, 0.39, 0.014, m.goldDark, [0, 0.007, 0], 48);
  ring(d, 0.38, 0.006, m.gold, [0, 0.015, 0]);
  ring(d, 0.34, 0.002, m.gold, [0, 0.016, 0]);
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI * 2) / 32;
    sphere(
      d,
      0.003,
      m.gold,
      [Math.sin(a) * 0.363, 0.017, Math.cos(a) * 0.363],
      6,
    );
  }
  // Vessel vertices stay above y=0: the Group origin is its bottom, not its
  // center or the tray. Wrist input and the pour animator share this base pivot.
  const dallah = new THREE.Group();
  dallah.position.set(-0.22, 0.015, 0);
  g.add(dallah);
  dallah.name = 'Dallah base pivot';
  dallah.userData.pivotAtBase = true;
  m.gold.color.set('#d0a24d');
  m.gold.metalness = 0.88;
  m.gold.roughness = 0.3;
  m.gold.envMapIntensity = 1.05;
  m.goldDark.color.set('#80602f');
  m.goldDark.metalness = 0.8;
  m.goldDark.roughness = 0.4;
  lathe(
    dallah,
    [
      [0, 0],
      [0.058, 0],
      [0.073, 0.023],
      [0.085, 0.07],
      [0.078, 0.13],
      [0.054, 0.17],
      [0.04, 0.205],
      [0.045, 0.22],
    ],
    m.gold,
    40,
  );
  for (const [y, r] of [
    [0.02, 0.07],
    [0.145, 0.071],
    [0.168, 0.054],
    [0.215, 0.044],
  ])
    ring(dallah, r, 0.0025, m.goldDark, [0, y, 0]);
  const lid = lathe(
    dallah,
    [
      [0, 0.22],
      [0.049, 0.22],
      [0.045, 0.23],
      [0.031, 0.252],
      [0.009, 0.265],
      [0, 0.269],
    ],
    m.gold,
    32,
  );
  sphere(dallah, 0.009, m.gold, [0, 0.277, 0]);
  tube(
    dallah,
    [
      [-0.056, 0.186, 0],
      [-0.112, 0.205, 0],
      [-0.133, 0.151, 0],
      [-0.117, 0.081, 0],
      [-0.079, 0.067, 0],
    ],
    0.007,
    m.goldDark,
    false,
    24,
  );
  // Curved rising spout is a tapered, open radial mesh, with an exposed nozzle.
  const spoutPoints = [
      V(0.058, 0.13, 0),
      V(0.095, 0.16, 0),
      V(0.12, 0.21, 0),
      V(0.16, 0.24, 0),
    ],
    curve = new THREE.CatmullRomCurve3(spoutPoints);
  const geometry = new THREE.TubeGeometry(curve, 20, 0.012, 10, false),
    p = geometry.attributes.position;
  for (let i = 0; i <= 20; i++) {
    const center = curve.getPointAt(i / 20),
      factor = 1 - (i / 20) * 0.55;
    for (let j = 0; j <= 10; j++) {
      const idx = i * 11 + j;
      p.setXYZ(
        idx,
        center.x + (p.getX(idx) - center.x) * factor,
        center.y + (p.getY(idx) - center.y) * factor,
        center.z + (p.getZ(idx) - center.z) * factor,
      );
    }
  }
  geometry.computeVertexNormals();
  dallah.add(new THREE.Mesh(geometry, m.gold));
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const panel = new THREE.Group();
    panel.position.set(Math.sin(a) * 0.079, 0.095, Math.cos(a) * 0.079);
    panel.rotation.y = a;
    dallah.add(panel);
    rosette(panel, 0, 0, 0.001, 0.026, m.goldDark);
    batchStatic(panel);
  }
  batchStatic(dallah);
  const spout = new THREE.Object3D();
  spout.name = 'Spout outlet';
  spout.position.set(0.16, 0.24, 0);
  dallah.add(spout);
  const cups = [];
  for (const [x, z] of [
    [0.25, 0.08],
    [0.11, -0.17],
    [0.27, -0.15],
  ]) {
    const cup = new THREE.Group();
    cup.name = cups.length === 0 ? 'Grabbable fenjan' : 'Serving fenjan';
    cup.userData.grabbable = cups.length === 0;
    cup.position.set(x, 0.015, z);
    g.add(cup);
    lathe(
      cup,
      [
        [0, 0],
        [0.026, 0],
        [0.029, 0.012],
        [0.04, 0.072],
        [0.042, 0.083],
        [0.038, 0.084],
        [0.034, 0.071],
        [0.025, 0.015],
        [0, 0.01],
      ],
      m.ivory,
      28,
    );
    ring(cup, 0.04, 0.002, m.gold, [0, 0.08, 0]);
    ring(cup, 0.029, 0.002, m.goldDark, [0, 0.02, 0]);
    cups.push(cup);
  }
  // Keep markers attached to the cup so the stream follows it in either hand.
  const cupMouth = new THREE.Object3D();
  cupMouth.name = 'Fenjan mouth';
  cupMouth.position.set(0, 0.084, 0);
  cups[0].add(cupMouth);
  const liquid = cylinder(
    cups[0],
    0.034,
    0.034,
    0.004,
    material('#382015', 0, 0.22),
    [0, 0.025, 0],
    28,
  );
  liquid.visible = false;
  const stream = cylinder(
    g,
    0.003,
    0.003,
    1,
    material('#6e3c1b', 0, 0.25, { transparent: true, opacity: 0.85 }),
    [0, 0, 0],
    8,
  );
  stream.visible = false;
  stream.name = 'Coffee stream';
  const halwa = new THREE.Group();
  halwa.position.set(-0.03, 0.018, 0.19);
  g.add(halwa);
  lathe(
    halwa,
    [
      [0, 0],
      [0.049, 0],
      [0.07, 0.03],
      [0.075, 0.04],
      [0.068, 0.04],
      [0, 0.012],
    ],
    m.gold,
    28,
  );
  cylinder(
    halwa,
    0.065,
    0.065,
    0.007,
    material('#71361d', 0.1, 0.25),
    [0, 0.03, 0],
    28,
  );
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      r = Math.sqrt(i / 7) * 0.05;
    const nut = sphere(
      halwa,
      0.006,
      m.ivory,
      [Math.cos(a) * r, 0.035, Math.sin(a) * r],
      7,
    );
    nut.scale.y = 0.4;
  }
  const baseMarker = new THREE.Object3D();
  baseMarker.name = 'Dallah bottom pivot marker';
  dallah.add(baseMarker);
  batchStatic(d);
  g.userData = {
    dallah,
    dallahPivot: dallah,
    baseMarker,
    spout,
    cups,
    cup: cups[0],
    cupMouth,
    cupGrip: V(0, 0.045, 0),
    liquid,
    stream,
    halwa,
    cupCenter: V(0.25, 0.1, 0.08),
  };
  return g;
}
```

## src/objects/OmaniDhow.js

```javascript
import * as THREE from 'three';
import {palette,mesh,box,rod,tube,ring,cylinder,batchStatic,instance,material} from '../utils/GeometryUtils.js';
import {createFlag} from './OmaniFlag.js';

export function createDhow(){
  const g=new THREE.Group();g.name='Omani dhow';const m=palette(),d=new THREE.Group();g.add(d);
  box(d,.94,.022,.22,m.woodDark,[0,.011,0]);for(const x of [-.29,.29])box(d,.027,.045,.12,m.wood,[x,.042,0]);
  // Hull: longitudinal stations with a rounded, deep cross-section and raised ends.
  const positions=[],uv=[],indices=[],N=40,M=18;
  function section(u,v){const x=(u-.5)*1.08,ends=Math.pow(Math.abs(u-.5)*2,3),beam=.101*Math.pow(Math.sin(Math.PI*u),.55),theta=v*Math.PI;return [x,.061+ends*.072+.086*(1-Math.sin(theta)),Math.cos(theta)*beam];}
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){positions.push(...section(i/N,j/M));uv.push(i/N,j/M);if(i<N&&j<M){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}}
  const hullGeo=new THREE.BufferGeometry();hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hullGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));hullGeo.setIndex(indices);hullGeo.computeVertexNormals();mesh(d,hullGeo,m.woodLight);
  // Thin strakes trace the curvature rather than replacing the hull by boxes.
  for(let j=1;j<M;j+=2){const points=[];for(let i=0;i<=N;i++)points.push(section(i/N,j/M));tube(d,points,.0013,j>6&&j<12?m.ivory:m.woodDark,false,40);}
  const deck=new THREE.Shape();deck.moveTo(-.52,0);for(let i=1;i<=20;i++){const u=i/20;deck.lineTo((u-.5)*1.04,.094*Math.pow(Math.sin(Math.PI*u),.55));}for(let i=19;i>=0;i--){const u=i/20;deck.lineTo((u-.5)*1.04,-.094*Math.pow(Math.sin(Math.PI*u),.55));}deck.closePath();
  const deckMesh=mesh(d,new THREE.ExtrudeGeometry(deck,{depth:.008,bevelEnabled:false}),m.wood);deckMesh.rotation.x=Math.PI/2;deckMesh.position.y=.148;
  for(let k=-3;k<=3;k++)rod(d,[-.41,.150,k*.022],[.41,.150,k*.022],.001,m.goldDark);
  const railPosts=[];for(const side of [-1,1]){
    const points=[];for(let i=1;i<20;i++){const u=i/20,[x,y,z]=section(u,side<0?1:0);points.push([x,y+.028,z]);if(i%2===0)railPosts.push({position:[x,y+.014,z],scale:[1,1,1]});}tube(d,points,.003,m.woodDark,false,32);
  }
  instance(d,new THREE.CylinderGeometry(.002,.002,.028,6),m.goldDark,railPosts);
  const mastX=.04;rod(d,[mastX,.145,0],[mastX,.385,0],.005,m.woodLight);rod(d,[-.20,.15,0],[-.20,.285,0],.0035,m.woodLight);
  rod(d,[-.37,.22,.003],[.32,.43,.003],.004,m.woodLight);
  for(const y of [.17,.27,.37])for(let j=0;j<3;j++)ring(d,.006,.001,m.ivory,[mastX,y+j*.002,0]);
  // Subdivided triangular sail with nonuniform folds, animated through vertex positions.
  const sailPositions=[],sailUv=[],sailIndices=[],R=18;
  const A=new THREE.Vector3(-.37,.22,.007),B=new THREE.Vector3(.32,.43,.007),C=new THREE.Vector3(.29,.174,.007);
  const rowStart=[];let cursor=0;
  for(let r=0;r<=R;r++){rowStart[r]=cursor;for(let col=0;col<=r;col++){const u=r/R,v=r?col/r:0;const p=A.clone().lerp(B,u).lerp(A.clone().lerp(C,u),v);sailPositions.push(p.x,p.y,p.z);sailUv.push(u,v);cursor++;}}
  for(let r=0;r<R;r++)for(let c=0;c<=r;c++){const a=rowStart[r]+c,b=rowStart[r+1]+c;sailIndices.push(a,b,b+1);if(c<r)sailIndices.push(a,b+1,a+1);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sailPositions,3));sg.setAttribute('uv',new THREE.Float32BufferAttribute(sailUv,2));sg.setIndex(sailIndices);sg.computeVertexNormals();
  const sail=mesh(g,sg,material('#f2e5c8',0,.94,{side:THREE.DoubleSide,map:m.ivory.map}));sail.userData.original=new Float32Array(sailPositions);
  for(const p of [[-.48,.17,-.065],[-.43,.17,.065],[.40,.17,.065],[.38,.17,-.065]])rod(d,[mastX,.37,0],p,.0012,m.ivory,5);
  rod(d,[.32,.43,.003],[.42,.175,.06],.0012,m.ivory,5);rod(d,[-.37,.22,0],[-.49,.18,0],.0012,m.ivory,5);
  // Stern canopy and carved cabin.
  box(d,.20,.012,.155,m.wood,[.34,.245,0]);for(const x of [.25,.43])for(const z of [-.065,.065])rod(d,[x,.16,z],[x,.24,z],.004,m.woodLight);
  box(d,.12,.043,.10,m.woodDark,[.17,.173,0]);for(const y of [.16,.18,.195])rod(d,[.11,y,.052],[.23,y,.052],.0015,m.goldDark);
  for(const x of [-.17,-.08]){cylinder(d,.022,.024,.035,m.woodLight,[x,.168,0],12);for(const y of [.156,.181])ring(d,.024,.0015,m.goldDark,[x,y,0]);}
  const handle=ring(g,.021,.004,m.turquoise,[.22,.34,.13],[0,0,0]);handle.name='Sail rope handle';
  const rope=tube(g,[[.22,.40,.13],[.22,.37,.13],[.22,.34,.13]],.002,m.ivory,false,8);rope.userData.dynamic=true;
  const flag=createFlag(.095);flag.position.set(.44,.23,0);g.add(flag);
  batchStatic(d);g.userData={sail,ropeHandle:handle,rope,flag};setSailProgress(g,0);return g;
}
export function setSailProgress(group,progress){
  const sail=group.userData.sail;if(!sail)return;const t=THREE.MathUtils.clamp(progress,0,1),p=sail.geometry.attributes.position,base=sail.userData.original;
  for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1];const topY=.22+(x+.37)/.69*.21;const depth=topY-y;p.setXYZ(i,x,topY-depth*(.12+.88*t),.007+Math.sin((x+.37)*36)*.009*(1-t)+Math.sin(depth*15)*.012*t);}
  p.needsUpdate=true;sail.geometry.computeVertexNormals();group.userData.sailProgress=t;
}
```

## src/objects/OmaniFlag.js

```javascript
import * as THREE from 'three';
import {palette,rod,sphere} from '../utils/GeometryUtils.js';

// Published for download by Oman's Foreign Ministry. See docs/MODELING.md.
export function createFlag(width=.3){
  const g=new THREE.Group();g.name='Omani national flag';const m=palette();const h=width*1143/2000;
  rod(g,[0,0,0],[0,h+.10,0],.0028,m.gold);sphere(g,.006,m.gold,[0,h+.102,0]);
  const geometry=new THREE.PlaneGeometry(width,h,24,8);geometry.translate(width/2,h/2+.09,0);
  const texture=typeof document!=='undefined'?new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL||'/'}assets/textures/oman-flag-official.jpg`):null;if(texture)texture.colorSpace=THREE.SRGBColorSpace;
  const cloth=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.9,side:THREE.DoubleSide}));cloth.name='Deformable flag cloth';g.add(cloth);
  g.userData={cloth,width,height:h};return g;
}
export function updateFlag(group,time,reducedMotion=false){
  const {cloth,width}=group.userData;if(!cloth)return;const p=cloth.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,reducedMotion?0:Math.sin(x*26-time*2.2+y*5)*.015*(x/width));}p.needsUpdate=true;cloth.geometry.computeVertexNormals();
}
```

## src/objects/OmaniGate.js

```javascript
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
```

## src/objects/OmaniLantern.js

```javascript
import * as THREE from 'three';
import {palette,material,cylinder,ring,rod,lathe,sphere,star,rosette,tube,batchStatic} from '../utils/GeometryUtils.js';

export function createLantern(){
  const g=new THREE.Group();g.name='Omani celebration lantern';const m=palette(),d=new THREE.Group();g.add(d);
  for(const [y,rt,rb,h]of [[.025,.11,.14,.05],[.08,.145,.11,.05],[.46,.145,.145,.022],[.50,.095,.15,.065]]){const b=cylinder(d,rt,rb,h,m.gold,[0,y,0],6);b.rotation.y=Math.PI/6;}
  const panels=[];for(let i=0;i<6;i++){
    const a=i*Math.PI/3,postX=Math.sin(a)*.145,postZ=Math.cos(a)*.145;rod(d,[postX,.10,postZ],[postX,.45,postZ],.005,m.gold);
    const p=new THREE.Group();p.rotation.y=a+Math.PI/6;p.position.set(Math.sin(a+Math.PI/6)*.126,.105,Math.cos(a+Math.PI/6)*.126);g.add(p);panels.push(p);
    // Open lattice exposes the interior and uses physical 3D ribs.
    for(const y of [.045,.12,.195,.27]){
      const points=[[-.061,y,0],[0,y+.055,0],[.061,y,0],[0,y-.055,0],[-.061,y,0]];tube(p,points,.0023,m.gold,false,12);
      star(p,0,y,0,.024,m.goldDark);sphere(p,.004,m.turquoise,[0,y,.001],7);
    }
    for(const x of [-.061,.061])rod(p,[x,0,0],[x,.34,0],.0025,m.goldDark);
    batchStatic(p);
  }
  const crown=lathe(d,[[.088,0],[.076,.02],[.047,.045],[.033,.07],[.01,.088],[0,.095]],m.gold,32);crown.position.y=.531;
  ring(d,.020,.003,m.gold,[0,.648,0],[0,0,0]);
  for(const y of [.095,.468])ring(d,.14,.002,m.turquoise,[0,y,0]);
  const core=sphere(g,.068,material('#ffe4a3',0,.3,{emissive:'#ffbe58',emissiveIntensity:3,transparent:true,opacity:.9}),[0,.275,0],20);core.scale.y=2.0;
  const light=new THREE.PointLight('#ffd17e',1.8,1.6,2);light.position.set(0,.28,0);g.add(light);
  batchStatic(d);g.userData={core,light,panels};return g;
}
```

## src/objects/OmaniMabkhara.js

```javascript
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  V,
  palette,
  cylinder,
  ring,
  tube,
  sphere,
  batchStatic,
  lathe,
} from '../utils/GeometryUtils.js';

/** Small deterministic relief/roughness texture; metal color remains physically based. */
function hammeredTexture() {
  const size = 64,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const grain =
        Math.sin(x * 2.17 + y * 1.39) * Math.sin(x * 0.73 - y * 1.71);
      const value = Math.round(215 + grain * 24),
        index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Raised ornament follows each sloped panel, preventing z-fighting/intersections.
function relief(parent, cx, cy, radius, material, depthAt) {
  const star = [];
  for (let i = 0; i <= 16; i++) {
    const angle = (i * Math.PI) / 8,
      r = i % 2 ? radius * 0.46 : radius;
    const x = cx + Math.sin(angle) * r,
      y = cy + Math.cos(angle) * r;
    star.push([x, y, depthAt(y) + 0.01]);
  }
  tube(parent, star, 0.0014, material, false, 32);
  for (let petal = 0; petal < 4; petal++) {
    const angle = (petal * Math.PI) / 2;
    const points = Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2,
        u = Math.sin(t) * radius * 0.2;
      const v = (Math.cos(t) * 0.29 + 0.36) * radius;
      const x = cx + u * Math.cos(angle) - v * Math.sin(angle);
      const y = cy + u * Math.sin(angle) + v * Math.cos(angle);
      return [x, y, depthAt(y) + 0.011];
    });
    tube(parent, points, 0.0011, material, true, 20);
  }
}

export function createMabkhara() {
  const group = new THREE.Group();
  group.name = 'Traditional Omani majmar with hammered brass and charcoal';
  const detail = new THREE.Group();
  group.add(detail);
  const m = palette(),
    hammered = hammeredTexture();
  m.gold.color.set('#c99a47');
  m.gold.metalness = 0.88;
  m.gold.roughness = 0.38;
  m.gold.roughnessMap = hammered;
  m.gold.bumpMap = hammered;
  m.gold.bumpScale = 0.00035;
  m.gold.envMapIntensity = 1.1;
  m.goldDark.color.set('#725027');
  m.goldDark.metalness = 0.78;
  m.goldDark.roughness = 0.43;
  m.goldDark.envMapIntensity = 0.85;
  const polished = m.gold.clone();
  polished.roughness = 0.22;
  polished.bumpMap = null;
  polished.roughnessMap = null;
  // Quiet enamel inlays and dark recesses make the hand-worked brass readable
  // under both the desktop environment map and the headset's stereo lighting.
  const enamel = new THREE.MeshStandardMaterial({
    color: '#f0dfb8',
    metalness: 0.08,
    roughness: 0.32,
  });

  // Rounded, stepped plinth catches environment reflections on real bevels.
  const foot = new THREE.Mesh(
    new RoundedBoxGeometry(0.25, 0.018, 0.25, 2, 0.005),
    polished,
  );
  foot.position.y = 0.009;
  detail.add(foot);
  const base = cylinder(detail, 0.105, 0.165, 0.076, m.gold, [0, 0.056, 0], 4);
  base.rotation.y = Math.PI / 4;
  const top = new THREE.Mesh(
    new RoundedBoxGeometry(0.16, 0.015, 0.16, 2, 0.004),
    polished,
  );
  top.position.y = 0.101;
  detail.add(top);
  for (let side = 0; side < 4; side++) {
    const panel = new THREE.Group();
    panel.rotation.y = (side * Math.PI) / 2;
    detail.add(panel);
    const depth = (y) => 0.115 - (y - 0.02) * 0.51;
    tube(
      panel,
      [
        [-0.095, 0.025, depth(0.025)],
        [-0.06, 0.088, depth(0.088)],
        [0.06, 0.088, depth(0.088)],
        [0.095, 0.025, depth(0.025)],
        [-0.095, 0.025, depth(0.025)],
      ],
      0.0018,
      m.goldDark,
      false,
      24,
    );
    relief(panel, 0, 0.056, 0.027, m.goldDark, depth);
    batchStatic(panel);
  }

  // Four turned columns with distinct collars and a rounded upper support plate.
  for (const x of [-0.055, 0.055])
    for (const z of [-0.055, 0.055]) {
      const column = lathe(
        detail,
        [
          [0.013, 0],
          [0.013, 0.008],
          [0.009, 0.014],
          [0.008, 0.028],
          [0.008, 0.152],
          [0.01, 0.166],
          [0.013, 0.172],
          [0.013, 0.18],
        ],
        polished,
        16,
      );
      column.position.set(x, 0.108, z);
      for (const y of [0.119, 0.278])
        ring(detail, 0.01, 0.0016, m.goldDark, [x, y, z]);
    }
  const tray = new THREE.Mesh(
    new RoundedBoxGeometry(0.18, 0.018, 0.18, 2, 0.004),
    polished,
  );
  tray.position.y = 0.295;
  detail.add(tray);
  // Cross rails visually connect the four legs into one stable traditional base.
  for (let side = 0; side < 4; side++) {
    const rail = new THREE.Group();
    rail.rotation.y = (side * Math.PI) / 2;
    detail.add(rail);
    tube(
      rail,
      [
        [-0.055, 0.15, 0.055],
        [0, 0.2, 0.061],
        [0.055, 0.15, 0.055],
      ],
      0.0033,
      m.goldDark,
      false,
      20,
    );
    tube(
      rail,
      [
        [-0.055, 0.246, 0.055],
        [0, 0.2, 0.061],
        [0.055, 0.246, 0.055],
      ],
      0.0033,
      polished,
      false,
      20,
    );
    sphere(rail, 0.008, enamel, [0, 0.2, 0.063], 10);
    batchStatic(rail);
  }

  // Four flared walls, scalloped rolled rims, and visible thickness; top stays open.
  const depthAt = (y) => 0.082 + (y - 0.305) * 0.3;
  for (let side = 0; side < 4; side++) {
    const panel = new THREE.Group();
    panel.rotation.y = (side * Math.PI) / 2;
    detail.add(panel);
    const shape = new THREE.Shape();
    shape.moveTo(-0.082, 0.305);
    shape.lineTo(0.082, 0.305);
    shape.lineTo(0.156, 0.55);
    shape.bezierCurveTo(0.12, 0.552, 0.115, 0.492, 0, 0.492);
    shape.bezierCurveTo(-0.115, 0.492, -0.12, 0.552, -0.156, 0.55);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.007,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      curveSegments: 20,
    });
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++)
      positions.setZ(i, positions.getZ(i) + depthAt(positions.getY(i)));
    geometry.computeVertexNormals();
    panel.add(new THREE.Mesh(geometry, m.gold));
    const rim = [];
    for (let i = 0; i <= 32; i++) {
      const x = -0.156 + (i / 32) * 0.312,
        y = 0.492 + 0.058 * Math.pow(Math.abs(x) / 0.156, 2.5);
      rim.push([x, y, depthAt(y) + 0.005]);
    }
    tube(panel, rim, 0.0045, polished, false, 40);
    const border = [
      [-0.074, 0.317],
      [0.074, 0.317],
      [0.141, 0.532],
      [0.112, 0.494],
      [0, 0.476],
      [-0.112, 0.494],
      [-0.141, 0.532],
      [-0.074, 0.317],
    ];
    tube(
      panel,
      border.map(([x, y]) => [x, y, depthAt(y) + 0.009]),
      0.002,
      m.goldDark,
      false,
      44,
    );
    relief(panel, 0, 0.4, 0.052, m.goldDark, depthAt);
    relief(panel, -0.063, 0.451, 0.023, m.goldDark, depthAt);
    relief(panel, 0.063, 0.451, 0.023, m.goldDark, depthAt);
    for (const x of [-0.063, 0, 0.063]) {
      const y = x === 0 ? 0.4 : 0.451;
      const inset = sphere(
        panel,
        x === 0 ? 0.013 : 0.006,
        enamel,
        [x, y, depthAt(y) + 0.011],
        12,
      );
      inset.scale.z = 0.25;
    }
    for (let i = 0; i < 9; i++) {
      const x = -0.065 + i * 0.01625,
        y = 0.331;
      sphere(panel, 0.0023, polished, [x, y, depthAt(y) + 0.011], 6);
    }
    batchStatic(panel);
  }

  // Separate refractory liner and coals preserve the existing gameplay drop zone.
  const liner = new THREE.MeshStandardMaterial({
    color: '#3b3027',
    metalness: 0.15,
    roughness: 0.95,
  });
  const bowl = lathe(
    detail,
    [
      [0.025, 0],
      [0.058, 0.012],
      [0.082, 0.05],
      [0.113, 0.15],
      [0.117, 0.156],
      [0.108, 0.156],
      [0.075, 0.05],
      [0.05, 0.018],
      [0.025, 0.01],
    ],
    liner,
    40,
  );
  bowl.position.y = 0.3;
  // An ash bed fills the liner beneath the separate, individually faceted coals.
  cylinder(
    detail,
    0.094,
    0.081,
    0.014,
    new THREE.MeshStandardMaterial({ color: '#8b8072', roughness: 1 }),
    [0, 0.439, 0],
    32,
  );
  const coalMaterial = m.charcoal.clone();
  coalMaterial.color.set('#211b18');
  coalMaterial.metalness = 0.04;
  coalMaterial.roughness = 0.94;
  coalMaterial.emissive.set('#ff4d08');
  // The challenge starts cold. Lighting it enables this real emissive material.
  coalMaterial.emissiveIntensity = 0;
  const charcoal = [];
  const emberCracks = new THREE.Group();
  group.add(emberCracks);
  const crackMaterial = new THREE.MeshStandardMaterial({
    color: '#3c241d',
    emissive: '#ff6a12',
    emissiveIntensity: 0,
    roughness: 0.9,
    metalness: 0,
  });
  for (let i = 0; i < 10; i++) {
    const angle = i * 2.399,
      radius = 0.018 + Math.sqrt(i / 10) * 0.06;
    const coal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.019, 1),
      coalMaterial,
    );
    coal.position.set(
      Math.cos(angle) * radius,
      0.456 + (i % 3) * 0.006,
      Math.sin(angle) * radius,
    );
    coal.scale.set(1, 0.65, 0.85);
    coal.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    group.add(coal);
    charcoal.push(coal);
    const crack = tube(
      emberCracks,
      [
        [-0.011, 0.008, -0.004],
        [-0.003, 0.012, 0],
        [0.002, 0.011, 0.004],
        [0.011, 0.008, 0.005],
      ],
      0.0012,
      crackMaterial,
      false,
      8,
    );
    crack.position.copy(coal.position);
    crack.rotation.y = i * 0.8;
  }
  batchStatic(emberCracks);
  // This local non-shadow light warms the liner without adding shadow-map cost.
  const emberLight = new THREE.PointLight('#ff782c', 0, 0.65, 2);
  emberLight.position.set(0, 0.49, 0);
  group.add(emberLight);
  // Keep the fire bowl open: only the former raised decorative cap is removed.
  batchStatic(detail);
  group.userData = {
    bowlCenter: V(0, 0.47, 0),
    bowlRadius: 0.12,
    charcoal,
    bowl,
    coalMaterial,
    emberLight,
    crackMaterial,
    lit: false,
    setLit(lit) {
      this.lit = Boolean(lit);
      coalMaterial.emissiveIntensity = this.lit ? 1.5 : 0;
      crackMaterial.emissiveIntensity = this.lit ? 2.4 : 0;
      emberLight.intensity = this.lit ? 0.09 : 0;
    },
    updateEmbers(time) {
      coalMaterial.emissiveIntensity = this.lit
        ? 1.5 + Math.sin((Number.isFinite(time) ? time : 0) * 3.1) * 0.15
        : 0;
      crackMaterial.emissiveIntensity = this.lit
        ? coalMaterial.emissiveIntensity * 1.6
        : 0;
      emberLight.intensity = this.lit
        ? 0.09 + Math.sin((Number.isFinite(time) ? time : 0) * 3.1) * 0.008
        : 0;
    },
    materials: { brass: m.gold, polished, patina: m.goldDark },
  };
  return group;
}
```

## src/objects/OmaniVase.js

```javascript
import * as THREE from 'three';
import {
  palette,
  ring,
  tube,
  cylinder,
  batchStatic,
} from '../utils/GeometryUtils.js';

// A stable foot, rounded belly, narrow neck and rolled lip; all values are ratios.
const PROFILE = [
  [0, 0.4],
  [0.035, 0.43],
  [0.1, 0.57],
  [0.22, 0.8],
  [0.35, 0.96],
  [0.46, 1],
  [0.57, 0.95],
  [0.66, 0.79],
  [0.74, 0.57],
  [0.8, 0.43],
  [0.89, 0.42],
  [0.96, 0.49],
  [1, 0.53],
];
const BAND_HEIGHTS = [0.27, 0.46, 0.65];
function profileAt(t) {
  for (let i = 1; i < PROFILE.length; i++) {
    if (t <= PROFILE[i][0]) {
      const [a, ar] = PROFILE[i - 1],
        [b, br] = PROFILE[i];
      return THREE.MathUtils.lerp(ar, br, (t - a) / (b - a));
    }
  }
  return PROFILE.at(-1)[1];
}

export function createVase(height = 0.3, width = 0.196) {
  const g = new THREE.Group();
  g.name = 'Hand-shaped Omani stoneware vase';
  const m = palette(),
    segments = 48,
    rings = PROFILE.length * 2;
  const positions = [],
    uv = [],
    indices = [];
  for (let j = 0; j < rings; j++)
    for (let i = 0; i <= segments; i++) {
      positions.push(0, 0, 0);
      uv.push(i / segments, j / (rings - 1));
      if (j < rings - 1 && i < segments) {
        const a = j * (segments + 1) + i,
          b = a + segments + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  const body = new THREE.Mesh(geo, m.clay);
  body.castShadow = body.receiveShadow = true;
  body.userData = { segments, dynamic: true, owner: g };
  g.add(body);
  // A real closed, thick foot keeps the vessel grounded instead of an open tube.
  const foot = cylinder(g, 0.04, 0.041, 0.008, m.clay, [0, 0.004, 0], 32);
  const decoration = new THREE.Group();
  decoration.name = 'Player-painted slip decoration';
  g.add(decoration);
  const bands = BAND_HEIGHTS.map((level, id) => {
    const band = new THREE.Group();
    band.name = `Pottery decoration band ${id + 1}`;
    for (const t of [level - 0.038, level + 0.038])
      ring(band, profileAt(t) * 0.1 + 0.0007, 0.0015, m.ivory, [0, t * 0.3, 0]);
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI * 2) / 18;
      const points = [
        [0, level - 0.023],
        [0.085, level + 0.023],
        [0.17, level - 0.023],
      ].map(([da, t]) => {
        const r = profileAt(t) * 0.1 + 0.001;
        return [Math.sin(a + da) * r, t * 0.3, Math.cos(a + da) * r];
      });
      tube(band, points, 0.0012, m.ivory, false, 6);
    }
    batchStatic(band);
    band.visible = false;
    decoration.add(band);
    return band;
  });
  decoration.visible = false;
  const decorationGuides = new THREE.Group();
  decorationGuides.name = 'Three pottery painting guides';
  decorationGuides.visible = false;
  g.add(decorationGuides);
  const guideMaterial = m.turquoise.clone();
  guideMaterial.transparent = true;
  guideMaterial.opacity = 0.7;
  guideMaterial.depthWrite = false;
  const guides = BAND_HEIGHTS.map((level, id) => {
    const guide = ring(
      decorationGuides,
      0.012,
      0.002,
      guideMaterial,
      [0, level * height, (profileAt(level) * width) / 2 + 0.007],
      [0, 0, 0],
    );
    guide.name = `Paint band ${id + 1}`;
    guide.userData.decorationId = id;
    return guide;
  });
  g.userData = {
    body,
    foot,
    decoration,
    bands,
    decorationGuides,
    guides,
    height,
    width,
    decorationTargets: BAND_HEIGHTS.map((level, id) => ({
      id,
      position: [0, level * height, (profileAt(level) * width) / 2 + 0.007],
    })),
    showDecorationGuides(visible) {
      decorationGuides.visible = !!visible;
    },
    setDecoration(ids = []) {
      const selected = new Set(ids);
      decoration.visible = selected.size > 0;
      bands.forEach((band, id) => {
        band.visible = selected.has(id);
      });
      guides.forEach((guide, id) => {
        guide.visible = !selected.has(id);
      });
    },
  };
  updateVase(g, height, width);
  return g;
}

export function updateVase(vaseOrMesh, height, width) {
  const owner = vaseOrMesh.isGroup ? vaseOrMesh : vaseOrMesh.userData.owner;
  const body = owner?.userData.body || vaseOrMesh;
  const h = THREE.MathUtils.clamp(height, 0.08, 0.42),
    w = THREE.MathUtils.clamp(width, 0.09, 0.3);
  const segments = body.userData.segments || 48,
    p = body.geometry.attributes.position;
  const shape = THREE.MathUtils.clamp((h - 0.08) / 0.2, 0, 1);
  for (let j = 0; j < PROFILE.length * 2; j++) {
    const inner = j >= PROFILE.length,
      index = inner ? PROFILE.length * 2 - 1 - j : j;
    const [t, profileR] = PROFILE[index];
    const flatR = 0.4 + 0.56 * Math.sin(Math.PI * t);
    const radius =
      (THREE.MathUtils.lerp(flatR, profileR, shape) * w) / 2 -
      (inner ? 0.006 : 0);
    const y = t * h + (inner && t === 0 ? 0.008 : 0);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      p.setXYZ(
        j * (segments + 1) + i,
        Math.cos(a) * Math.max(0.003, radius),
        y,
        Math.sin(a) * Math.max(0.003, radius),
      );
    }
  }
  p.needsUpdate = true;
  body.geometry.computeVertexNormals();
  body.geometry.computeBoundingSphere();
  if (owner) {
    owner.userData.height = h;
    owner.userData.width = w;
    owner.userData.foot.scale.set(w / 0.2, 1, w / 0.2);
    owner.userData.decoration.scale.set(w / 0.2, h / 0.3, w / 0.2);
    for (const target of owner.userData.decorationTargets) {
      const t = BAND_HEIGHTS[target.id];
      target.position = [0, t * h, (profileAt(t) * w) / 2 + 0.007];
      owner.userData.guides[target.id].position.set(...target.position);
    }
  }
}
```

## src/objects/PotteryWheel.js

```javascript
import * as THREE from 'three';
import {
  V,
  palette,
  cylinder,
  box,
  arch,
  ring,
  sphere,
  batchStatic,
} from '../utils/GeometryUtils.js';

export function createPotteryWheel() {
  const g = new THREE.Group();
  g.name = 'Pottery workshop';
  const m = palette(),
    d = new THREE.Group();
  g.add(d);
  cylinder(d, 0.12, 0.14, 0.045, m.woodDark, [0, 0.0225, 0]);
  cylinder(d, 0.025, 0.035, 0.125, m.wood, [0, 0.1, 0]);
  const wheel = new THREE.Group();
  wheel.position.y = 0.169;
  g.add(wheel);
  cylinder(wheel, 0.17, 0.17, 0.022, m.woodLight);
  ring(wheel, 0.155, 0.002, m.goldDark, [0, 0.012, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    box(d, 0.03, 0.12, 0.03, m.wood, [
      Math.cos(a) * 0.1,
      0.08,
      Math.sin(a) * 0.1,
    ]);
  }
  // The .30 m vase fits this kiln at its true scale; the opening is real geometry.
  const kiln = new THREE.Group();
  kiln.position.set(0.38, 0, -0.06);
  g.add(kiln);
  const shell = new THREE.Shape();
  shell.moveTo(-0.22, 0);
  shell.lineTo(-0.22, 0.21);
  shell.quadraticCurveTo(-0.22, 0.43, 0, 0.43);
  shell.quadraticCurveTo(0.22, 0.43, 0.22, 0.21);
  shell.lineTo(0.22, 0);
  shell.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-0.126, 0.018);
  opening.lineTo(0.126, 0.018);
  opening.lineTo(0.126, 0.27);
  opening.quadraticCurveTo(0.126, 0.365, 0, 0.365);
  opening.quadraticCurveTo(-0.126, 0.365, -0.126, 0.27);
  opening.closePath();
  shell.holes.push(opening);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shell, {
      depth: 0.25,
      bevelEnabled: false,
      curveSegments: 12,
    }),
    m.sand,
  );
  body.position.z = -0.125;
  body.castShadow = body.receiveShadow = true;
  kiln.add(body);
  box(kiln, 0.42, 0.35, 0.018, m.woodDark, [0, 0.185, -0.13]);
  box(kiln, 0.44, 0.018, 0.28, m.sand, [0, 0.009, 0]);
  const glow = cylinder(kiln, 0.102, 0.102, 0.006, m.glow, [0, 0.021, 0], 24);
  glow.visible = false;
  cylinder(kiln, 0.025, 0.033, 0.07, m.sand, [0, 0.449, -0.04], 16);
  const clay = sphere(g, 0.055, m.clay, [-0.27, 0.055, 0.12], 16);
  clay.scale.y = 0.8;
  clay.name = 'Clay ball';
  batchStatic(d);
  g.userData = {
    wheel,
    clay,
    kiln,
    kilnGlow: glow,
    topCenter: V(0, 0.18, 0),
    kilnCenter: V(0.38, 0.025, -0.06),
    kilnOpening: { width: 0.252, height: 0.347, depth: 0.25 },
  };
  return g;
}
```

## src/ui/ArabicText.js

```javascript
import * as THREE from 'three';

export function textPanel(width = 0.8, height = 0.25) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * height) / width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.FrontSide,
    }),
  );
  mesh.renderOrder = 2;
  Object.assign(mesh.userData, {
    canvas,
    texture,
    panelWidth: width,
    panelHeight: height,
  });
  return mesh;
}

/** Wrap Arabic words instead of squeezing an entire sentence into a tiny line. */
export function drawPanel(
  mesh,
  lines,
  { background = '#102a2c', color = '#f0d19a', fontSize = 58 } = {},
) {
  const canvas = mesh.userData.canvas;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 24);
  context.fill();
  context.strokeStyle = '#bda265';
  context.lineWidth = 3;
  context.stroke();
  context.direction = 'rtl';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.font = `${fontSize}px Lamsat, Tahoma, sans-serif`;

  const wrap = () => {
    const result = [];
    for (const line of lines) {
      let current = '';
      for (const word of String(line).split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (
          current &&
          context.measureText(candidate).width > canvas.width - 64
        ) {
          result.push(current);
          current = word;
        } else current = candidate;
      }
      result.push(current);
    }
    return result;
  };
  // Rewrap at the fitted font size so long Arabic instructions retain legibility.
  let fittedSize = fontSize,
    wrapped;
  for (let attempt = 0; attempt < 12; attempt++) {
    context.font = `${fittedSize}px Lamsat, Tahoma, sans-serif`;
    wrapped = wrap();
    const widest = Math.max(
      1,
      ...wrapped.map((line) => context.measureText(line).width),
    );
    const fit = Math.min(
      1,
      (canvas.height - 40) / (wrapped.length * fittedSize * 1.3),
      (canvas.width - 64) / widest,
    );
    if (fit >= 0.999) break;
    fittedSize *= Math.max(0.5, fit * 0.98);
  }
  context.font = `${fittedSize}px Lamsat, Tahoma, sans-serif`;
  const lineHeight = fittedSize * 1.3;
  const firstY = canvas.height / 2 - ((wrapped.length - 1) * lineHeight) / 2;
  wrapped.forEach((line, index) =>
    context.fillText(line, canvas.width / 2, firstY + index * lineHeight),
  );
  mesh.userData.texture.needsUpdate = true;
  mesh.userData.textLayout = {
    fontSize: fittedSize,
    lineCount: wrapped.length,
    height: wrapped.length * lineHeight,
    widths: wrapped.map((line) => context.measureText(line).width),
  };
}
```

## src/ui/HUD.js

```javascript
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
    this.contacts = new Map();
    this.hovered = new Map();
    this.cooldowns = new Map();
    this.touchLocks = new Set();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.5;

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
      ['decorate-0', 'النقش السفلي'],
      ['decorate-1', 'النقش الأوسط'],
      ['decorate-2', 'النقش العلوي'],
      ['hold-cup', 'حمل الفنجان'],
      ['pour-coffee', 'ابدأ السكب'],
      ['stop-pour', 'أوقف السكب'],
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
    const key = JSON.stringify([lines, this.subtitles, snapshot.state]);
    if (key !== this.last) {
      drawPanel(this.panel, lines, { fontSize: 56 });
      drawPanel(this.story, [NARRATION[snapshot.state] || ''], {
        fontSize: 46,
      });
      this.story.visible = this.subtitles;
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
        ['light-coal', 'hold-cup', 'pour-coffee', 'stop-pour'].includes(action);
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
```

## src/ui/UIManager.js

```javascript
import { CHAPTERS, NARRATION } from '../app/Config.js';
export class UIManager {
  constructor(onAction) {
    this.onAction = onAction;
    this.subtitle = true;
    this.previous = '';
    document.querySelector('#app').innerHTML = `
      <div id="viewport" aria-label="معرض تراث عُمان ثلاثي الأبعاد"></div>
      <div id="overlay">
        <header class="topbar"><a class="brand" href="#" aria-label="لمسة عمان"><span class="brand-mark">♜</span><span>لمسة عُمان<small>LAMSAT OMAN</small></span></a><section class="audio-controls" aria-label="التحكم بالصوت"><button data-action="effects" aria-pressed="false">◖ كتم المؤثرات</button><span id="audio-feedback" role="status">يبدأ الصوت بعد تفاعلك الأول</span></section><div class="top-meta"><button class="navigation-mode" data-action="navigation" aria-pressed="true">↔ وضع التدوير ٣٦٠°</button><button class="icon-btn" data-action="settings" title="الإعدادات" aria-label="الإعدادات">⚙</button></div></header>
        <main id="welcome">
          <div class="welcome-copy"><div class="eyebrow"><i></i> تراثٌ تلمسه. حكايةٌ تعيشها.</div><h1>لمسة <span>عُمان</span><em>من أثر اليد،<br>تُولد الحكاية.</em></h1><p class="lead">رحلة تفاعلية في عبق التراث العُماني</p><p class="intro">افتح أبواب الماضي بيديك. أبحر، شكّل الطين، وتذوّق معنى الضيافة في رحلة تحتفي بروح عُمان.</p><div class="welcome-actions"><button class="primary" data-action="start">ابدأ الرحلة <span>←</span></button><button class="text-btn" data-action="help">طريقة اللعب <span>↗</span></button></div><button class="xr-entry" data-action="xr" disabled>◈ <span id="xr-label">جارٍ فحص دعم الواقع المختلط…</span></button><div class="status-row"><span><i id="xr-dot"></i><span id="xr-status">فحص المتصفح</span></span><span>◌ <span id="hand-status">الفأرة واللمس متاحان</span></span><span id="audio-status">♫ الصوت اختياري</span></div></div>
          <div class="exhibit-caption"><span class="tiny-label">01 / THE BEGINNING</span><h2>كل حكاية تبدأ من باب</h2><span>بوابة عُمانية محفورة · نموذج تفاعلي ثلاثي الأبعاد</span></div>
          <div class="welcome-footer"><span>٧ محطات <b>·</b> ٥ لمسات <b>·</b> حكاية واحدة</span><span class="desktop-tip">حرّك بالزر الأيمن لاستكشاف المجسم ↔</span><span>الواقع الافتراضي والمختلط <small>QUEST 3 / 3S</small></span></div>
        </main>
        <section id="experience" hidden>
          <div class="chapter-panel"><span id="chapter-tag" class="eyebrow"></span><h1 id="chapter-title"></h1><span id="chapter-en" class="tiny-label"></span><p id="chapter-detail"></p><div class="instruction"><span class="instruction-icon">☝</span><p id="instruction" role="status" aria-live="polite"></p></div><div class="progress-track"><div id="activity-progress"></div></div><div class="progress-caption"><span id="stage-label"></span><span id="activity-percent">0%</span></div><div id="ingredients"></div><div id="shape-controls" hidden><label>ارتفاع الفخار <input id="shape-height" type="range" min="0.12" max="0.36" step="0.005" value="0.14"></label><label>قطر الفخار <input id="shape-width" type="range" min="0.11" max="0.30" step="0.002" value="0.27"></label></div><details id="assist"><summary>أدوات المساعدة والتحكم</summary><p id="assist-help"></p><div id="assist-actions"></div><label id="tilt-label" hidden>إمالة الدلة <input id="coffee-tilt" type="range" min="0" max="90" value="0"></label></details></div>
          <div class="collection"><span>لمسات التراث</span><div id="symbols">${['♧', '△', '♜', '✺', '♧'].map((s, i) => `<span class="symbol" data-symbol="${i}">${s}</span>`).join('')}</div><strong id="count">0 / 5</strong></div>
          <div class="bottom-hud"><p id="subtitle"></p><div class="toolbar"><button data-action="recenter">⌖ إعادة التمركز</button><button data-action="pause" id="pause-btn">Ⅱ إيقاف مؤقت</button><button data-action="restart">↻ إعادة المحطة</button><button data-action="exit">خروج ↗</button></div></div>
          <div id="paused" hidden><div><span>Ⅱ</span><h2>لحظة تأمل</h2><p>رحلتك محفوظة هنا.</p><button class="primary" data-action="pause">متابعة الرحلة</button></div></div>
        </section>
        <div id="vr-entry" aria-label="الدخول إلى الواقع الافتراضي"></div>
        <dialog id="modal"><button class="close" data-action="close" aria-label="إغلاق">×</button><div id="modal-content"></div></dialog>
        <div id="toast" role="status"></div><pre id="debug" hidden></pre>
      </div>`;
    this.root = document.querySelector('#overlay');
    document.querySelector('#assist').insertAdjacentHTML(
      'beforebegin',
      `
      <section id="engraving-controls" hidden aria-label="قوالب نقش الباب"><small>اختر قالباً ثم تتبّع المسار بإصبعك أو المؤشر</small><div class="challenge-actions">${[
        ['star', '☆ نجمة'],
        ['square', '□ مربع'],
        ['random', '◇ شكل عشوائي'],
      ]
        .map(
          ([id, label]) =>
            `<button data-action="shape-slot-${id}" aria-pressed="false">${label}</button>`,
        )
        .join('')}</div></section>
      <section id="coffee-meter" hidden aria-label="تحدّي الفنجان المثالي">
        <div class="fill-caption"><strong>مستوى الفنجان</strong><output id="fill-value">0%</output></div>
        <div id="fill-track" role="progressbar" aria-label="مستوى القهوة" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="fill-level"></span><span id="perfect-zone"></span></div>
        <small>النطاق المثالي: ٦٠٪ إلى ٨٠٪</small>
        <div class="challenge-actions"><button data-action="hold-cup">✋ حمل الفنجان</button><button data-action="pour-coffee">☕ ابدأ السكب</button><button data-action="stop-pour">■ أوقف السكب</button></div>
        <span id="pour-result" role="status"></span>
      </section>
`,
    );
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) {
        e.preventDefault();
        this.action(b.dataset.action);
      }
    });
    this.root.addEventListener('input', (e) => {
      if (e.target.id.startsWith('shape-'))
        this.onAction('shape', {
          height: +document.querySelector('#shape-height').value,
          width: +document.querySelector('#shape-width').value,
        });
      if (e.target.id === 'coffee-tilt')
        this.onAction('tilt', (+e.target.value * Math.PI) / 180);
      if (e.target.id === 'volume') this.onAction('volume', +e.target.value);
    });
    this.root.addEventListener('change', (e) => {
      if (e.target.id === 'reduce-motion')
        this.onAction('motion', e.target.checked);
      if (e.target.id === 'seated') this.onAction('seated', e.target.checked);
      if (e.target.id === 'subtitles') {
        this.subtitle = e.target.checked;
        this.onAction('subtitles', this.subtitle);
      }
      if (e.target.id === 'quality') this.onAction('quality', e.target.value);
    });
    // Press-and-hold assists produce the same time/position samples as physical input.
    this.root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-hold]');
      if (b) {
        b.setPointerCapture(e.pointerId);
        this.onAction('assist-start', b.dataset.hold);
      }
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.root.addEventListener(type, () => this.onAction('assist-end'));
    this.root.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-hold]');
      if (b && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        this.onAction('assist-start', b.dataset.hold);
      }
    });
    this.root.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') this.onAction('assist-end');
    });
  }
  action(name) {
    if (name === 'close') {
      document.querySelector('#modal').close();
      return;
    }
    if (name === 'settings' || name === 'help') {
      document.querySelector('#modal-content').innerHTML =
        name === 'help'
          ? `<span class="eyebrow">بيديك، تحيا الحكاية</span><h2>طريقة اللعب</h2><p>في الواقع المختلط، قرّب السبابة للمس المسار، واجمع الإبهام والسبابة للإمساك. حرّك القطعة ثم افتح أصابعك لوضعها.</p><p>على الشاشة: اسحب على المجسمات. تتبّع نقاط الباب بالترتيب، ضع اللبان في المبخرة، اسحب الحبل للأسفل، وشكّل الفخار. حرّك العصا في دوائر، ولوّح أمام النار، ثم اسكب القهوة.</p><p>اختر وضع التدوير ٣٦٠° للسحب بالفأرة أو بإصبع واحد حول المجسم، ووضع التفاعل للإمساك به. الزر الأيمن أو إصبعان يديران المشهد أيضاً. في محطة القهوة، اضغط ابدأ السكب ثم أوقفه داخل النطاق الأخضر. المسافة توقف الرحلة، وR يعيد التمركز.</p><p>ابقَ في مساحة مريحة. لا تحتاج التجربة إلى المشي. يمكن إعادة تمركز المعرض في أي وقت.</p>`
          : `<span class="eyebrow">اجعل الرحلة على راحتك</span><h2>الإعدادات</h2><label>مستوى الصوت <input id="volume" type="range" min="0" max="1" step=".05" value="${this.volume ?? 0.5}"></label><label><input type="checkbox" id="reduce-motion" ${this.reduced ? 'checked' : ''}> تقليل الحركة والمؤثرات</label><label><input type="checkbox" id="subtitles" ${this.subtitle ? 'checked' : ''}> عرض النص السردي</label><label><input type="checkbox" id="seated" ${this.seated ? 'checked' : ''}> وضع الجلوس</label><label>جودة العرض <select id="quality"><option value="auto">تلقائية</option><option value="low">اقتصادية</option><option value="high">عالية</option></select></label><p class="muted">تحكّم بأصوات التفاعل من الزر العلوي. التعليمات مكتوبة داخل المشهد والقائمة.</p>`;
      document.querySelector('#modal').showModal();
      return;
    }
    this.onAction(name);
  }
  compatibility(s) {
    document.querySelector('[data-action="xr"]').disabled = !s.supported;
    document.querySelector('#xr-label').textContent = s.supported
      ? 'الدخول إلى الواقع المختلط'
      : 'الواقع المختلط غير متاح — جرّب على Quest';
    document.querySelector('#xr-status').textContent = s.supported
      ? 'الواقع المختلط جاهز'
      : 'وضع سطح المكتب';
    document.querySelector('#xr-dot').classList.toggle('on', s.supported);
  }
  audioState(status) {
    const button = document.querySelector('[data-action="effects"]');
    button.textContent = status.effectsMuted
      ? '◖ تشغيل المؤثرات'
      : '◖ كتم المؤثرات';
    button.setAttribute('aria-pressed', String(status.effectsMuted));
    document.querySelector('#audio-feedback').textContent = !status.unlocked
      ? 'أصوات التفاعل تبدأ بعد أول لمسة'
      : status.audioError
        ? status.audioError
        : !status.effectsAvailable
          ? 'الصوت غير متاح في هذا المتصفح'
          : status.effectsMuted
            ? 'المؤثرات مكتومة'
            : 'الصوت عند التفاعل فقط';
    document.querySelector('#audio-status').textContent = status.effectsEnabled
      ? '◖ المؤثرات مفعّلة'
      : '◖ تحكم بأصوات التفاعل';
  }
  navigation(mode) {
    const button = document.querySelector('[data-action="navigation"]');
    button.setAttribute('aria-pressed', String(mode === 'orbit'));
    button.textContent =
      mode === 'orbit' ? '↔ وضع التدوير ٣٦٠°' : '☝ وضع التفاعل';
    button.title =
      mode === 'orbit'
        ? 'اسحب بالفأرة أو بإصبع واحد للدوران. اضغط للعودة إلى التفاعل.'
        : 'اسحب المجسمات للتفاعل. اضغط لتدوير المشهد بإصبع واحد.';
  }
  toast(message) {
    const t = document.querySelector('#toast');
    t.textContent = message;
    t.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('visible'), 3500);
  }
  render(s) {
    const active = !!CHAPTERS[s.state];
    document.body.classList.toggle('playing', active);
    document.querySelector('#welcome').hidden = active;
    document.querySelector('#experience').hidden = !active;
    if (!active) return;
    const c = CHAPTERS[s.state],
      ch = s.chapter || {},
      progress =
        s.state === 'COFFEE' ? (ch.fillLevel ?? 0) : (ch.progress ?? 0);
    if (this.previous !== s.state) {
      this.previous = s.state;
      document.querySelector('#chapter-tag').textContent = c.tag;
      const title = document.querySelector('#chapter-title');
      title.textContent = c.title.replace('🇴🇲', '');
      if (s.state === 'FINALE') {
        const flag = document.createElement('img');
        flag.src =
          import.meta.env.BASE_URL + 'assets/textures/oman-flag-official.jpg';
        flag.alt = 'علم سلطنة عُمان';
        flag.width = 38;
        flag.style.marginInlineStart = '10px';
        title.append(flag);
      }
      document.querySelector('#chapter-en').textContent = c.english;
      document.querySelector('#chapter-detail').textContent = c.detail;
      this.assistStage = '';
      document.querySelector('.chapter-panel').scrollTop = 0;
      document.querySelector('#assist').open = false;
    }
    document.querySelector('#instruction').textContent =
      ch.instruction || s.instruction || '';
    document.querySelector('#activity-progress').style.width =
      `${Math.round(progress * 100)}%`;
    document.querySelector('#activity-percent').textContent =
      `${Math.round(progress * 100)}%`;
    document.querySelector('#stage-label').textContent = ch.completed
      ? 'اكتملت اللمسة ✦'
      : s.state === 'FINALE' && ch.countdown
        ? `إعادة الرحلة خلال ${Math.ceil(ch.countdown)}`
        : 'تفاعل مع المجسم';
    document.querySelector('#coffee-meter').hidden = s.state !== 'COFFEE';
    document.querySelector('#engraving-controls').hidden = s.state !== 'GATE';
    for (const button of document.querySelectorAll(
      '#engraving-controls button',
    )) {
      const id = button.dataset.action.slice(11);
      button.setAttribute('aria-pressed', String(ch.selectedShape === id));
      button.disabled =
        s.paused || !!ch.finishedShapes?.includes(id) || !!ch.completed;
    }
    if (s.state === 'COFFEE') {
      const fill = Math.round((ch.fillLevel ?? 0) * 100);
      document.querySelector('#fill-value').textContent = fill + '%';
      document.querySelector('#fill-level').style.width = fill + '%';
      document
        .querySelector('#fill-track')
        .setAttribute('aria-valuenow', String(fill));
      document.querySelector('#perfect-zone').style.left =
        ch.perfectMin * 100 + '%';
      document.querySelector('#perfect-zone').style.width =
        (ch.perfectMax - ch.perfectMin) * 100 + '%';
      document.querySelector('#pour-result').textContent =
        ch.lastResult === 'perfect'
          ? '✓ صبّة مثالية'
          : ch.stage === 'RESETTING'
            ? 'أعد المحاولة · يُفرّغ الفنجان…'
            : `المحاولات: ${ch.attempts ?? 0}`;
      const cupButton = document.querySelector('[data-action="hold-cup"]');
      cupButton.textContent = ch.cupHeld
        ? '✋ وضع الفنجان'
        : '✋ حمل الفنجان أولاً';
      cupButton.setAttribute('aria-pressed', String(!!ch.cupHeld));
    }
    const count = s.progress?.count ?? 0;
    document.querySelector('#count').textContent = `${count} / 5`;
    document
      .querySelectorAll('[data-symbol]')
      .forEach((el, i) => el.classList.toggle('earned', i < count));
    document.querySelector('#subtitle').textContent = this.subtitle
      ? NARRATION[s.state]
      : '';
    document.querySelector('#paused').hidden = !s.paused;
    document.querySelector('#pause-btn').textContent = s.paused
      ? '▷ متابعة'
      : 'Ⅱ إيقاف مؤقت';
    document.querySelector('#shape-controls').hidden = !(
      s.state === 'POTTERY' && ch.stage === 'SHAPE'
    );
    document.querySelector('#ingredients').innerHTML =
      s.state === 'HALWA'
        ? ['sugar', 'saffron', 'nuts']
            .map(
              (id, i) =>
                `<span class="ingredient ${(ch.ingredients || []).includes(id) ? 'added' : ''}">${(ch.ingredients || []).includes(id) ? '✓' : '○'} ${['السكر', 'الزعفران', 'المكسرات'][i]}</span>`,
            )
            .join('')
        : '';
    const key = s.state + ch.stage;
    if (this.assistStage !== key) {
      this.assistStage = key;
      this.renderAssist(s);
    }
    for (const action of [
      'pour-coffee',
      'stop-pour',
      'hold-cup',
      'light-coal',
    ]) {
      const button = document.querySelector(
        `#experience [data-action="${action}"]`,
      );
      if (button)
        button.disabled =
          !!ch.completed ||
          s.paused ||
          ch.stage === 'RESETTING' ||
          (action === 'pour-coffee' && !ch.cupHeld);
    }
  }
  renderAssist(s) {
    const stage = s.chapter?.stage;
    let html = '',
      help = 'تُطبّق هذه الأدوات نفس شروط الحركة والتوقيت.';
    const hold = (id, label) => `<button data-hold="${id}">${label}</button>`;
    const btn = (id, label) => `<button data-action="${id}">${label}</button>`;
    if (s.state === 'GATE') {
      html =
        stage === 'ENGRAVE'
          ? hold('trace', 'اضغط باستمرار لتتبّع القالب المحدد')
          : '';
      help =
        'اختر أحد الصناديق الثلاثة، ثم اضغط واسحب على المسار المضيء مباشرة. في VR وجّه المؤشر واضغط الزناد، أو اضمم إصبعيك وتتبع الشكل. أكمل الأشكال الثلاثة لفتح الباب.';
    }
    if (s.state === 'FRANKINCENSE' && stage === 'LIGHT_COAL')
      html = btn('light-coal', '✦ أشعل الفحم');
    if (s.state === 'FRANKINCENSE' && stage === 'SCRAPE_TREE')
      html = hold('scrape-tree', 'أمسك أداة الكشط واكشط اللحاء');
    if (s.state === 'FRANKINCENSE' && stage === 'PLACE_RESIN')
      html =
        btn('assist-resin', 'التقاط اللبان') +
        hold('resin', 'اضغط لتحريكه نحو المبخرة') +
        btn('release', 'وضع القطعة');
    if (s.state === 'DHOW') html = hold('pull', 'اضغط مطولاً لسحب الحبل');
    if (s.state === 'POTTERY' && stage === 'PLACE_CLAY')
      html =
        btn('assist-clay', 'التقاط الطين') +
        hold('clay', 'تحريك الطين إلى العجلة') +
        btn('release', 'وضع الطين');
    if (s.state === 'POTTERY' && stage === 'SHAPE')
      help =
        'الهدف: ارتفاع ٣٠ سم وقطر ٢٠ سم. طابق الشكل الذهبي، ثم زيّن الأشرطة الثلاثة.';
    if (s.state === 'POTTERY' && stage === 'DECORATE') {
      html = [0, 1, 2]
        .map((id) =>
          btn(
            'decorate-' + id,
            ['زخرفة أسفل الإناء', 'زخرفة وسط الإناء', 'زخرفة عنق الإناء'][id],
          ),
        )
        .join('');
      help = 'المس الأشرطة الثلاثة على الفخار لتزيينها، أو استخدم الأزرار.';
    }
    if (s.state === 'HALWA' && stage?.startsWith('ADD')) {
      const id =
        stage === 'ADD_SUGAR'
          ? 'sugar'
          : stage === 'ADD_SAFFRON'
            ? 'saffron'
            : 'nuts';
      html =
        btn('assist-' + id, 'التقاط المكوّن') +
        hold(id, 'تحريكه نحو القدر') +
        btn('release', 'إضافة المكوّن');
    }
    if (s.state === 'HALWA' && stage === 'STIR')
      html = hold('stir', 'اضغط مطولاً للتحريك الدائري');
    if (s.state === 'HALWA' && stage === 'FAN_FIRE')
      html = hold('fan', 'أمسك المهفّة ولوّح أمام النار');
    if (s.state === 'COFFEE')
      html =
        btn('assist-coffee', 'إمساك الدلة يدوياً') +
        hold('coffee', 'تحريك الفوهة فوق الفنجان') +
        btn('release', 'إفلات الدلة');
    if (s.state === 'FINALE') html = btn('lantern', 'المس الفانوس');
    if (s.state === 'COFFEE')
      help =
        'احمل الفنجان أولاً. في VR أمسكه بيد والدلّة بالأخرى وأمل معصمك. أوقف السكب بين ٦٠ و٨٠٪.';
    document.querySelector('#assist-help').textContent = help;
    document.querySelector('#assist-actions').innerHTML = html;
    document.querySelector('#tilt-label').hidden = s.state !== 'COFFEE';
  }
}
```

## src/ui/styles.css

```css
@font-face {
  font-family: Lamsat;
  src: url('/assets/fonts/Tajawal-Regular.ttf') format('truetype');
  font-display: swap;
}
:root {
  font-family: Lamsat, 'Segoe UI', Tahoma, sans-serif;
  color: #f5eddb;
  background: #101c1f;
  font-synthesis: none;
  --gold: #d7b475;
  --teal: #64c6b7;
  --muted: #a6b3b0;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  overflow: hidden;
}
button,
input,
select {
  font: inherit;
}
button,
a {
  -webkit-tap-highlight-color: transparent;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
  opacity: 0.5;
}
button:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 5px;
}
button {
  color: inherit;
}
#app {
  min-height: 100dvh;
  background:
    radial-gradient(ellipse at 25% 50%, #1d3434 0, transparent 55%), #101c1f;
}
#viewport {
  position: absolute;
  inset: 75px 40% 65px 0;
  direction: ltr;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
#overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
#overlay button,
#overlay a,
#overlay input,
#overlay select,
#overlay summary,
#overlay dialog {
  pointer-events: auto;
}
.topbar {
  height: 92px;
  margin: 0 5%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #d7b47524;
  position: relative;
  z-index: 5;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--gold);
  text-decoration: none;
  font-size: 23px;
  font-weight: 600;
}
.brand-mark {
  font-size: 40px;
  line-height: 1;
  border: 1px solid #c6a96b77;
  padding: 3px 10px;
  border-radius: 30px 30px 0 0;
}
.brand small {
  display: block;
  font:
    9px/1.8 Arial,
    sans-serif;
  letter-spacing: 3px;
  color: #c3d3cd;
}
.top-meta {
  display: flex;
  align-items: center;
  gap: 15px;
}
.edition {
  font-size: 11px;
  color: var(--muted);
}
.edition b {
  color: #b5985b;
  margin: 0 13px;
}
.icon-btn {
  border: 1px solid #c7c6a523;
  background: transparent;
  border-radius: 50%;
  width: 37px;
  height: 37px;
  font-size: 18px;
}
.icon-btn:hover {
  border-color: var(--gold);
}
.welcome-copy {
  position: absolute;
  right: 8%;
  top: 20%;
  width: 34%;
  max-width: 500px;
}
.eyebrow {
  color: var(--gold);
  font-size: 12px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.eyebrow i {
  width: 20px;
  height: 1px;
  background: var(--gold);
}
h1 {
  font-weight: 500;
  margin: 25px 0 15px;
  line-height: 1.1;
  font-size: 72px;
}
h1 span {
  color: var(--gold);
}
h1 em {
  display: block;
  font-size: 27px;
  line-height: 1.7;
  font-style: normal;
  font-weight: 300;
  color: #e8e8d9;
  margin-top: 24px;
}
.lead {
  font-size: 16px;
  margin: 16px 0;
  color: #e4d3b4;
}
.intro {
  font-size: 14px;
  color: var(--muted);
  line-height: 2.1;
  max-width: 390px;
}
.welcome-actions {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-top: 25px;
}
.primary {
  background: var(--gold);
  color: #19262a;
  border: 1px solid #e3c996;
  padding: 13px 25px;
  border-radius: 3px;
  font-weight: 600;
  box-shadow: 0 4px 20px #0002;
  min-width: 165px;
}
.primary span {
  margin-right: 25px;
  font-family: Arial;
}
.primary:hover {
  background: #ecd2a0;
  transform: translateY(-1px);
}
.text-btn {
  background: none;
  border: none;
  font-size: 12px;
}
.text-btn span {
  margin-right: 10px;
  color: var(--gold);
}
.xr-entry {
  margin-top: 19px;
  border: 0;
  background: transparent;
  font-size: 11px;
  padding: 3px 0;
  color: var(--teal);
}
.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 13px;
  margin-top: 20px;
  font-size: 9px;
  color: #7f9694;
}
.status-row > span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.status-row i {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c7aa7b;
}
.status-row .on {
  background: var(--teal);
}
.exhibit-caption {
  position: absolute;
  bottom: 13%;
  left: 9%;
  width: 36%;
  text-align: center;
  pointer-events: none;
}
.tiny-label {
  font:
    9px/1.5 Arial,
    sans-serif;
  letter-spacing: 2.5px;
  color: var(--gold);
}
.exhibit-caption h2 {
  font-size: 17px;
  font-weight: 400;
  margin: 10px 0;
}
.exhibit-caption > span:last-child {
  font-size: 10px;
  color: #8ea09a;
}
.welcome-footer {
  position: absolute;
  bottom: 0;
  left: 5%;
  right: 5%;
  height: 75px;
  border-top: 1px solid #c2a36e25;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #a3b0a9;
}
.welcome-footer b {
  padding: 0 13px;
  color: #aa8d5d;
}
.welcome-footer small {
  display: block;
  font: 8px Arial;
  letter-spacing: 2px;
  margin-top: 5px;
}
.desktop-tip {
  font-size: 9px;
  color: #657d7a;
}
.playing #viewport {
  inset: 92px 22% 105px 0;
}
.chapter-panel {
  position: absolute;
  right: 4%;
  top: 145px;
  width: 23%;
  max-width: 320px;
  pointer-events: none;
}
.chapter-panel h1 {
  font-size: 35px;
  line-height: 1.5;
  margin: 10px 0 4px;
}
.chapter-panel > p {
  font-size: 13px;
  line-height: 1.9;
  color: var(--muted);
  margin: 23px 0;
}
.instruction {
  background: linear-gradient(110deg, #263b3ba6, #142a2cce);
  padding: 15px;
  border: 1px solid #d7b47544;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  align-items: start;
  box-shadow: 0 8px 30px #0002;
}
.instruction-icon {
  color: var(--gold);
  font-size: 22px;
}
.instruction p {
  font-size: 13px;
  line-height: 1.9;
  margin: 0;
  color: #f5e6cc;
}
.progress-track {
  height: 3px;
  background: #344744;
  margin-top: 23px;
  overflow: hidden;
}
#activity-progress {
  height: 100%;
  background: var(--gold);
  transition: width 0.2s;
}
.progress-caption {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #a8b9af;
  margin-top: 9px;
}
.collection {
  position: absolute;
  top: 115px;
  left: 5%;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 11px;
  color: #adbcb5;
}
.collection strong {
  font: 12px Arial;
  color: var(--gold);
}
#symbols {
  display: flex;
  gap: 8px;
  direction: ltr;
}
.symbol {
  border: 1px solid #6e81774a;
  width: 30px;
  height: 35px;
  display: grid;
  place-items: center;
  border-radius: 15px 15px 5px 5px;
  font-size: 18px;
  color: #667d75;
  transition: all 0.5s;
}
.symbol.earned {
  color: #e8c484;
  border-color: #c5a160;
  background: #9f782c26;
  box-shadow: 0 0 15px #d7b47525;
}
.bottom-hud {
  position: absolute;
  bottom: 17px;
  left: 5%;
  right: 5%;
  text-align: center;
}
#subtitle {
  font-size: 12px;
  line-height: 1.9;
  color: #c9d1c1;
  max-width: 800px;
  margin: 0 auto 15px;
  background: #122426b5;
  border-radius: 4px;
  padding: 5px 18px;
}
.toolbar {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.toolbar button,
#assist button {
  font-size: 11px;
  padding: 8px 13px;
  background: #162e30;
  border: 1px solid #6b7e694d;
  border-radius: 4px;
}
.toolbar button:hover,
#assist button:hover {
  border-color: var(--gold);
}
#assist {
  margin-top: 22px;
  font-size: 11px;
  line-height: 1.8;
}
#assist summary {
  cursor: pointer;
  color: var(--teal);
}
#assist p {
  color: #8aa19a;
  margin: 8px 0;
}
#assist-actions {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
#assist button {
  padding: 7px 10px;
}
#shape-controls label,
#tilt-label {
  font-size: 11px;
  display: block;
  margin-top: 15px;
  color: #c5d3c9;
}
input[type='range'] {
  display: block;
  width: 100%;
  accent-color: var(--gold);
  margin-top: 10px;
}
input[type='checkbox'] {
  accent-color: var(--gold);
  margin-left: 12px;
}
.ingredient {
  display: inline-block;
  font-size: 10px;
  margin: 12px 0 0 12px;
  color: #8b9e98;
}
.ingredient.added {
  color: var(--teal);
}
#paused {
  position: absolute;
  inset: 92px 0 0;
  background: #091a1bd9;
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  pointer-events: auto;
  text-align: center;
}
#paused[hidden] {
  display: none;
}
#paused span {
  font-size: 45px;
  color: var(--gold);
}
#paused h2 {
  font-weight: 400;
  font-size: 34px;
}
#paused p {
  color: var(--muted);
}
dialog {
  width: min(520px, 90vw);
  background: #172c2e;
  border: 1px solid #d7b47570;
  border-radius: 9px;
  color: #ede4d3;
  padding: 40px;
  box-shadow: 0 20px 90px #0008;
}
dialog::backdrop {
  background: #071618c9;
  backdrop-filter: blur(8px);
}
dialog h2 {
  font-size: 30px;
  font-weight: 400;
  margin-top: 15px;
}
dialog p {
  line-height: 2;
  font-size: 13px;
  color: #b1c2b8;
}
dialog label {
  display: block;
  margin: 20px 0;
  font-size: 14px;
}
dialog select {
  background: #243e3e;
  color: white;
  border: 1px solid #8e9c73;
  padding: 7px;
  display: block;
  margin-top: 8px;
}
.close {
  position: absolute;
  left: 14px;
  top: 9px;
  font-size: 25px;
  background: none;
  border: none;
}
.muted {
  opacity: 0.65;
}
#toast {
  position: absolute;
  bottom: 110px;
  left: 50%;
  transform: translate(-50%, 15px);
  background: #233e3d;
  border: 1px solid #d7b47555;
  padding: 12px 24px;
  border-radius: 6px;
  color: #f7e5bf;
  font-size: 13px;
  opacity: 0;
  transition: 0.25s;
  z-index: 20;
  max-width: 90%;
  text-align: center;
}
#toast.visible {
  opacity: 1;
  transform: translate(-50%, 0);
}
#debug {
  position: absolute;
  left: 10px;
  top: 165px;
  direction: ltr;
  text-align: left;
  font: 11px/1.5 monospace;
  background: #000a;
  padding: 10px;
  color: #a2ecc8;
  pointer-events: none;
}
body.xr {
  background: transparent;
}
body.xr #app {
  background: transparent;
}
body.xr .topbar {
  display: none;
}
body.xr #viewport {
  inset: 0;
}
body.xr .chapter-panel {
  top: 15px;
  right: 15px;
  width: 260px;
  background: #102525cb;
  padding: 15px;
  border-radius: 8px;
}
body.xr .collection {
  top: 15px;
  left: 15px;
  background: #102525cb;
  padding: 12px;
}
body.xr #subtitle {
  background: #102525cb;
}
body.xr .chapter-panel > p,
body.xr #assist {
  display: none;
}
[hidden] {
  display: none !important;
}
@media (min-height: 850px) {
  .welcome-copy {
    top: 23%;
  }
  h1 {
    font-size: 90px;
  }
}
@media (max-height: 750px) and (min-width: 800px) {
  .welcome-copy {
    top: 18%;
  }
  h1 {
    font-size: 54px;
    margin-top: 16px;
  }
  h1 em {
    font-size: 23px;
    margin-top: 14px;
  }
  .intro {
    font-size: 12px;
  }
  .welcome-actions {
    margin-top: 16px;
  }
  .status-row {
    margin-top: 10px;
  }
  .chapter-panel {
    top: 120px;
  }
  .chapter-panel > p {
    margin: 15px 0;
  }
  .exhibit-caption {
    bottom: 15%;
  }
}
@media (max-width: 800px) {
  .topbar {
    height: 75px;
    margin: 0 5%;
  }
  .edition {
    display: none;
  }
  .brand {
    font-size: 18px;
  }
  .brand-mark {
    font-size: 29px;
  }
  .welcome-copy {
    top: 105px;
    right: 7%;
    width: 86%;
    text-align: right;
    pointer-events: none;
  }
  .welcome-copy h1 {
    font-size: 49px;
    margin: 15px 0;
  }
  .welcome-copy h1 em {
    font-size: 20px;
    line-height: 1.5;
    margin-top: 10px;
  }
  .lead {
    font-size: 13px;
  }
  .intro {
    display: none;
  }
  .welcome-actions {
    margin-top: 20px;
  }
  .primary {
    padding: 12px 20px;
  }
  .status-row {
    margin-top: 12px;
  }
  .xr-entry {
    margin-top: 12px;
  }
  #viewport {
    inset: 40% 0 95px 0;
  }
  .exhibit-caption {
    display: none;
  }
  .welcome-footer {
    height: 65px;
    font-size: 9px;
  }
  .desktop-tip {
    display: none;
  }
  .playing #viewport {
    inset: 230px 0 120px 0;
  }
  .chapter-panel {
    right: 5%;
    top: 95px;
    width: 90%;
    max-width: none;
  }
  .chapter-panel h1 {
    font-size: 26px;
    margin: 8px 0 0;
  }
  .chapter-panel > .tiny-label,
  .chapter-panel > p {
    display: none;
  }
  .instruction {
    position: absolute;
    right: 40%;
    top: 4px;
    width: 60%;
    padding: 10px;
  }
  .instruction p {
    font-size: 11px;
  }
  .instruction-icon {
    display: none;
  }
  .progress-track {
    margin-top: 16px;
  }
  .progress-caption {
    margin-top: 5px;
  }
  .collection {
    top: auto;
    bottom: 105px;
    left: 5%;
    font-size: 10px;
  }
  .symbol {
    width: 24px;
    height: 27px;
    font-size: 14px;
  }
  .bottom-hud {
    bottom: 8px;
  }
  .toolbar {
    gap: 5px;
  }
  .toolbar button {
    font-size: 9px;
    padding: 8px;
  }
  #subtitle {
    font-size: 10px;
    line-height: 1.7;
    padding: 0;
    background: none;
  }
  .chapter-panel #assist {
    position: absolute;
    top: 95px;
    right: 0;
    width: 220px;
    background: #132829e8;
    padding: 7px;
    border-radius: 4px;
    z-index: 3;
  }
  .chapter-panel #shape-controls {
    position: absolute;
    top: 100px;
    left: 0;
    width: 180px;
    background: #132829e8;
    padding: 9px;
    z-index: 3;
  }
  #ingredients {
    position: absolute;
    top: 86px;
    left: 0;
  }
  .chapter-panel .eyebrow {
    font-size: 10px;
  }
  .brand small {
    font-size: 8px;
  }
  .collection > span {
    display: none;
  }
  body.xr .chapter-panel {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 220px;
  }
  body.xr .instruction {
    position: static;
    width: 100%;
    margin-top: 10px;
  }
  body.xr .collection {
    top: 5px;
    bottom: auto;
  }
  body.xr #shape-controls {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}

#count {
  direction: ltr;
  unicode-bidi: isolate;
}
.welcome-copy {
  pointer-events: none;
}
.welcome-copy button {
  pointer-events: auto;
}

/* Larger side menus and separate, always-visible audio controls. */
#engraving-controls {
  margin: 14px 0;
  padding: 10px;
  border: 1px solid #bda26566;
  border-radius: 6px;
}
#engraving-controls button[aria-pressed='true'] {
  background: #82602c;
  border-color: #f0ce8e;
}
#engraving-controls button:disabled {
  opacity: 0.55;
}
.topbar {
  gap: 20px;
  height: 112px;
}
.audio-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 10px;
  padding: 10px 14px;
  border: 1px solid #d7b47540;
  border-radius: 8px;
  background: #152b2dbf;
}
.audio-controls button,
.navigation-mode {
  min-height: 42px;
  border: 1px solid #718f7d60;
  border-radius: 5px;
  background: #1c3637;
  padding: 8px 13px;
  font-size: 14px;
}
.audio-controls button[aria-pressed='true'] {
  color: #9baaa1;
  background: #122628;
}
#audio-feedback {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #aebeb2;
}
.top-meta {
  gap: 10px;
}
#vr-entry {
  display: inline-flex;
  pointer-events: auto;
}
#vr-entry > button,
#vr-entry > a {
  position: static !important;
  left: auto !important;
  bottom: auto !important;
  transform: none !important;
  width: auto !important;
  min-width: 145px !important;
  min-height: 44px !important;
  margin: 0 !important;
  padding: 10px 15px !important;
  font:
    14px Lamsat,
    Tahoma,
    sans-serif !important;
  border: 1px solid #d7b475 !important;
  border-radius: 5px !important;
  color: #f5e6c8 !important;
  background: #1b3738 !important;
  opacity: 1 !important;
  text-align: center;
}
#vr-entry > button:disabled {
  opacity: 0.6 !important;
}
#viewport {
  top: 112px;
}
.playing #viewport {
  inset: 112px 29% 130px 0;
}
.chapter-panel {
  top: 156px;
  right: 3.5%;
  width: 25%;
  max-width: 380px;
  max-height: calc(100dvh - 320px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #8c805d #183331;
  pointer-events: auto;
  padding: 4px 6px 12px;
}
.chapter-panel h1 {
  font-size: 38px;
}
.chapter-panel > p {
  font-size: 16px;
}
.instruction p {
  font-size: 17px;
  line-height: 1.85;
}
.instruction {
  padding: 17px;
}
.progress-caption,
#assist,
#shape-controls label,
#tilt-label {
  font-size: 14px;
}
#assist button,
.toolbar button {
  font-size: 14px;
  min-height: 44px;
  padding: 10px 15px;
}
#assist {
  margin-top: 18px;
}
#assist summary {
  padding: 6px 0;
}
#subtitle {
  font-size: 15px;
  max-width: 960px;
}
.ingredient {
  font-size: 13px;
}
.collection {
  top: 132px;
  font-size: 14px;
}
.symbol {
  width: 34px;
  height: 38px;
}
.collection strong {
  font-size: 15px;
}
.icon-btn {
  min-width: 44px;
  min-height: 44px;
}
[data-speak] {
  cursor: help;
}
#overlay [data-speak] {
  pointer-events: auto;
}
#overlay [data-speak]:hover {
  text-decoration-color: #d7b475;
}
body.xr .chapter-panel {
  max-height: calc(100dvh - 160px);
  width: 300px;
}
body.xr #vr-entry {
  display: none;
}
@media (max-width: 1100px) and (min-width: 801px) {
  .topbar {
    gap: 10px;
    margin-inline: 3%;
  }
  .brand {
    font-size: 19px;
    gap: 8px;
  }
  .brand-mark {
    font-size: 29px;
  }
  .audio-controls {
    padding: 6px;
    gap: 5px;
  }
  .audio-controls button,
  .navigation-mode {
    font-size: 12px;
    padding: 8px;
  }
  #vr-entry > button {
    min-width: 125px !important;
    font-size: 12px !important;
  }
  .chapter-panel {
    width: 29%;
    right: 2%;
  }
  .playing #viewport {
    right: 33%;
  }
}
@media (max-width: 800px) {
  .topbar {
    height: 170px;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px;
    padding: 9px 0;
    align-content: start;
  }
  .brand {
    flex: 1 0 100%;
    justify-content: center;
    height: 40px;
  }
  .audio-controls {
    width: 100%;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    gap: 5px;
  }
  .audio-controls button {
    font-size: 13px;
    min-height: 38px;
    padding: 6px 8px;
  }
  #audio-feedback {
    display: none;
  }
  .top-meta {
    width: 100%;
    justify-content: space-between;
  }
  .navigation-mode {
    font-size: 12px;
    padding-inline: 8px;
  }
  #vr-entry > button {
    min-width: 128px !important;
    padding: 8px !important;
    font-size: 12px !important;
  }
  .welcome-copy {
    top: 190px;
  }
  .welcome-copy h1 {
    font-size: 46px;
    margin: 12px 0;
  }
  .welcome-copy h1 em {
    display: none;
  }
  .welcome-copy .eyebrow {
    font-size: 11px;
  }
  .welcome-copy .welcome-actions {
    margin-top: 16px;
  }
  .welcome-copy .status-row {
    font-size: 9px;
  }
  #viewport {
    inset: 430px 0 64px 0;
  }
  .playing #viewport {
    inset: 325px 0 145px 0;
  }
  .chapter-panel {
    top: 183px;
    right: 4%;
    width: 92%;
    max-width: none;
    max-height: none;
    overflow: visible;
    padding: 0;
    pointer-events: none;
  }
  .chapter-panel h1 {
    font-size: 27px;
  }
  .instruction {
    right: 38%;
    width: 62%;
    padding: 9px;
  }
  .instruction p {
    font-size: 13px;
    line-height: 1.65;
  }
  .progress-caption {
    font-size: 12px;
  }
  .chapter-panel #assist {
    top: 107px;
    width: 215px;
    padding: 7px;
    max-height: 225px;
    overflow-y: auto;
    pointer-events: auto;
  }
  .chapter-panel #assist summary {
    font-size: 13px;
  }
  #assist button {
    font-size: 12px;
    padding: 7px 9px;
  }
  #assist-help {
    font-size: 11px;
  }
  .chapter-panel #shape-controls {
    top: 102px;
    width: 155px;
  }
  #shape-controls label {
    font-size: 12px;
  }
  .collection {
    top: auto;
    bottom: 119px;
    font-size: 12px;
  }
  #subtitle {
    font-size: 12px;
    line-height: 1.6;
  }
  .toolbar {
    gap: 4px;
  }
  .toolbar button {
    font-size: 11px;
    padding: 7px 8px;
  }
  .symbol {
    width: 25px;
    height: 28px;
  }
  .collection strong {
    font-size: 13px;
  }
  #ingredients {
    top: 86px;
  }
  .ingredient {
    font-size: 11px;
  }
}
@media (max-height: 760px) and (max-width: 800px) {
  .welcome-copy {
    top: 180px;
  }
  .welcome-copy .lead {
    margin: 8px 0;
  }
  .welcome-copy .eyebrow,
  .welcome-copy .status-row {
    display: none;
  }
  #viewport {
    top: 350px;
  }
}

/* Keep a usable 3D viewport when a phone is held horizontally. */
@media (orientation: landscape) and (max-height: 500px) and (max-width: 950px) {
  .topbar {
    height: 78px;
    margin-inline: 3%;
    padding: 6px 0;
    gap: 7px;
    flex-wrap: nowrap;
    align-items: center;
  }
  .brand {
    flex: 0 0 auto;
    width: 40px;
  }
  .brand > span:not(.brand-mark) {
    display: none;
  }
  .brand-mark {
    font-size: 26px;
    padding-inline: 7px;
  }
  .audio-controls {
    width: 195px;
    flex-shrink: 0;
    padding: 4px;
  }
  .audio-controls button {
    font-size: 11px;
    padding: 5px;
    min-height: 36px;
  }
  #audio-feedback {
    display: none;
  }
  .top-meta {
    flex: 1;
    width: auto;
    gap: 6px;
    justify-content: flex-end;
  }
  .navigation-mode {
    font-size: 11px;
    min-height: 36px;
    padding-inline: 7px;
  }
  #vr-entry > button,
  #vr-entry > a {
    min-width: 105px !important;
    min-height: 36px !important;
    font-size: 11px !important;
    padding: 7px !important;
  }
  .icon-btn {
    min-width: 36px;
    min-height: 36px;
    width: 36px;
    height: 36px;
  }
  .welcome-copy {
    top: 91px;
    right: 3%;
    width: 42%;
  }
  .welcome-copy h1 {
    font-size: 38px;
    margin: 6px 0;
  }
  .welcome-copy h1 em,
  .welcome-copy .eyebrow,
  .welcome-copy .intro,
  .welcome-copy .status-row,
  .exhibit-caption {
    display: none;
  }
  .welcome-copy .lead {
    font-size: 12px;
    margin: 8px 0;
  }
  .welcome-actions {
    gap: 10px;
    margin-top: 10px !important;
  }
  .primary {
    min-width: 120px;
    padding: 10px 13px;
  }
  .primary span {
    margin-right: 12px;
  }
  .text-btn {
    font-size: 11px;
  }
  .xr-entry {
    margin-top: 9px;
  }
  #viewport {
    inset: 80px 45% 37px 0;
  }
  .welcome-footer {
    height: 33px;
    font-size: 8px;
  }
  .welcome-footer small {
    display: none;
  }
  .playing #viewport {
    inset: 96px 34% 65px 0;
  }
  .chapter-panel {
    top: 88px;
    right: 3%;
    width: 30%;
    max-height: calc(100dvh - 162px);
    overflow-y: auto;
    pointer-events: auto;
  }
  .chapter-panel h1 {
    font-size: 24px;
    line-height: 1.3;
  }
  .chapter-panel > p,
  .chapter-panel > .tiny-label {
    display: none;
  }
  .instruction {
    position: static;
    width: 100%;
    margin-top: 8px;
    padding: 7px;
  }
  .instruction p {
    font-size: 12px;
    line-height: 1.6;
  }
  .progress-track {
    margin-top: 8px;
  }
  .progress-caption {
    font-size: 10px;
  }
  .chapter-panel #assist,
  .chapter-panel #shape-controls {
    position: static;
    width: 100%;
    max-height: none;
    margin-top: 10px;
  }
  #ingredients {
    position: static;
  }
  .collection {
    top: 81px;
    bottom: auto;
    left: 3%;
    gap: 6px;
  }
  .collection > span {
    display: none;
  }
  .symbol {
    width: 23px;
    height: 25px;
    font-size: 13px;
  }
  .bottom-hud {
    bottom: 5px;
    left: 3%;
    right: 3%;
  }
  #subtitle {
    font-size: 10px;
    margin-bottom: 5px;
    line-height: 1.4;
  }
  .toolbar button {
    min-height: 32px;
    padding: 6px 10px;
    font-size: 11px;
  }
}

/* Independent music and on-demand text reading controls. */
.audio-controls {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.audio-controls button {
  white-space: nowrap;
  padding-inline: 9px;
}
#trivia-count {
  border: 1px solid #d7b47577;
  color: #e6c68d;
  background: #183331;
  border-radius: 6px;
  padding: 8px 11px;
  font-size: 13px;
}
#coffee-meter {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #87b19b55;
  border-radius: 6px;
  background: #132b2d;
}
.fill-caption {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 16px;
}
#fill-value {
  direction: ltr;
  font-weight: bold;
  color: #eac887;
}
#fill-track {
  height: 18px;
  margin: 9px 0;
  background: #0a1c1d;
  position: relative;
  direction: ltr;
  border-radius: 4px;
  overflow: hidden;
}
#fill-level {
  position: absolute;
  left: 0;
  height: 100%;
  background: #bc8644;
}
#perfect-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  border: 2px solid #7ae2a5;
  background: #46c77d33;
}
#coffee-meter small,
#pour-result {
  display: block;
  font-size: 13px;
  line-height: 1.6;
}
#pour-result {
  color: #e8ca91;
  margin-top: 4px;
}
.challenge-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.challenge-actions button {
  flex: 1;
  padding: 8px;
  min-height: 44px;
  border: 1px solid #b99c69;
  background: #24413e;
  color: #f7e8cd;
  border-radius: 5px;
  font-size: 14px;
}
.challenge-actions [data-action='stop-pour'] {
  border-color: #edbd7e;
  background: #614425;
  font-weight: bold;
}
#fact-card {
  position: absolute;
  inset: 0 0 auto;
  z-index: 7;
  background: #183331f5;
  border: 1px solid #bc9d63;
  padding: 20px;
  border-radius: 8px;
  pointer-events: auto;
  max-height: 100%;
  overflow-y: auto;
}
#fact-card h2 {
  font-size: 25px;
  margin: 14px 0;
  color: #e6c68d;
}
#fact-card p {
  font-size: 18px;
  line-height: 1.95;
}
#fact-card button {
  float: left;
  background: transparent;
  border: 1px solid #b79f6f77;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 25px;
}
.journal-fact {
  border-top: 1px solid #bdab7444;
  padding-top: 10px;
}
.journal-fact button {
  background: #24433f;
  border: 1px solid #c2a36e77;
  border-radius: 4px;
  padding: 9px 15px;
  color: #f1debc;
}
.journal-hidden {
  color: #9ab2a7;
}
@media (max-width: 800px) {
  .audio-controls button {
    font-size: 11px;
    padding-inline: 4px;
  }
  .collection {
    gap: 7px;
  }
  #trivia-count {
    padding: 6px;
    font-size: 11px;
  }
  #coffee-meter {
    position: absolute;
    top: 112px;
    left: 0;
    width: 35%;
    margin: 0;
    padding: 7px;
    pointer-events: auto;
  }
  #coffee-meter .fill-caption {
    font-size: 12px;
  }
  #coffee-meter small,
  #pour-result {
    font-size: 10px;
  }
  .challenge-actions {
    flex-direction: column;
    gap: 5px;
  }
  .challenge-actions button {
    font-size: 11px;
    min-height: 37px;
    padding: 6px;
  }
  #fact-card {
    max-height: 360px;
  }
  #fact-card p {
    font-size: 16px;
  }
}
@media (min-width: 801px) and (max-width: 1100px) {
  .audio-controls button {
    font-size: 11px;
    padding-inline: 5px;
  }
  .brand {
    font-size: 17px;
  }
}
@media (orientation: landscape) and (max-height: 500px) and (max-width: 950px) {
  .audio-controls {
    width: 195px;
  }
  .audio-controls button {
    font-size: 10px;
  }
  #coffee-meter {
    position: static;
    width: 100%;
    margin-top: 9px;
  }
  #trivia-count {
    font-size: 10px;
  }
}

/* Immersive modes use the world-fixed reading board, never duplicate head-locked menus. */
body.xr #overlay > * { display: none !important; }
```

## src/utils/AnimationUtils.js

```javascript
import { clamp } from './MathUtils.js';

export const easeInOutCubic = value => { const t = clamp(value); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };
export const damp = (current, target, speed, dt) => current + (target - current) * (1 - Math.exp(-speed * Math.max(0, dt)));
```

## src/utils/GeometryUtils.js

```javascript
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
export function material(color, metalness=0, roughness=.65, extra={}) { return new THREE.MeshStandardMaterial({color,metalness,roughness,...extra}); }
export function surfaceTexture(kind='wood') {
  const size=64, bytes=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const hash = Math.sin(x*127.1+y*311.7)*43758.5453;
    const noise=hash-Math.floor(hash);
    const stripe=kind==='wood' ? Math.sin(y*.75+Math.sin(x*.12)*1.8)*.10 : 0;
    const value=Math.max(0,Math.min(255,Math.round(220+noise*13+stripe*90)));
    const at=(y*size+x)*4; bytes[at]=bytes[at+1]=bytes[at+2]=value; bytes[at+3]=255;
  }
  const t=new THREE.DataTexture(bytes,size,size); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter; t.generateMipmaps=true; t.repeat.set(kind==='wood'?2:3,kind==='wood'?5:3); t.needsUpdate=true; t.colorSpace=THREE.SRGBColorSpace; return t;
}
export function palette() {
  const woodTexture=surfaceTexture('wood'), stoneTexture=surfaceTexture('stone');
  return {
    wood:material('#59301c',0,.64,{map:woodTexture}), woodLight:material('#97603a',0,.6,{map:woodTexture}),
    woodDark:material('#28170f',0,.72,{map:woodTexture}), gold:material('#e4b85e',.82,.27), goldDark:material('#9c6b29',.72,.38),
    clay:material('#b6663f',0,.9,{map:stoneTexture}), sand:material('#cfa478',0,.92,{map:stoneTexture}),
    ivory:material('#eee0bd',0,.9,{map:stoneTexture}), charcoal:material('#211c18',0,.95),
    turquoise:material('#52d9c9',.35,.28,{emissive:'#21b9ad',emissiveIntensity:1.3}),
    glow:material('#ffd994',.2,.45,{emissive:'#ff9b2f',emissiveIntensity:1.6}),
    dark:material('#19302d',.3,.6), copper:material('#bd6f36',.7,.32)
  };
}
export function mesh(parent,geometry,mat,position=[0,0,0],rotation=[0,0,0]) {
  const m=new THREE.Mesh(geometry,mat); m.position.set(...position); m.rotation.set(...rotation); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
export function box(parent,w,h,d,mat,position=[0,0,0],rotation=[0,0,0]) {return mesh(parent,new THREE.BoxGeometry(w,h,d),mat,position,rotation);}
export function cylinder(parent,rt,rb,h,mat,position=[0,0,0],segments=32,open=false) {return mesh(parent,new THREE.CylinderGeometry(rt,rb,h,segments,1,open),mat,position);}
export function sphere(parent,r,mat,position=[0,0,0],segments=12) {return mesh(parent,new THREE.SphereGeometry(r,segments,8),mat,position);}
export function ring(parent,r,t,mat,position=[0,0,0],rotation=[Math.PI/2,0,0]) {return mesh(parent,new THREE.TorusGeometry(r,t,6,40),mat,position,rotation);}
export function tube(parent,points,r,mat,closed=false,steps=32) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:V(...p)),closed,'centripetal');
  return mesh(parent,new THREE.TubeGeometry(curve,steps,r,5,closed),mat);
}
export function rod(parent,a,b,r,mat,segments=8) {
  const start=Array.isArray(a)?V(...a):a,end=Array.isArray(b)?V(...b):b,dir=end.clone().sub(start);
  const m=mesh(parent,new THREE.CylinderGeometry(r,r,dir.length(),segments),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),dir.normalize());return m;
}
export function lathe(parent,profile,mat,segments=40) {return mesh(parent,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments),mat);}
export function pointedShape(w,h) {
  const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h*.58);s.quadraticCurveTo(-w*.4,h*.82,0,h);s.quadraticCurveTo(w*.4,h*.82,w/2,h*.58);s.lineTo(w/2,0);s.closePath();return s;
}
export function arch(parent,w,h,depth,mat,position=[0,0,0]) {return mesh(parent,new THREE.ExtrudeGeometry(pointedShape(w,h),{depth,bevelEnabled:false,curveSegments:12}),mat,position);}
export function star(parent,x,y,z,r,mat,points=8) {
  const p=[];for(let i=0;i<=points*2;i++){const a=i*Math.PI/points,rad=i%2?r*.44:r;p.push([x+Math.sin(a)*rad,y+Math.cos(a)*rad,z]);} return tube(parent,p,.0018,mat,false,points*4);
}
export function rosette(parent,x,y,z,r,mat) {
  star(parent,x,y,z,r,mat);ring(parent,r*.42,.0015,mat,[x,y,z],[0,0,0]);
  for(let j=0;j<4;j++){const a=j*Math.PI/2; const p=[];for(let i=0;i<=12;i++){const t=i/12*Math.PI*2;const u=Math.sin(t)*r*.17,v=Math.cos(t)*r*.30+r*.35;p.push([x+u*Math.cos(a)-v*Math.sin(a),y+u*Math.sin(a)+v*Math.cos(a),z]);}tube(parent,p,.0012,mat,true,18);}
}
export function frame(parent,w,h,depth,thickness,mat,c=[0,0,0]) {
  box(parent,w,thickness,depth,mat,[c[0],c[1]-h/2,c[2]]);box(parent,w,thickness,depth,mat,[c[0],c[1]+h/2,c[2]]);
  box(parent,thickness,h,depth,mat,[c[0]-w/2,c[1],c[2]]);box(parent,thickness,h,depth,mat,[c[0]+w/2,c[1],c[2]]);
}
export function instance(parent,geometry,mat,transforms) {
  const m=new THREE.InstancedMesh(geometry,mat,transforms.length),o=new THREE.Object3D();
  transforms.forEach((t,i)=>{o.position.set(...(t.position||[0,0,0]));o.rotation.set(...(t.rotation||[0,0,0]));o.scale.set(...(t.scale||[1,1,1]));o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.instanceMatrix.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
// Merge only direct static mesh children; animated subgroups remain independently addressable.
export function batchStatic(group) {
  group.updateMatrixWorld(true);const byMaterial=new Map();
  for(const c of [...group.children]) if(c.isMesh&&!c.isInstancedMesh&&!c.userData.dynamic&& !Array.isArray(c.material)) {
    let list=byMaterial.get(c.material);if(!list)byMaterial.set(c.material,list=[]);list.push(c);
  }
  for(const [mat,list] of byMaterial){if(list.length<2)continue;const geometries=list.map(m=>{const g=m.geometry.clone().applyMatrix4(m.matrix);return g.index?g.toNonIndexed():g;});const joined=mergeGeometries(geometries,false);if(joined){const m=new THREE.Mesh(joined,mat);m.castShadow=m.receiveShadow=true;group.add(m);for(const old of list){group.remove(old);old.geometry.dispose();}}for(const g of geometries)g.dispose();}
  return group;
}
```

## src/utils/InteractionUtils.js

```javascript
import { isVector3 } from './MathUtils.js';

/** All bounds are chapter-local metres. The scene adapter performs world-to-local. */
export function insideCylinder(point, zone) {
  return isVector3(point) && Math.hypot(point[0] - zone.center[0], point[2] - zone.center[2]) <= zone.radius
    && point[1] >= zone.center[1] - zone.below && point[1] <= zone.center[1] + zone.above;
}

export function insideBox(point, zone) {
  return isVector3(point) && point.every((v, axis) => Math.abs(v - zone.center[axis]) <= zone.halfSize[axis]);
}

export function pointSegmentDistance(point, a, b) {
  if (![point, a, b].every(isVector3)) return Infinity;
  const ab = b.map((v, i) => v - a[i]);
  const lengthSquared = ab.reduce((sum, v) => sum + v * v, 0);
  const t = Math.max(0, Math.min(1, point.reduce((sum, v, i) => sum + (v - a[i]) * ab[i], 0) / (lengthSquared || 1)));
  return Math.hypot(...point.map((v, i) => v - a[i] - ab[i] * t));
}
```

## src/utils/MathUtils.js

```javascript
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * clamp(t);
export const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const isVector3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
export const wrappedAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const smoothstep = t => { const x = clamp(t); return x * x * (3 - 2 * x); };
```

## src/utils/PoseTransitions.js

```javascript
/** Finite, frame-rate independent pose transitions, advanced by the main loop. */
export class PoseTransitions {
  constructor() {
    this.items = new Map();
  }
  move(object, position, quaternion, duration = 0.3) {
    this.items.set(object, {
      start: object.position.clone(),
      rotation: object.quaternion.clone(),
      end: position.clone(),
      endRotation: quaternion.clone(),
      elapsed: 0,
      duration: Math.max(0.01, duration),
    });
  }
  cancel(object) {
    this.items.delete(object);
  }
  clear() {
    this.items.clear();
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const [object, pose] of this.items) {
      pose.elapsed = Math.min(pose.duration, pose.elapsed + dt);
      const fraction = pose.elapsed / pose.duration;
      const t = fraction * fraction * (3 - 2 * fraction);
      object.position.lerpVectors(pose.start, pose.end, t);
      object.quaternion.slerpQuaternions(pose.rotation, pose.endRotation, t);
      object.updateMatrixWorld(true);
      if (fraction === 1) this.items.delete(object);
    }
  }
}
```

## src/xr/FaceTrackingAdapter.js

```javascript
/**
 * No interoperable mouth-open WebXR API is assumed on Quest 3/3S Browser.
 * Cooking uses tracked hand fanning. This adapter states capability honestly and
 * intentionally never requests camera, microphone or an invented XR feature.
 */
export class FaceTrackingAdapter {
  get supported() { return false; }
  get mode() { return 'hand-fanning'; }
  get reason() { return 'لا تتوفر واجهة فم موثّقة لهذا المتصفح؛ حرّك يدك لتأجيج النار.'; }
  status() { return { supported: this.supported, mode: this.mode, reason: this.reason }; }
}

export default FaceTrackingAdapter;
```

## src/xr/GestureDetector.js

```javascript
import { clamp, distance3, isVector3, wrappedAngle } from '../utils/MathUtils.js';

/** Hysteresis prevents tracking jitter from emitting repeated grab/release events. */
export class PinchDetector {
  constructor({ start = 0.025, release = 0.04 } = {}) { this.startDistance = start; this.releaseDistance = release; this.active = false; }
  update(thumb, index) {
    if (!isVector3(thumb) || !isVector3(index)) return this.reset();
    const distance = distance3(thumb, index);
    const next = this.active ? distance < this.releaseDistance : distance < this.startDistance;
    const phase = next === this.active ? (next ? 'hold' : 'none') : (next ? 'start' : 'release');
    this.active = next;
    return { phase, active: next, distance, strength: 1 - clamp(distance / this.releaseDistance) };
  }
  reset() { const phase = this.active ? 'cancel' : 'none'; this.active = false; return { phase, active: false, distance: Infinity, strength: 0 }; }
}

/** Integrates circular motion only while samples are continuous and near the rim. */
export class CircularGesture {
  constructor({ minRadius = 0.045, maxRadius = 0.25, maxSpeed = 12, minTravel = 0.003 } = {}) {
    Object.assign(this, { minRadius, maxRadius, maxSpeed, minTravel }); this.reset();
  }
  reset() { this.previous = null; this.travel = 0; this.direction = 0; this.run = 0; }
  interrupt() { this.previous = null; this.run = 0; this.direction = 0; }
  update(angle, radius, dt) {
    if (![angle, radius, dt].every(Number.isFinite) || radius < this.minRadius || radius > this.maxRadius || dt <= 0 || dt > 0.25) { this.interrupt(); return 0; }
    if (this.previous === null) { this.previous = angle; return 0; }
    const delta = wrappedAngle(angle - this.previous); this.previous = angle;
    if (Math.abs(delta) > Math.min(0.65, this.maxSpeed * dt + 0.03)) { this.interrupt(); return 0; }
    if (Math.abs(delta) < this.minTravel) return 0;
    const direction = Math.sign(delta);
    if (this.direction && direction !== this.direction) this.run = 0;
    this.direction = direction; this.run += Math.abs(delta);
    // Small alternating wiggles do not count as stirring. A quarter-turn establishes a stroke.
    const accepted = this.run > Math.PI / 2 ? Math.abs(delta) : 0;
    this.travel += accepted;
    return accepted;
  }
}

/** Counts broad, alternating fanning strokes; noise or a stationary hand does not count. */
export class FanGesture {
  constructor({ strokeDistance = 0.075, minDuration = 0.12, maxDuration = 1.8 } = {}) {
    Object.assign(this, { strokeDistance, minDuration, maxDuration }); this.reset();
  }
  reset() { this.anchor = null; this.anchorTime = null; this.lastTime = null; this.direction = 0; this.strokes = 0; }
  interrupt() { this.anchor = null; this.anchorTime = null; this.lastTime = null; }
  update(point, time) {
    if (!isVector3(point) || !Number.isFinite(time) || (this.lastTime !== null && (time <= this.lastTime || time - this.lastTime > 0.4))) { this.interrupt(); return false; }
    this.lastTime = time;
    if (!this.anchor) { this.anchor = [...point]; this.anchorTime = time; return false; }
    const dx = point[0] - this.anchor[0], duration = time - this.anchorTime;
    if (duration > this.maxDuration) { this.anchor = [...point]; this.anchorTime = time; return false; }
    if (Math.abs(dx) < this.strokeDistance || duration < this.minDuration) return false;
    const direction = Math.sign(dx);
    if (this.direction === direction) return false;
    this.direction = direction; this.anchor = [...point]; this.anchorTime = time; this.strokes += 1;
    return true;
  }
}

export class GestureDetector {
  constructor() { this.pinch = new PinchDetector(); this.circular = new CircularGesture(); this.fan = new FanGesture(); }
  reset() { this.pinch.reset(); this.circular.reset(); this.fan.reset(); }
  static pinchDistance(thumb, index) { return isVector3(thumb) && isVector3(index) ? distance3(thumb, index) : Infinity; }
  static handShape(left, right, initial = { height: 0.18, separation: 0.2, y: 0.25 }) {
    if (!isVector3(left) || !isVector3(right)) return null;
    return { height: clamp(initial.height + (left[1] + right[1]) / 2 - initial.y, 0.12, 0.38), width: clamp(distance3(left, right) / initial.separation, 0.55, 1.5) };
  }
}
```

## src/xr/GrabSystem.js

```javascript
import { Box3, Quaternion, Vector3 } from 'three';

/** Exclusive grab ownership and smoothed world-to-parent object motion. */
export class GrabSystem {
  constructor() {
    this.items = new Map();
    this.owners = new Map();
  }

  register(id, object, { padding = 0.025, rotate = false, onRelease = () => {} } = {}) {
    const entry = { id, object, padding, rotate, onRelease,
      home: object.position.clone(), homeQuaternion: object.quaternion.clone(), owner: null };
    this.items.set(id, entry);
    return () => this.unregister(id);
  }

  unregister(id) {
    const entry = this.items.get(id);
    if (entry?.owner) this.release(entry.owner, { cancelled: true });
    this.items.delete(id);
  }

  begin(pointerId, worldPoint, quaternion = new Quaternion(), requestedId) {
    if (this.owners.has(pointerId)) return null;
    const candidates = requestedId ? [this.items.get(requestedId)] : [...this.items.values()];
    let closest = null, distance = Infinity;
    for (const entry of candidates) {
      if (!entry || entry.owner || !entry.object.visible) continue;
      const bounds = new Box3().setFromObject(entry.object).expandByScalar(entry.padding);
      if (!bounds.containsPoint(worldPoint)) continue;
      const d = bounds.getCenter(new Vector3()).distanceToSquared(worldPoint);
      if (d < distance) { closest = entry; distance = d; }
    }
    if (!closest) return null;
    closest.owner = pointerId;
    closest.offset = closest.object.getWorldPosition(new Vector3()).sub(worldPoint);
    closest.rotationOffset = quaternion.clone().invert().multiply(closest.object.getWorldQuaternion(new Quaternion()));
    this.owners.set(pointerId, closest);
    return closest;
  }

  move(pointerId, worldPoint, quaternion, dt = 1 / 72) {
    const entry = this.owners.get(pointerId);
    if (!entry) return null;
    const target = worldPoint.clone().add(entry.offset);
    if (entry.object.parent) entry.object.parent.worldToLocal(target);
    entry.object.position.lerp(target, 1 - Math.exp(-32 * dt));
    if (entry.rotate && quaternion) {
      const rotation = quaternion.clone().multiply(entry.rotationOffset);
      if (entry.object.parent) rotation.premultiply(entry.object.parent.getWorldQuaternion(new Quaternion()).invert());
      entry.object.quaternion.slerp(rotation, 1 - Math.exp(-24 * dt));
    }
    return entry;
  }

  release(pointerId, { cancelled = false, valid = true } = {}) {
    const entry = this.owners.get(pointerId);
    if (!entry) return null;
    this.owners.delete(pointerId);
    entry.owner = null;
    const worldPosition = entry.object.getWorldPosition(new Vector3());
    if (cancelled || !valid) {
      entry.object.position.copy(entry.home);
      entry.object.quaternion.copy(entry.homeQuaternion);
    }
    entry.onRelease({ entry, worldPosition, cancelled, valid });
    return entry;
  }

  cancelAll() { for (const owner of [...this.owners.keys()]) this.release(owner, { cancelled: true }); }
  clear() { this.cancelAll(); this.items.clear(); }
}

export default GrabSystem;
```

## src/xr/HandTracking.js

```javascript
import { Quaternion, Ray, Vector3 } from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const JOINTS = {
  wrist: 'wrist',
  palm: 'middle-finger-metacarpal',
  thumb: 'thumb-tip',
  index: 'index-finger-tip',
  middle: 'middle-finger-tip',
};

const finitePosition = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);
const validOrientation = (q) =>
  q &&
  [q.x, q.y, q.z, q.w].every(Number.isFinite) &&
  q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w > 1e-12;

/** Real articulated WebXR input. All returned positions are in renderer reference space. */
export class HandTrackingManager {
  constructor({ renderer, scene, onInput = () => {}, onTracking = () => {} }) {
    this.renderer = renderer;
    this.scene = scene;
    this.onInput = onInput;
    this.onTracking = onTracking;
    this.states = new Map();
    this.handModels = [];
    this.previousCount = 0;
    this.mustOpenHands = new Set();
    const factory = new XRHandModelFactory();
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      // The spheres profile is procedural and needs no remote model files.
      const model = factory.createHandModel(hand, 'spheres');
      hand.add(model);
      scene.add(hand);
      this.handModels.push({ hand, model });
    }
  }

  get hands() {
    return [...this.states.values()].filter((hand) => hand.tracked);
  }

  createState(source) {
    const key = source.handedness || 'none';
    const state = {
      id: `hand-${key}`,
      handedness: key,
      source,
      wrist: new Vector3(),
      palm: new Vector3(),
      thumb: new Vector3(),
      index: new Vector3(),
      middle: new Vector3(),
      midpoint: new Vector3(),
      quaternion: new Quaternion(),
      tracked: false,
      pinching: false,
      uiRay: null,
      lostTime: 0,
      initialized: false,
      mustOpen: this.mustOpenHands.has(key),
    };
    this.states.set(source, state);
    return state;
  }

  emit(state, phase, dt = 0) {
    this.onInput({
      type: 'pointer',
      id: state.id,
      phase,
      source: 'hand',
      handedness: state.handedness,
      pinching: state.pinching,
      position: (phase === 'hover' ? state.index : state.midpoint).clone(),
      indexPosition: state.index.clone(),
      quaternion: state.quaternion.clone(),
      dt,
      // UI aiming is separate from direct hand positions used to grab exhibits.
      uiRay: state.uiRay?.clone() ?? null,
    });
  }

  lose(state, dt, immediate = false) {
    state.lostTime += Number.isFinite(dt) && dt > 0 ? dt : 0;
    state.tracked = false;
    state.uiRay = null;
    // Never interpolate through unobserved space after even a brief pose gap.
    state.initialized = false;
    if (immediate || state.lostTime > 0.16) {
      if (state.pinching) this.emit(state, 'cancel');
      state.pinching = false;
      state.initialized = false;
      // Require an open pinch before reacquiring; a lost grip must never auto-grab.
      state.mustOpen = true;
      this.mustOpenHands.add(state.handedness);
    }
  }

  readUIRay(source, frame, referenceSpace) {
    if (!source.targetRaySpace || typeof frame.getPose !== 'function')
      return null;
    try {
      const pose = frame.getPose(source.targetRaySpace, referenceSpace);
      const transform = pose?.transform;
      if (
        !finitePosition(transform?.position) ||
        !validOrientation(transform?.orientation)
      )
        return null;
      const orientation = new Quaternion()
        .copy(transform.orientation)
        .normalize();
      return new Ray(
        new Vector3().copy(transform.position),
        new Vector3(0, 0, -1).applyQuaternion(orientation).normalize(),
      );
    } catch {
      // An unavailable aim pose must not interrupt tracked fingertip input.
      return null;
    }
  }

  update(frame, referenceSpace, dt) {
    // Invalid/stale time cannot produce an interpolation factor or gesture.
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
      for (const state of this.states.values()) this.lose(state, 0, true);
      if (this.previousCount) this.onTracking(0);
      this.previousCount = 0;
      return;
    }
    const sources = frame?.session?.inputSources;
    if (
      !sources ||
      !referenceSpace ||
      typeof frame.getJointPose !== 'function'
    ) {
      this.cancelAll();
      return;
    }
    const seen = new Set();
    for (const source of sources) {
      if (!source.hand) continue;
      const state = this.states.get(source) || this.createState(source);
      seen.add(source);
      const poses = {};
      try {
        for (const [name, jointName] of Object.entries(JOINTS)) {
          const joint = source.hand.get(jointName);
          poses[name] = joint
            ? frame.getJointPose(joint, referenceSpace)
            : null;
          if (!finitePosition(poses[name]?.transform?.position))
            poses[name] = null;
        }
      } catch {
        this.lose(state, dt);
        continue;
      }
      if (
        !poses.index ||
        !poses.thumb ||
        !poses.wrist ||
        !validOrientation(poses.wrist.transform.orientation)
      ) {
        this.lose(state, dt);
        continue;
      }
      const alpha = state.initialized ? 1 - Math.exp(-30 * dt) : 1;
      for (const [name, pose] of Object.entries(poses)) {
        if (!pose) continue;
        const p = pose.transform.position;
        state[name].lerp(new Vector3(p.x, p.y, p.z), alpha);
      }
      if (!poses.palm) state.palm.copy(state.wrist).lerp(state.index, 0.4);
      if (!poses.middle) state.middle.copy(state.index);
      const orientation = poses.wrist.transform.orientation;
      state.quaternion.slerp(
        new Quaternion(
          orientation.x,
          orientation.y,
          orientation.z,
          orientation.w,
        ).normalize(),
        alpha,
      );
      state.midpoint.copy(state.thumb).add(state.index).multiplyScalar(0.5);
      state.tracked = true;
      state.initialized = true;
      state.lostTime = 0;
      state.uiRay = this.readUIRay(source, frame, referenceSpace);
      const distance = state.thumb.distanceTo(state.index);
      if (distance > 0.034) {
        state.mustOpen = false;
        this.mustOpenHands.delete(state.handedness);
      }
      const wasPinching = state.pinching;
      state.pinching =
        !state.mustOpen && distance < (wasPinching ? 0.034 : 0.022);
      if (!wasPinching && state.pinching) this.emit(state, 'start', dt);
      else if (wasPinching && !state.pinching) this.emit(state, 'end', dt);
      else if (state.pinching) this.emit(state, 'move', dt);
      else this.emit(state, 'hover', dt);
    }
    for (const [source, state] of this.states) {
      if (!seen.has(source)) {
        this.lose(state, dt, true);
        this.states.delete(source);
      }
    }
    const count = this.hands.length;
    if (count !== this.previousCount) {
      this.previousCount = count;
      this.onTracking(count);
    }
  }

  cancelAll() {
    for (const state of this.states.values()) this.lose(state, 1, true);
    this.states.clear();
    if (this.previousCount) this.onTracking(0);
    this.previousCount = 0;
  }

  dispose() {
    this.cancelAll();
    const geometries = new Set(),
      materials = new Set();
    for (const { hand, model } of this.handModels) {
      model.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (material) materials.add(material);
        }
      });
      hand.remove(model);
      this.scene.remove(hand);
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}

export default HandTrackingManager;
```

## src/xr/HitTestPlacement.js

```javascript
import { Matrix4, Quaternion, Vector3 } from 'three';

/** One-shot stable placement. Hit testing is optional; viewer pose is always the fallback. */
export class HitTestPlacement {
  constructor({ content, onStatus = () => {} }) {
    this.content = content;
    this.onStatus = onStatus;
    this.source = null;
    this.pending = true;
    this.elapsed = 0;
    this.distance = 0.65;
    this.heightOffset = -0.6;
    this.seated = false;
    this.lastViewerPose = null;
    this.generation = 0;
  }

  async init(session) {
    const generation = ++this.generation;
    this.pending = true;
    this.elapsed = 0;
    if (typeof session.requestHitTestSource !== 'function') return false;
    if (session.enabledFeatures && !session.enabledFeatures.includes('hit-test')) return false;
    try {
      const viewer = await session.requestReferenceSpace('viewer');
      const options = { space: viewer, entityTypes: ['plane'] };
      if (typeof globalThis.XRRay === 'function') {
        options.offsetRay = new XRRay({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: -0.75, z: -1, w: 0 });
      }
      const source = await session.requestHitTestSource(options);
      if (generation !== this.generation) { source.cancel(); return false; }
      this.source = source;
      return true;
    } catch {
      this.onStatus({ kind: 'placement', message: 'تم اختيار موضع مريح أمامك', hitTest: false });
      return false;
    }
  }

  recenter() { this.pending = true; this.elapsed = 0; }

  setComfort({ seated, distance, heightOffset } = {}) {
    if (typeof seated === 'boolean') this.seated = seated;
    if (Number.isFinite(distance)) this.distance = Math.min(0.95, Math.max(0.45, distance));
    if (Number.isFinite(heightOffset)) this.heightOffset = Math.min(-0.35, Math.max(-0.85, heightOffset));
    this.recenter();
  }

  update(frame, referenceSpace, dt) {
    if (!this.pending) return false;
    const pose = frame.getViewerPose(referenceSpace);
    if (!pose) return false;
    this.lastViewerPose = pose;
    this.elapsed += dt;
    const viewerPosition = new Vector3().copy(pose.transform.position);
    const viewerRotation = new Quaternion().copy(pose.transform.orientation);
    const forward = new Vector3(0, 0, -1).applyQuaternion(viewerRotation);
    forward.y = 0;
    if (forward.lengthSq() < 0.01) forward.set(0, 0, -1); else forward.normalize();
    let hitPosition = null;
    if (this.source && typeof frame.getHitTestResults === 'function') {
      try {
        for (const hit of frame.getHitTestResults(this.source)) {
          const hitPose = hit.getPose(referenceSpace);
          if (!hitPose) continue;
          const transform = new Matrix4().fromArray(hitPose.transform.matrix);
          const normal = new Vector3(0, 1, 0).transformDirection(transform);
          const p = new Vector3().setFromMatrixPosition(transform);
          const horizontal = new Vector3(p.x - viewerPosition.x, 0, p.z - viewerPosition.z);
          const distance = horizontal.length();
          if (normal.y > 0.85 && distance >= 0.35 && distance <= 1.1 && horizontal.normalize().dot(forward) > 0.6) {
            hitPosition = p;
            break;
          }
        }
      } catch { this.source.cancel(); this.source = null; }
    }
    // Never chase the user's gaze after placement. Recenter is an explicit action.
    if (!hitPosition && this.elapsed < 0.65) return false;
    const target = viewerPosition.clone().addScaledVector(forward, this.distance);
    target.y = viewerPosition.y + this.heightOffset;
    if (hitPosition) {
      // Anchor the display above the detected surface while keeping the active objects reachable.
      target.x = hitPosition.x;
      target.z = hitPosition.z;
      target.y = Math.max(viewerPosition.y - 0.75,
        Math.min(viewerPosition.y - 0.42, hitPosition.y + (this.seated ? 0.55 : 0.85)));
    }
    if (this.content.parent) this.content.parent.worldToLocal(target);
    this.content.position.copy(target);
    // The front of every museum model is +Z and faces back toward the viewer.
    this.content.rotation.set(0, Math.atan2(-forward.x, -forward.z), 0);
    this.content.updateMatrixWorld(true);
    this.pending = false;
    this.onStatus({ kind: 'placement', message: hitPosition ? 'تم تثبيت المعرض فوق سطح مناسب' : 'تم تثبيت المعرض أمامك', hitTest: !!hitPosition, placed: true });
    return true;
  }

  dispose() {
    this.generation++;
    this.source?.cancel();
    this.source = null;
    this.lastViewerPose = null;
    this.pending = true;
  }
}

export default HitTestPlacement;
```

## src/xr/Locomotion.js

```javascript
/** Stationary museum experience. Reposition the exhibit instead of moving the user's camera. */
export class Locomotion {
  constructor(placement) { this.placement = placement; }
  recenter() { this.placement.recenter(); }
  setSeated(seated) { this.placement.setComfort({ seated }); }
  setReach(distance) { this.placement.setComfort({ distance }); }
}

export default Locomotion;
```

## src/xr/TouchDetector.js

```javascript
import { Box3, Raycaster, Vector3 } from 'three';

/** Small local interaction regions; never substitutes a large object's center for its surface. */
export class TouchDetector {
  constructor({ cooldown = 0.35 } = {}) {
    this.cooldown = cooldown;
    this.lastTouch = new Map();
    this.inside = new Set();
    this.raycaster = new Raycaster();
  }

  static contains(point, zone, padding = 0) {
    const p = point.isVector3 ? point : new Vector3(...point);
    const center = zone.center?.isVector3 ? zone.center : new Vector3(...(zone.center || [0, 0, 0]));
    if (zone.type === 'sphere') return p.distanceToSquared(center) <= (zone.radius + padding) ** 2;
    if (zone.type === 'cylinder') {
      const dx = p.x - center.x, dz = p.z - center.z;
      return dx * dx + dz * dz <= (zone.radius + padding) ** 2 && Math.abs(p.y - center.y) <= zone.height / 2 + padding;
    }
    const half = zone.halfSize?.isVector3 ? zone.halfSize : new Vector3(...(zone.halfSize || [0.05, 0.05, 0.05]));
    return Math.abs(p.x - center.x) <= half.x + padding &&
      Math.abs(p.y - center.y) <= half.y + padding && Math.abs(p.z - center.z) <= half.z + padding;
  }

  test(pointerId, worldPoint, object, zone, timeSeconds) {
    object.updateWorldMatrix(true, false);
    const local = object.worldToLocal(worldPoint.clone());
    const key = `${pointerId}:${object.uuid}:${zone.id || 'zone'}`;
    const hit = TouchDetector.contains(local, zone, zone.tolerance ?? 0.012);
    const entered = hit && !this.inside.has(key);
    if (hit) this.inside.add(key); else this.inside.delete(key);
    const ready = timeSeconds - (this.lastTouch.get(key) ?? -Infinity) >= this.cooldown;
    if (entered && ready) this.lastTouch.set(key, timeSeconds);
    return { near: hit, activated: entered && ready, local };
  }

  raycast(ray, objects) {
    this.raycaster.ray.copy(ray);
    return this.raycaster.intersectObjects(objects, true)[0] || null;
  }

  bounds(object) { return new Box3().setFromObject(object); }
  reset() { this.lastTouch.clear(); this.inside.clear(); }
}

export default TouchDetector;
```

## src/xr/VRSessionButton.js

```javascript
import { VRButton } from 'three/addons/webxr/VRButton.js';

/**
 * Use Three.js' actual VRButton while sharing the app's AR/VR lifecycle.
 *
 * r181's built-in onclick does not catch a rejected requestSession promise.
 * A capture handler owns explicit clicks so permission denial reaches the UI.
 * The renderer adapter still supports VRButton's browser-offered sessions and
 * delegates renderer.xr.setSession to XRManager exactly once.
 */
export function createVRSessionButton({
  xrManager,
  onGesture = () => {},
  onBeforeEnter = () => {},
  onError = () => {},
}) {
  let disposed = false;
  let supportKnown = false;
  let supported = false;

  const rendererAdapter = {
    xr: {
      async setSession(session) {
        try {
          if (disposed) throw new Error('VR button has been disposed.');
          onBeforeEnter();
          await xrManager.adoptSession(session, 'immersive-vr', {
            endOnFailure: false,
          });
          // Native VRButton writes its English label after the adapter resolves.
          setTimeout(refresh, 0);
        } catch (error) {
          if (!disposed) onError(error);
          // Let VRButton finish assigning its private currentSession before an
          // end event. Ending earlier triggers a null dereference in r181.
          setTimeout(() => session.end().catch(() => {}), 0);
        }
      },
    },
  };

  const element = VRButton.createButton(
    rendererAdapter,
    xrManager.sessionOptions('immersive-vr'),
  );
  element.classList.add('vr-button');
  element.dataset.xrMode = 'immersive-vr';
  element.setAttribute('aria-label', 'الدخول إلى الواقع الافتراضي');

  function refresh() {
    if (disposed) return;
    const inVR = xrManager.active && xrManager.mode === 'immersive-vr';
    const busy = xrManager.entering || (xrManager.active && !inVR);
    const disabled = !supportKnown || !supported || busy;
    element.disabled = disabled;
    element.setAttribute('aria-disabled', String(disabled));
    element.setAttribute('aria-pressed', String(inVR));
    element.textContent = inVR
      ? 'الخروج من VR'
      : busy
        ? 'جلسة غامرة قيد التشغيل…'
        : !supportKnown
          ? 'جارٍ فحص VR…'
          : supported
            ? 'الدخول إلى VR'
            : 'VR غير مدعوم';
    element.title = supported
      ? 'واقع افتراضي كامل — حرّك رأسك للنظر حولك'
      : xrManager.vrSupport.reason;
    // The app's right-hand menu owns positioning, instead of VRButton's default
    // bottom-center overlay that would cover the exhibit or chapter controls.
    Object.assign(element.style, {
      position: 'static',
      left: 'auto',
      bottom: 'auto',
      width: '100%',
      display: '',
      font: 'inherit',
      opacity: disabled ? '.55' : '1',
      cursor: disabled ? 'default' : 'pointer',
    });
    if (element.tagName === 'A') {
      element.removeAttribute('href');
      element.setAttribute('role', 'button');
      element.tabIndex = disabled ? -1 : 0;
    }
  }

  async function click(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (disposed || !supported || xrManager.entering) return;
    if (xrManager.active && xrManager.mode !== 'immersive-vr') return;
    // Invoke synchronously, before any await, to preserve browser audio activation.
    onGesture();
    try {
      if (xrManager.active) await xrManager.exit();
      else {
        if (onBeforeEnter() === false) return;
        await xrManager.enterVR();
      }
    } catch (error) {
      onError(error);
    } finally {
      refresh();
    }
  }

  element.addEventListener('click', click, true);
  xrManager.addEventListener('sessionchange', refresh);
  refresh();
  const ready = xrManager.checkVRSupport().then((result) => {
    supportKnown = true;
    supported = result.supported;
    refresh();
    return result;
  });

  return {
    element,
    ready,
    refresh,
    dispose() {
      disposed = true;
      element.removeEventListener('click', click, true);
      xrManager.removeEventListener('sessionchange', refresh);
      element.remove();
    },
  };
}
```

## src/xr/XRManager.js

```javascript
import {
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  Quaternion,
  Ray,
  Vector3,
} from 'three';
import { HandTrackingManager } from './HandTracking.js';
import { HitTestPlacement } from './HitTestPlacement.js';
import { Locomotion } from './Locomotion.js';
import { FaceTrackingAdapter } from './FaceTrackingAdapter.js';

/** Owns exactly one AR or VR session; both modes share placement and input. */
export class XRManager extends EventTarget {
  constructor({
    renderer,
    scene,
    camera,
    content,
    overlay,
    onStatus = () => {},
    onInput = () => {},
    onSession = () => {},
    onViewerPose = () => {},
  }) {
    super();
    Object.assign(this, {
      renderer,
      scene,
      camera,
      content,
      overlay,
      onStatus,
      onInput,
      onSession,
      onViewerPose,
    });
    this.session = null;
    this.mode = null;
    this.referenceSpace = null;
    this.referenceSpaceType = null;
    this.entering = false;
    this.support = {
      supported: false,
      secure: globalThis.isSecureContext === true,
      reason: 'لم يتم الفحص بعد',
    };
    this.vrSupport = {
      supported: false,
      secure: globalThis.isSecureContext === true,
      reason: 'لم يتم فحص VR بعد',
    };
    this.controllers = new Map();
    this.nextControllerId = 0;
    this.hiddenObjects = [];
    this.renderer.xr.enabled = true;
    this.renderer.xr.setFramebufferScaleFactor(0.85);
    this.handTracking = new HandTrackingManager({
      renderer,
      scene,
      onInput,
      onTracking: (count) =>
        this.onStatus({
          kind: 'tracking',
          count,
          message: count
            ? `تتبع اليدين نشط · ${count}`
            : 'ضع يديك أمام النظارة أو استخدم وحدات التحكم',
        }),
    });
    this.placement = new HitTestPlacement({ content, onStatus });
    this.locomotion = new Locomotion(this.placement);
    this.faceTracking = new FaceTrackingAdapter();
    this.boundEnd = (event) => {
      if (event.target === this.session) this.cleanupSession();
    };
    this.boundSelectStart = (event) => {
      if (!event.inputSource.hand)
        this.controllerState(event.inputSource).selected = true;
    };
    this.boundSelectEnd = (event) => {
      if (!event.inputSource.hand)
        this.controllerState(event.inputSource).selected = false;
    };
    this.boundVisibility = () => {
      const visible = this.session?.visibilityState === 'visible';
      if (!visible) this.cancelInputs();
      this.onStatus({
        kind: 'visibility',
        visible,
        message: visible
          ? 'التجربة نشطة'
          : 'التجربة متوقفة مؤقتاً أثناء ظهور واجهة النظام',
      });
    };
    this.boundReferenceReset = () => this.recenter();
    // Do not allow a DOM-overlay button press to also activate the exhibit behind it.
    this.boundBeforeXRSelect = (event) => {
      if (
        event.target?.closest?.(
          'button, input, select, dialog, [role="button"]',
        )
      )
        event.preventDefault();
    };
    overlay?.addEventListener('beforexrselect', this.boundBeforeXRSelect);
  }

  get active() {
    return !!this.session;
  }
  get hands() {
    return this.handTracking.hands;
  }
  get domOverlay() {
    return !!this.session?.domOverlayState;
  }

  notifySession(active, info) {
    this.onSession(active, info);
    this.dispatchEvent(new Event('sessionchange'));
  }

  /** Test VR independently: support for AR does not imply support for VR. */
  async checkVRSupport() {
    const secure = globalThis.isSecureContext === true;
    let supported = false,
      reason = 'الواقع الافتراضي غير متاح في هذا المتصفح';
    if (!secure) reason = 'يتطلب الواقع الافتراضي رابط HTTPS آمناً';
    else if (globalThis.navigator?.xr?.isSessionSupported) {
      try {
        supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (supported) reason = 'الواقع الافتراضي جاهز';
      } catch (error) {
        reason = `تعذّر فحص الواقع الافتراضي: ${error.message}`;
      }
    }
    this.vrSupport = { supported, secure, reason };
    this.onStatus({ kind: 'vr-support', ...this.vrSupport, message: reason });
    return this.vrSupport;
  }

  async checkSupport() {
    const secure = globalThis.isSecureContext === true;
    if (!secure)
      this.support = {
        supported: false,
        secure,
        reason: 'يحتاج الواقع المختلط إلى رابط HTTPS آمن',
      };
    else if (!globalThis.navigator?.xr?.isSessionSupported) {
      this.support = {
        supported: false,
        secure,
        reason: 'استمتع بنسخة المتصفح، أو افتح الرابط على Meta Quest',
      };
    } else {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        this.support = {
          supported,
          secure,
          reason: supported
            ? 'الواقع المختلط متاح'
            : 'الواقع المختلط غير متاح في هذا المتصفح',
        };
      } catch (error) {
        this.support = {
          supported: false,
          secure,
          reason: 'تعذّر فحص الواقع المختلط',
          error: error.message,
        };
      }
    }
    this.onStatus({
      kind: 'support',
      ...this.support,
      message: this.support.reason,
    });
    return this.support;
  }

  sessionOptions(mode = 'immersive-ar') {
    const options = { optionalFeatures: ['local-floor', 'hand-tracking'] };
    if (mode === 'immersive-ar') options.optionalFeatures.push('hit-test');
    if (this.overlay) {
      options.optionalFeatures.push('dom-overlay');
      options.domOverlay = { root: this.overlay };
    }
    return options;
  }

  enter() {
    return this.enterMode('immersive-ar');
  }
  enterVR() {
    return this.enterMode('immersive-vr');
  }

  async enterMode(mode) {
    if (this.active || this.entering)
      throw new Error('أغلق جلسة الواقع الحالية قبل بدء جلسة أخرى.');
    if (
      !globalThis.isSecureContext ||
      !globalThis.navigator?.xr?.requestSession
    ) {
      throw new Error(
        'يلزم متصفح يدعم WebXR ورابط HTTPS آمن. يمكنك متابعة الرحلة على الشاشة.',
      );
    }
    this.entering = true;
    this.dispatchEvent(new Event('sessionchange'));
    this.onStatus({
      kind: 'session',
      mode,
      entering: true,
      message: 'جارٍ بدء التجربة الغامرة…',
    });
    let session;
    try {
      // No awaited support check before requestSession: preserve the click activation.
      session = await navigator.xr.requestSession(
        mode,
        this.sessionOptions(mode),
      );
      return await this.adoptSession(session, mode, { fromRequest: true });
    } catch (error) {
      // adoptSession owns cleanup once a session exists. A denied request has no
      // renderer state to undo and must not be reported as a successful entry.
      if (!session) this.reportEntryError(error);
      throw error;
    } finally {
      this.entering = false;
      this.dispatchEvent(new Event('sessionchange'));
    }
  }

  reportEntryError(error) {
    this.onStatus({
      kind: 'error',
      message:
        error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? 'لم يُسمح ببدء التجربة الغامرة. يمكنك المتابعة على الشاشة أو المحاولة مجدداً.'
          : `تعذّر بدء التجربة الغامرة: ${error.message}`,
    });
  }

  /**
   * Attach a browser session exactly once. VRButton's renderer adapter also uses
   * this path when the browser offers a session through its own XR interface.
   */
  async adoptSession(
    session,
    mode,
    { fromRequest = false, endOnFailure = true } = {},
  ) {
    if (this.session === session) return session;
    if (this.active || (this.entering && !fromRequest))
      throw new Error('توجد جلسة غامرة قيد التشغيل أو الإعداد.');
    if (!['immersive-ar', 'immersive-vr'].includes(mode))
      throw new Error('Unsupported immersive session mode.');
    const ownsEntering = !this.entering;
    if (ownsEntering) this.entering = true;
    try {
      this.session = session;
      this.mode = mode;
      session.addEventListener('end', this.boundEnd);
      session.addEventListener('selectstart', this.boundSelectStart);
      session.addEventListener('selectend', this.boundSelectEnd);
      session.addEventListener('visibilitychange', this.boundVisibility);
      this.desktopState = {
        background: this.scene.background,
        clearColor: this.renderer.getClearColor(new Color()).clone(),
        clearAlpha: this.renderer.getClearAlpha(),
        contentPosition: this.content.position.clone(),
        contentQuaternion: this.content.quaternion.clone(),
        contentScale: this.content.scale.clone(),
        contentVisible: this.content.visible,
        cameraPosition: this.camera.position.clone(),
        cameraQuaternion: this.camera.quaternion.clone(),
        cameraScale: this.camera.scale.clone(),
        cameraFov: this.camera.fov,
        cameraZoom: this.camera.zoom,
      };
      // AR remains transparent. VR gets a quiet opaque exhibition background.
      this.scene.background =
        mode === 'immersive-ar' ? null : new Color(0x102127);
      this.renderer.setClearColor(
        mode === 'immersive-ar' ? 0x000000 : 0x102127,
        mode === 'immersive-ar' ? 0 : 1,
      );
      this.scene.traverse((object) => {
        if (object.userData.xrDesktopOnly) {
          this.hiddenObjects.push({ object, visible: object.visible });
          object.visible = false;
        }
      });
      this.content.visible = false;
      try {
        this.referenceSpace =
          await session.requestReferenceSpace('local-floor');
        this.referenceSpaceType = 'local-floor';
      } catch {
        this.referenceSpace = await session.requestReferenceSpace('local');
        this.referenceSpaceType = 'local';
      }
      if (this.session !== session)
        throw new DOMException('Session ended during setup.', 'AbortError');
      this.renderer.xr.setReferenceSpaceType(this.referenceSpaceType);
      await this.renderer.xr.setSession(session);
      if (this.session !== session)
        throw new DOMException('Session ended during setup.', 'AbortError');
      this.renderer.xr.setReferenceSpace(this.referenceSpace);
      this.referenceSpace.addEventListener('reset', this.boundReferenceReset);
      this.renderer.xr.setFoveation?.(0.5);
      // Hit test setup cannot block a playable, stable viewer-relative placement.
      const hitTest =
        mode === 'immersive-ar' ? await this.placement.init(session) : false;
      if (mode === 'immersive-vr') {
        this.placement.dispose();
        this.placement.recenter();
      }
      if (this.session !== session) return null;
      const info = {
        mode,
        domOverlay: this.domOverlay,
        referenceSpace: this.referenceSpaceType,
        hitTest,
        features: session.enabledFeatures
          ? Array.from(session.enabledFeatures)
          : [],
      };
      this.notifySession(true, info);
      this.onStatus({
        kind: 'session',
        active: true,
        message: 'انظر أمامك لاختيار موضع المعرض',
        ...info,
      });
      return session;
    } catch (error) {
      if (endOnFailure) {
        try {
          await session.end();
        } catch {
          /* Already ended during setup. */
        }
      }
      if (this.session === session) this.cleanupSession();
      this.reportEntryError(error);
      throw error;
    } finally {
      if (ownsEntering) this.entering = false;
      this.dispatchEvent(new Event('sessionchange'));
    }
  }

  controllerState(source) {
    let state = this.controllers.get(source);
    if (!state) {
      const line = new Line(
        new BufferGeometry().setFromPoints([
          new Vector3(),
          new Vector3(0, 0, -0.7),
        ]),
        new LineBasicMaterial({
          color: 0x78e5d1,
          transparent: true,
          opacity: 0.65,
          depthTest: false,
        }),
      );
      line.frustumCulled = false;
      line.visible = false;
      this.scene.add(line);
      state = {
        id: `controller-${this.nextControllerId++}`,
        selected: false,
        pressed: false,
        mustRelease: false,
        position: new Vector3(),
        quaternion: new Quaternion(),
        ray: new Ray(),
        line,
        tracked: false,
      };
      this.controllers.set(source, state);
    }
    return state;
  }

  emitController(state, phase, dt = 0) {
    this.onInput({
      type: 'pointer',
      id: state.id,
      phase,
      source: 'controller',
      position: state.position.clone(),
      quaternion: state.quaternion.clone(),
      ray: state.ray.clone(),
      pinching: state.pressed,
      dt,
    });
  }

  updateControllers(frame, dt) {
    const seen = new Set();
    for (const source of this.session.inputSources) {
      if (source.hand) continue;
      const state = this.controllerState(source);
      seen.add(source);
      const pose = frame.getPose(source.targetRaySpace, this.referenceSpace);
      if (!pose) {
        if (state.pressed) this.emitController(state, 'cancel');
        state.pressed = false;
        state.mustRelease = true;
        state.tracked = false;
        state.line.visible = false;
        continue;
      }
      state.tracked = true;
      state.quaternion.copy(pose.transform.orientation);
      state.ray.origin.copy(pose.transform.position);
      state.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(state.quaternion)
        .normalize();
      state.ray.at(0.45, state.position);
      state.line.position.copy(state.ray.origin);
      state.line.quaternion.copy(state.quaternion);
      state.line.visible = true;
      const button = source.gamepad?.buttons?.[0];
      const selected = state.selected || !!button?.pressed;
      if (!selected) state.mustRelease = false;
      const wasPressed = state.pressed;
      state.pressed = selected && !state.mustRelease;
      if (!wasPressed && state.pressed) this.emitController(state, 'start', dt);
      else if (wasPressed && !state.pressed)
        this.emitController(state, 'end', dt);
      else this.emitController(state, state.pressed ? 'move' : 'hover', dt);
    }
    for (const [source, state] of this.controllers) {
      if (!seen.has(source)) {
        if (state.pressed) this.emitController(state, 'cancel');
        this.removeController(source, state);
      }
    }
  }

  removeController(source, state) {
    this.scene.remove(state.line);
    state.line.geometry.dispose();
    state.line.material.dispose();
    this.controllers.delete(source);
  }

  update(frame, dt = 1 / 72) {
    if (!this.session || !frame || !this.referenceSpace) return;
    if (this.session.visibilityState === 'hidden') return;
    dt = Math.max(0.001, Math.min(dt, 0.05));
    this.placement.update(frame, this.referenceSpace, dt);
    if (this.placement.pending) return;
    this.content.visible = true;
    const viewerPose = frame.getViewerPose?.(this.referenceSpace);
    if (viewerPose) this.onViewerPose(viewerPose.transform);
    this.handTracking.update(frame, this.referenceSpace, dt);
    this.updateControllers(frame, dt);
  }

  recenter() {
    if (!this.session) return;
    this.cancelInputs();
    this.placement.recenter();
    this.onStatus({
      kind: 'placement',
      placed: false,
      message: 'انظر إلى المساحة المريحة أمامك',
    });
  }

  setComfort(options) {
    this.placement.setComfort(options);
  }

  cancelInputs() {
    this.handTracking.cancelAll();
    for (const state of this.controllers.values()) {
      if (state.pressed) this.emitController(state, 'cancel');
      state.pressed = false;
      state.mustRelease = true;
    }
  }

  async exit() {
    if (this.session) await this.session.end();
  }

  cleanupSession() {
    const wasActive = !!this.session || !!this.desktopState;
    const session = this.session;
    const mode = this.mode;
    this.session = null;
    this.mode = null;
    session?.removeEventListener('end', this.boundEnd);
    session?.removeEventListener('selectstart', this.boundSelectStart);
    session?.removeEventListener('selectend', this.boundSelectEnd);
    session?.removeEventListener('visibilitychange', this.boundVisibility);
    this.referenceSpace?.removeEventListener('reset', this.boundReferenceReset);
    this.referenceSpace = null;
    this.cancelInputs();
    this.placement.dispose();
    for (const [source, state] of this.controllers)
      this.removeController(source, state);
    if (this.desktopState) {
      const previous = this.desktopState;
      this.scene.background = previous.background;
      this.renderer.setClearColor(previous.clearColor, previous.clearAlpha);
      this.content.position.copy(previous.contentPosition);
      this.content.quaternion.copy(previous.contentQuaternion);
      this.content.scale.copy(previous.contentScale);
      this.content.visible = previous.contentVisible;
      this.camera.position.copy(previous.cameraPosition);
      this.camera.quaternion.copy(previous.cameraQuaternion);
      this.camera.scale.copy(previous.cameraScale);
      // Three's WebXRManager replaces the user camera's FOV/zoom each frame.
      // Restore its desktop lens as well as its transform before rebuilding it.
      this.camera.fov = previous.cameraFov;
      this.camera.zoom = previous.cameraZoom;
      this.camera.updateProjectionMatrix();
      this.desktopState = null;
    }
    for (const { object, visible } of this.hiddenObjects)
      object.visible = visible;
    this.hiddenObjects.length = 0;
    if (wasActive) {
      this.notifySession(false, {
        mode,
        domOverlay: false,
        referenceSpace: null,
        hitTest: false,
      });
      this.onStatus({
        kind: 'session',
        active: false,
        message: 'تم الرجوع إلى نسخة الشاشة',
      });
    }
  }

  dispose() {
    this.exit().catch(() => this.cleanupSession());
    this.overlay?.removeEventListener(
      'beforexrselect',
      this.boundBeforeXRSelect,
    );
    this.handTracking.dispose();
  }
}

export default XRManager;
```

## scripts/generate-music.mjs

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * "Oud Majlis": original, quiet Arabic-inspired instrumental music, 120 seconds.
 * Soft paired-course plucks and a constant low tonic/fifth drone; no percussion,
 * chord progression, bright bells, recorded samples, speech or vocals.
 * The neutral second/sixth deliberately use microtonal tuning for modal colour.
 * This is a new synthetic composition, not a claim of traditional authenticity.
 */
const sampleRate = 22050;
const duration = 120;
const samples = sampleRate * duration;
const left = new Float32Array(samples);
const right = new Float32Array(samples);
const tonic = 146.8323839587038; // D3, kept in a warm low/middle register.
const modeCents = [0, 150, 300, 500, 700, 850, 1000];
const frequency = (degree) => {
  const octave = Math.floor(degree / modeCents.length);
  const index =
    ((degree % modeCents.length) + modeCents.length) % modeCents.length;
  return tonic * 2 ** ((modeCents[index] + octave * 1200) / 1200);
};

// Unhurried phrases and rests are placed in seconds, without a metronomic beat.
// Each tuple is [onset, modal degree, ring time, relative strength, stereo pan].
const melody = [
  [4.0, 0, 4.8, 0.83, -0.17],
  [8.5, 1, 3.7, 0.66, -0.12],
  [10.8, 2, 4.0, 0.72, -0.04],
  [15.6, 1, 3.6, 0.61, 0.08],
  [18.6, 0, 5.2, 0.76, 0.16],
  [25.0, 0, 3.9, 0.7, 0.15],
  [27.4, 2, 4.3, 0.76, 0.04],
  [32.7, 3, 4.5, 0.8, -0.08],
  [35.2, 2, 3.7, 0.64, -0.15],
  [38.5, 1, 4.2, 0.68, -0.1],
  [41.0, 0, 5.5, 0.77, 0.02],
  [48.0, 3, 4.8, 0.73, -0.13],
  [52.3, 4, 4.6, 0.78, 0.04],
  [57.6, 3, 4.0, 0.7, 0.13],
  [60.0, 2, 4.4, 0.68, 0.15],
  [64.3, 1, 4.2, 0.62, 0.03],
  [67.2, 0, 5.7, 0.75, -0.11],
  [75.0, 4, 4.9, 0.72, -0.14],
  [79.6, 5, 3.7, 0.63, -0.04],
  [82.2, 4, 4.7, 0.69, 0.09],
  [86.8, 3, 3.8, 0.65, 0.15],
  [89.4, 2, 5.3, 0.7, 0.03],
  [97.0, 2, 4.5, 0.68, -0.09],
  [100.5, 1, 4.8, 0.63, -0.16],
  [105.0, 0, 5.4, 0.74, -0.03],
  [110.0, -3, 4.6, 0.57, 0.1],
  [114.5, 1, 3.7, 0.59, 0.14],
  [117.2, 0, 6.8, 0.67, 0.02],
];

function addOud(start, degree, seconds, strength, pan) {
  const hz = frequency(degree);
  const first = Math.round(start * sampleRate);
  const length = Math.round(seconds * sampleRate);
  const gain = 0.13 * strength;
  const lGain = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const rGain = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  // Gentle paired string courses and rapidly damping upper harmonics suggest
  // a rounded oud pluck. A 35ms attack suppresses pick clicks and sharp highs.
  const detune = 2 ** (2.8 / 1200);
  const bend = 2 ** (-13 / 1200) - 1;
  const partials = [1, 0.39, 0.17, 0.075, 0.028];
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const easedTime = t + bend * 0.12 * (1 - Math.exp(-t / 0.12));
    const phase = 2 * Math.PI * hz * easedTime;
    const attack = 1 - Math.exp(-t / 0.035);
    const release = Math.min(1, (seconds - t) / 0.65);
    let wave = 0;
    for (let n = 1; n <= partials.length; n++) {
      const decay = Math.exp(-t * (0.58 + (n - 1) * 0.48));
      const courses =
        Math.sin(phase * n) * 0.61 + Math.sin(phase * detune * n) * 0.39;
      wave += courses * partials[n - 1] * decay;
    }
    const index = (first + i) % samples;
    left[index] += wave * attack * release * lGain;
    right[index] += wave * attack * release * rGain;
  }
}

// Quantize drone frequencies to complete cycles over 120s so every harmonic,
// slow swell and stereo motion meets itself exactly at the loop boundary.
const cycleFrequency = (hz) => Math.round(hz * duration) / duration;
const droneRoot = cycleFrequency(tonic / 2);
const droneFifth = cycleFrequency(tonic * 0.75);
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const swell = 0.87 + 0.13 * Math.cos((2 * Math.PI * t) / 40);
  const width = 0.04 * Math.sin((2 * Math.PI * t) / 60);
  const root = Math.sin(2 * Math.PI * droneRoot * t);
  const octave = Math.sin(2 * Math.PI * droneRoot * 2 * t) * 0.18;
  const fifth = Math.sin(2 * Math.PI * droneFifth * t) * 0.34;
  const drone = (root + octave + fifth) * 0.012 * swell;
  left[i] = drone * (0.71 + width);
  right[i] = drone * (0.71 - width);
}
for (const note of melody) addOud(...note);

// Quiet, non-rhythmic room reflections; tails wrap rather than being truncated.
const dryLeft = left.slice();
const dryRight = right.slice();
for (const [seconds, gain] of [
  [0.083, 0.09],
  [0.137, 0.07],
  [0.229, 0.055],
  [0.431, 0.033],
  [0.683, 0.018],
]) {
  const delay = Math.round(seconds * sampleRate);
  for (let i = 0; i < samples; i++) {
    const destination = (i + delay) % samples;
    left[destination] += dryRight[i] * gain;
    right[destination] += dryLeft[i] * gain;
  }
}

let peak = 0;
for (let i = 0; i < samples; i++)
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
if (!Number.isFinite(peak) || peak === 0)
  throw new Error('Invalid generated audio');
const frameBytes = 4;
const wav = Buffer.alloc(44 + samples * frameBytes);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * frameBytes, 28);
wav.writeUInt16LE(frameBytes, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples * frameBytes, 40);
let squared = 0;
for (let i = 0; i < samples; i++) {
  const l = (left[i] / peak) * 0.52;
  const r = (right[i] / peak) * 0.52;
  squared += l * l + r * r;
  wav.writeInt16LE(Math.round(l * 32767), 44 + i * frameBytes);
  wav.writeInt16LE(Math.round(r * 32767), 46 + i * frameBytes);
}
const destination = fileURLToPath(
  new URL('../public/assets/audio/oud-majlis.wav', import.meta.url),
);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, wav);
const boundary =
  (Math.max(
    Math.abs(left[0] - left.at(-1)),
    Math.abs(right[0] - right.at(-1)),
  ) /
    peak) *
  0.52;
console.log(
  `Generated oud-majlis.wav: ${duration}s stereo PCM, ${sampleRate} Hz, ${wav.length} bytes; peak .52, RMS ${Math.sqrt(squared / (samples * 2)).toFixed(4)}, loop-edge delta ${boundary.toFixed(6)}.`,
);
```

