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
