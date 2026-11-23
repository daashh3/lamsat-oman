# VR entry and shared XR lifecycle update

The application now supports both `immersive-ar` (transparent passthrough) and `immersive-vr` (opaque neutral exhibition background). The actual `VRButton` addon is imported from `three/addons/webxr/VRButton.js`; the existing Three.js 0.181.2 dependency supplies it locally, so no CDN or new dependency is required.

## App integration

```js
import { createVRSessionButton } from './src/xr/VRSessionButton.js';

const vrButton = createVRSessionButton({
  xrManager,
  onGesture: () => audio.unlock(),
  onBeforeEnter: () => {
    return game.state === 'READY' ? game.beginXR() : !!game.chapter;
  },
  onError: error => {
    game.cancelXR();
    ui.toast(error.message);
  },
});
document.querySelector('#vr-entry').appendChild(vrButton.element);
// During app teardown: vrButton.dispose();
```

`XRManager.enter()` retains AR behavior. `enterVR()` enters VR, `checkVRSupport()` checks VR independently, and `mode` identifies the active mode. `onSession(active, info)` includes `info.mode`. Both paths use the same actual hand joints, controller input, viewer-relative exhibit placement, reference-space fallback, and end cleanup. No artificial camera rotation or locomotion is introduced.

The VRButton wrapper catches explicit click permission failures, preserves the audio user-activation chain, and prevents the native addon and app from creating competing sessions. It also accepts a session offered by a capable browser through the addon's renderer adapter. Every successful session reaches the real `renderer.xr.setSession()` exactly once. AR retains clear alpha 0; VR uses clear alpha 1; ending either restores desktop background, camera and exhibit transforms.

The camera's FOV and zoom are saved/restored too, because Three.js updates the user camera projection during headset frames. Existing desktop orbit orientation is retained on exit. The sidebar supports optional browser hand target rays as well as controller rays/direct touch, with a pinch required for distant hand activation.

`local-floor`, hand tracking and DOM Overlay are optional. VR does not request real-world hit testing. If floor space is unavailable, the manager uses `local`. The world-space HUD remains the dependable UI when the browser does not grant DOM Overlay. The existing renderer's single `setAnimationLoop` continues to drive both desktop and headset rendering.

## Validation scope

`src/tests/XRVR.test.js` mocks WebXR and a small DOM surface while invoking the actual Three.js VRButton factory. Tests cover one renderer binding, user-gesture callback order, optional feature requests, rejected permission, safe offered-session failure, AR/VR exclusion, independent support and desktop restoration. Existing XR input tests also pass. These are software tests, not physical Quest validation.

Primary references checked on 14 November 2026:

- [Three.js VRButton](https://threejs.org/docs/pages/VRButton.html) — addon import and factory.
- [MDN XRSystem.requestSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession) — distinct immersive modes, optional features, user consent and secure origins.

The installed `node_modules/three/examples/jsm/webxr/VRButton.js` was inspected directly to match the pinned version's lifecycle. Quest 3/3S still needs an actual HTTPS device run to validate granted features, stereo rendering, comfort and performance.
