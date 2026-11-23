# Lamsat Oman — delivery report

**Historical initial-delivery report.** The subsequent VR, audio, interface and model update supersedes the audio, control and test-count details below. See [UPDATE_REPORT.md](UPDATE_REPORT.md) for the current implementation and verification, and [UPDATED_CODE.md](UPDATED_CODE.md) for full source code blocks.

Date: 14 November 2026. This is a complete local source project and a built static application. It has not been published, and no physical Meta Quest device was connected for testing.

## Location and deliverables

Project: `C:\Users\user\OneDrive\Desktop\LamsatOman_References_Fixed\lamsat-oman`

Production output: `lamsat-oman/dist/`. Full instructions: `README.md`. Reference geometry decisions: `docs/MODELING.md`. XR implementation, sources and remaining headset checks: `docs/XR_COMPATIBILITY.md`. Browser evidence and screenshots: `test-results/browser-report.json` and `test-results/01-welcome.png` through `09-mobile.png`.

The ten original references remain unchanged in the original `ReferenceImages` directory and are copied into `public/assets/reference`. No unrelated files were removed and no paid assets were installed.

## Implemented experience

| Station | Actual geometry and behavior | Completion condition |
| --- | --- | --- |
| Gate / introduction | Carved rectangular wood frame, pointed arch, raised rosettes and stars, instanced studs, ring knockers, turquoise border, two independently hinged leaves. Ordered glowing trace with resumable progress; doors swing open with warm light and gold particles. | All ordered trace points reached. **No collectible.** |
| Frankincense | Golden flared open mabkhara, four supports, raised base and ornament, charcoal, branching resin tree. Exclusive pinch/mouse grab, object follow, bounded bowl drop, reset on invalid release; charcoal glow and finite fading smoke. | Resin released in the actual bowl zone. **Symbol 1.** |
| Dhow | Custom curved hull mesh, deck, two masts, deformable lateen sail, rigging, rails, barrels, model stand and animated Omani flag. A selected handle follows downward pulls; sail deploys progressively. Completed ship rocks with water effects and sea ambience. | 48 cm accumulated downward pull, with discontinuous large jumps rejected. **Symbol 2.** |
| Nizwa and pottery | Tapered sandstone fort, crenellations, slit/arched windows, entrance, stone details; potter's wheel, clay ball, radial vase and kiln. Clay drop starts wheel; hand separation/vertical lift or desktop controls deform the vase profile. A one-hand/controller fallback also sculpts by dragging the vase. Decoration appears and the vase moves into the lit kiln. | Valid clay placement, target height/width held for 1.2 seconds, then 2.4-second firing. **Symbol 3.** |
| Halwa | Copper/brass cauldron, wood fire, separate ingredient containers and pieces, stirring stick, swirling mixture and ornamented serving bowl. Ingredient collision checks, angular motion integration, alternating fan detector, steam and color change. | Sugar → saffron → nuts, at least three meaningful circular turns, then six broad alternating fan strokes. **Symbol 4.** |
| Coffee | Decorative tray, full lathed dallah with handle, rising spout, cups and halwa bowl. Pot follows a grab, wrist/slider tilt rotates it, spout position is transformed through the scene, liquid stream joins spout to cup and fill height rises. | Spout horizontally aligned within 4.5 cm of target cup, above its rim and within reach, tilt 0.6–1.6 radians, sustained valid pouring for 2.8 seconds. **Symbol 5.** |
| Finale | Ornate volumetric golden lantern, patterned panels, turquoise elements, warm light, five orbiting 3D symbols, animated official flag and pooled gold confetti. Arabic congratulations and touch-to-replay. | Lantern touch starts a real ten-second countdown; all progress, objects, effects and timers reset to welcome. **No extra collectible.** |

The state machine includes BOOT, COMPATIBILITY_CHECK, READY, XR_ENTERING, PLACEMENT, all seven chapter states, RESETTING and ERROR. Sequential transition rules prevent accidental chapter skipping. Collectibles belong to the five activities, are awarded once and remain consistent across chapter restarts. Pause interrupts gesture continuity and stops gameplay time; page visibility changes pause the experience. Exiting a headset session returns to desktop while retaining the current chapter; the explicit experience-exit button resets the journey.

## Interface, input and comfort

- Arabic RTL welcome, help, settings, contextual instructions, progress bar, five-symbol collection and optional narration text.
- Desktop left-drag interaction, right-drag/two-finger orbit, pottery/coffee sliders, Space pause, R recenter, arrow-key tilt and accessible click/hold controls.
- True WebXR articulated hands using `XRFrame.getJointPose` for wrist, estimated palm, thumb tip, index tip and middle tip. Both hands are supported; pinch start/hold/release use hysteresis and smoothed positions.
- Exclusive object ownership, tracked object follow, precise chapter-local cylinders/boxes/path tolerances, cancel on tracking loss, invalid-drop recovery and re-arming after fingers reopen.
- Two-hand pottery profile shaping and one-hand/controller drag fallback. Fanning uses measured alternating motion; no microphone, camera or invented mouth API is requested.
- Controller ray/select inputs use the same scene adapter as desktop. Controller orientation can tilt the coffee pot.
- Stable viewer-relative placement, optional horizontal hit-test, `local-floor` then `local` reference-space fallback, recenter, seated comfort and reduced motion. No locomotion or forced XR camera movement.
- Optional DOM Overlay plus a separate Arabic world-space instruction/narration HUD with real touch/ray pause, recenter, restart, exit and audio controls.

## Audio, effects and resources

