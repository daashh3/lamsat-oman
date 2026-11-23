# Lamsat Oman — VR, audio and model update

**Previous update report.** The newer challenge/Arabic voiceover implementation and current validation are documented in [GAMIFICATION_UPDATE.md](GAMIFICATION_UPDATE.md).

Completed 14 November 2026 in the existing project. All seven chapters, five earned symbols and the original reference assets remain part of the application. Full HTML, JavaScript and CSS are collected in [UPDATED_CODE.md](UPDATED_CODE.md); the source archive also contains assets, tests and installation files.

## Implemented requirements

| Request | Result |
| --- | --- |
| VR | `renderer.xr.enabled = true`, actual `three/addons/webxr/VRButton.js`, separately detected `immersive-vr`, opaque VR backdrop, existing transparent AR retained. One `renderer.setAnimationLoop` renders desktop and XR. |
| 360 navigation | `OrbitControls` with unrestricted azimuth. Mouse/touch orbit mode and exhibit interaction mode share a visible switch. Right mouse and two fingers can orbit in interaction mode. Portrait and short landscape layouts retain a usable canvas. |
| Continuous music | Bundled original 120-second WAV with continuous looping. Playback begins from a real user gesture; no remote music dependency. |
| Speech | Web Speech API; Arabic voice preferred, default browser voice fallback, refreshed voice list, hover/focus delay and immediate label click speech. No speech queue accumulation. |
| Separate audio controls | Independent music and TTS buttons in the DOM and the XR sidebar. Volume, pause/resume and cleanup are connected. |
| Larger side UI | Larger Arabic menus and instructions on the right, wrapped Arabic canvas text, a scene-anchored XR sidebar. Controllers and optional browser hand rays can point and select the panel; nearby finger touch remains supported. |
| Mubkhar | Rounded base/supports, raised ornament, open liner, charcoal and physically based hammered brass with polished edges and environment reflections. |
| Dallah | Explicit bottom-pivot `THREE.Group`. Click lifts, smoothly tilts, pours, straightens and returns the pot. Manual wrist/slider tilt remains available. The actual transformed outlet, cup alignment and sustained duration determine progress. |
| Clean integration | Modular source, explanatory comments, formatted changed modules, explicit disposal and safe entry failure handling. The existing pinned dependencies are reused. |

The XR sidebar's hand ray is separate from the exhibit's joint-position input, so aiming at a distant menu does not change how the pot or resin is grabbed. Pointing only highlights/reads a distant button; a pinch is required to activate it. XR exit restores the desktop camera transform, field of view and zoom as well as the scene and exhibit.

## Verification

- **72 automated tests passed, 0 failed.** Coverage includes existing gameplay, real geometry and spout transforms, independent audio, voice fallback, denied autoplay, exact base restoration, frame-rate-independent pouring, actual VRButton lifecycle through mocked WebXR, camera projection restoration and hand-ray/direct-touch separation.
- **Production build passed.** Application JS is approximately 212 kB, Three.js 585 kB and CSS 17 kB before compression. Total static output is approximately 11.29 MB, including local references, font, flag and the 5.29 MB music WAV. Vite still reports its nonfatal size advisory for the Three.js bundle.
- **Full production browser journey passed in Microsoft Edge.** Real pointer tracing, drag/drop, rope pulls, pottery controls, stirring/fanning, click-to-pour, five rewards and ten-second replay. No progress injection or chapter skipping.
- **New browser checks passed:** music silent before activation and actually playing afterward; independent mute buttons; speech API calls on hover/click; more than four complete mouse orbits; native one-finger touch orbit; navigation switching; 390 × 844 portrait and 667 × 375 landscape layouts without horizontal overflow.
- **No captured browser page/console errors.** GPU counts returned from the full journey to the same welcome baseline: 22 geometries and 3 textures. This is a regression observation, not a long-duration leak guarantee.

Evidence: [browser-report.json](../test-results/browser-report.json), the screenshots in `test-results/`, and clean welcome previews in `docs/screenshots/`. Reproduce with `npm test` and `npm run test:browser`. Browser speech is intercepted at the API boundary for deterministic checking; actual Arabic voice output was not listened to as part of this test.

**No physical Meta Quest 3 was connected or tested.** The implementation targets WebXR on Quest 3/3S, with runtime capability checks and hand/controller fallbacks. Real stereo rendering, hand aim accuracy, Arabic voice availability, comfort and headset frame rate still need an HTTPS device run. No site was published.

## Run

From the `lamsat-oman` folder, run `npm install` then `npm run dev`. In this workspace dependencies already exist, so `Start-LamsatOman.ps1` can start the app directly. Open the local address printed in the terminal. Do not double-click `index.html` as a file.

For Quest, run `npm run build` and host the **contents of `dist`** at a trusted HTTPS address. Open that address in Meta Quest Browser and select **الدخول إلى VR**. The computer's `localhost` does not point to the computer from inside the headset.

The existing Vite project bundles Three.js locally, so no CDN is needed at runtime. Equivalent pinned CDN library URLs, if needed for a separate import-map setup:

- [Three.js 0.181.2 module](https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.module.js)
- [VRButton addon](https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/webxr/VRButton.js)
- [OrbitControls addon](https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/controls/OrbitControls.js)

These URLs identify the libraries; the supplied project should still be built through Vite. Detailed notes: [VR](VR_UPDATE.md), [audio](AUDIO_UPDATE.md), [models](MODEL_UPDATE.md), [headset acceptance](XR_COMPATIBILITY.md).