Web Audio unlocks from a user gesture. Original oscillator/noise sounds cover carving, ingredient drops, burning/pouring, sail interaction and celebration; quiet synthesized notes and sea noise provide ambience. Interaction sources use HRTF PannerNodes with the listener following the real desktop/XR camera. Mute, volume, pause and resume are connected. Arabic speech synthesis is used only when an installed Arabic voice is available. Otherwise subtitles remain. Recorded files are supported through a registration API, but **no prerecorded narration or soundtrack is bundled**.

Effects share a bounded 220-slot particle pool. Smoke/steam emit briefly and fade; water, confetti, fire, sail, flag, vase and light animations use the renderer's single delta-time WebXR loop. Repeated decorative geometry is instanced or batched, small material maps are shared inside each model, and scene changes dispose geometries/materials/textures. Automatic desktop resolution reduction and XR foveation adjustment provide quality fallbacks. WebGL context-loss events pause interaction and support recovery/restart.

## Reference modeling and fidelity

All ten JPEGs were inspected as five render/blueprint pairs before model construction. The internal specification records their units, contradictory labels and display scaling. The gate uses 3.2:3 proportions at .84 m display height; the mabkhara uses the 600/350/250 mm references; the dhow is 1.08 m long with a proportionate curved hull; the fort preserves its tapered 7:5 proportions; pottery uses changing radial profiles and raised bands. The auxiliary tree, kiln, cooking, coffee and lantern objects share the same materials and ornament vocabulary.

These are **procedural artistic approximations**, not photogrammetry, exact historical reconstructions or professionally sculpted replicas. Fine floral carving is simplified, the dhow's sail height is adjusted to preserve the rendered silhouette, and fort windows use inset geometry rather than Boolean wall openings. The official flag image was downloaded from the Oman Foreign Ministry and applied to deformable cloth, preserving the emblem instead of using the simplified emblem in the reference illustration. See `MODELING.md` and `THIRD_PARTY_NOTICES.md` for provenance.

## Verification results

| Check | Result and scope |
| --- | --- |
| Dependency installation | Pinned npm lockfile created. Three.js 0.181.2, Vite 7.3.8, Playwright 1.58.2; patched esbuild 0.28.2. |
| Dependency audit | **0 reported vulnerabilities** after compatible patches. This is the package audit result, not a security certification. |
| Production build | **Passed** with Vite 7.3.8 and Node 24.22.1 on Windows. Three.js chunk ~585 kB uncompressed / 153 kB gzip; application JS ~185 kB / 58 kB gzip; CSS ~10.4 kB. Total output ~5.96 MB including all ten reference JPEGs. |
| Build diagnostics | A nonfatal Vite chunk-size advisory remains for the shared Three.js engine bundle. No build errors or unresolved assets. |
| Automated tests | **47 passed, 0 failed**: state machine, five-reward mapping, duplicate prevention, wrong drops, ordered tracing, gesture discontinuities, shape/firing/pour gates, reset/pause, finite volumetric models, actual hinged/sail/vase/spout transforms, bounded effects, one-hand scene integration and mocked XR lifecycle/placement/tracking. |
| Production browser playthrough | **Passed** in headless Microsoft Edge at 1366 × 900. Actual mouse tracing, resin/clay/ingredient drags, rope pulls, circular stirring and fanning; actual keyboard pottery sliders; accessible coffee movement and tilt controls; lantern touch and timed replay. No direct completion or progress injection. |
| Browser UI/lifecycle | Help, pause/resume, current-chapter restart, explicit exit and 390 × 844 layout checked. No page/console errors in the passing run; no horizontal mobile overflow. A boot ID ensures no reload silently substitutes for replay. |
| Resource reset | Browser renderer counts returned to the welcome baseline: **22 geometries and 3 textures**. This is an observed one-cycle regression check, not a proof of all long-session leak behavior. |
| Desktop scene budgets | Captured exhibit snapshots were approximately **18–52 draw calls** and **12k–82k triangles**. These are desktop renderer counters, not Quest performance measurements. |
| Headset hardware | **Not tested.** Connected-device discovery returned no devices. Hand accuracy, real passthrough, granted optional features, comfort and stable 72 FPS require a real Quest 3/3S acceptance pass. |

The repeatable browser test and JSON report are the detailed evidence. Automated XR mocks validate code paths, not real browser/device support. No synthetic input test is described as a real hand test.

## Compatibility and remaining limits

`immersive-ar` support is detected before entry. Hand tracking, hit-test and DOM overlay are optional session features; their granted/runtime availability is checked. The desktop journey remains fully playable without XR. Placement does not reconstruct the room or guarantee the absence of real obstacles. Face tracking is deliberately unavailable; the supported interaction is fanning. No microphone or camera permissions are requested.

No real Arabic recorded voice is included; installed browser voices vary. Art is a stylized procedural museum approximation. Experience duration depends on the visitor: the intended exploratory pacing is 7–10 minutes, while a practiced or assisted run can be shorter. No forced minimum duration was added. Runtime progress is in memory and is reset on a page reload. Thumbstick locomotion, teleportation and persistent spatial anchors are not included because this is a stationary exhibit.

## HTTPS deployment and Quest launch

Use the exact steps in the root README: build, upload `dist` to a trusted HTTPS static host, open that URL in Meta Quest Browser, choose mixed reality and allow the XR session. The PC's `localhost` is not the Quest's localhost. An untrusted LAN HTTP address does not satisfy immersive WebXR's secure-origin requirement. Manual static deployment is documented with primary [Netlify](https://docs.netlify.com/deploy/create-deploys/) and [Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/) references.

No site was automatically deployed, no hosting account was created, and no hardware validation is claimed. The application source, compiled output, tests, reference specifications, asset notices and deployment instructions are supplied locally.
