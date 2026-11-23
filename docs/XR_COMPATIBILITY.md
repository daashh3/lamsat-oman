# WebXR compatibility and validation

The code targets Meta Quest 3 / Quest 3S Browser with Three.js. No physical headset run, hand-tracking accuracy measurement or 72 FPS claim has been made. Browser availability and permissions are detected at runtime. External API documentation was checked on 14 November 2026; local implementation notes were updated on 21 November 2026.

| Capability | Implementation | Fallback / actual validation |
| --- | --- | --- |
| `immersive-ar` | `isSessionSupported` followed by a user-activated `requestSession`; transparent clear alpha and no scene background | Full desktop experience; physical passthrough unverified |
| `immersive-vr` | Actual Three.js VRButton, independent support check, opaque background, shared session lifecycle | Desktop fallback; actual stereo headset run unverified |
| Sidebar hand aiming | Optional `targetRaySpace` pose supplied as `uiRay`; pointing highlights/reads and pinch activates | Direct fingertip touch or controller select; hand ray never replaces exhibit joint positions |
| Fixed reading menu | World-space lectern parented to exhibit content, with backing board and feet; no per-frame head following | Unit test verifies stable world transform during viewer movement; physical reading comfort still needs headset testing |
| Hand input | Optional `hand-tracking`, actual `XRInputSource.hand` and `XRFrame.getJointPose` for both hands | Controller ray/select or desktop; real hands unverified |
| Hand rendering | Three.js `getHand` + procedural sphere profile; no downloaded hand model | Pass-through hands remain visible when tracking disappears |
| Pinch | 22 mm enter / 34 mm release hysteresis, frame-rate independent smoothing, exclusive-grab support | Open fingers to re-arm after tracking loss; no fake hand test |
| Touch | Index tip against bounded local regions; entry-edge debounce | Mouse / controller ray |
| Two hands | Both hands' wrist, palm estimate, index, thumb, middle and wrist orientation exposed to the chapter bridge; cup and pot have independent owners | Desktop cup latch and manual/animated pot controls; simulated two-hand regression passes |
| Placement | One stable placement from the actual viewer pose; optional horizontal hit-test source; normal and reach checks | `local-floor`, then `local`; viewer-relative placement after a short search |
| Recenter | Cancels active input and places the exhibit relative to the current headset | Does not move or rotate the viewer's camera |
| DOM overlay | Optional descriptor and actual `session.domOverlayState` check | Application's Arabic canvas-text world HUD |
| Face / mouth tracking | No invented descriptor, camera request or microphone request | Holding and waving the modeled mahafa is the cooking mechanic |
| Visibility / session end | Cancel held input, restore desktop scene/camera, dispose hit source and controller ray resources | Gameplay state stays in the shared experience manager |

The placement helper interprets a detected horizontal surface as the exhibition anchor and raises the small exhibit toward comfortable reach. It clamps height relative to the viewer. It is not collision avoidance, room reconstruction, a persistent anchor, or an assurance that the real space is clear. Models never chase the user's head after being placed. Recenter and seated/reach settings let the user choose a different placement.

## Input bridge

`XRManager({ renderer, scene, camera, content, overlay, onStatus, onInput, onSession })` exposes `checkSupport()`, `enter()`, `exit()`, `recenter()`, `setComfort({seated,distance,heightOffset})`, `update(frame,dt)`, `active`, `domOverlay`, and `hands`.

It also exposes `checkVRSupport()`, `enterVR()` and `mode`. Both modes restore the desktop camera transform, FOV and zoom when ending. See [VR_UPDATE.md](VR_UPDATE.md). Hand events may include `uiRay`, used only by the scene sidebar; a ray hover cannot activate a control without pinching. The shared renderer uses one `setAnimationLoop` in both modes.

`XRManager` retains an optional `onViewerPose(transform)` callback, but the app does not connect it to the HUD. The menu stays at a fixed transform beside the exhibit: content-local position `(0.92, 0.5, 0)` and yaw `-0.4` radians. It moves only with explicit exhibit placement/recentering. A solid backing board and base make this a reading lectern within the scene. Hidden keepsakes and challenge actions also accept actual controller rays; see [GAMIFICATION_UPDATE.md](GAMIFICATION_UPDATE.md).

`onInput` supplies `{type:'pointer',id,phase,position,quaternion,pinching,source,dt}`. `phase` is `start`, `move`, `end`, `cancel` or `hover`. Hand hover uses the index tip; a pinch uses the index/thumb midpoint. Positions are Three.js `Vector3` in the renderer reference space. Controller events also include a world-space `Ray`; project it into the same chapter surface used by desktop dragging. The app calls `content.worldToLocal()` before the chapter's local collision tests.

`hands` contains the currently tracked hands with `id`, `handedness`, `wrist`, `palm` (middle metacarpal estimate), `thumb`, `index`, `middle`, `quaternion`, `pinching`, and `tracked`. The application uses their separation and vertical movement for pottery. On hand loss, a held object is cancelled after 160 ms; progress already earned belongs to the chapter, not the hand. Opening the pinch is required before a new grab.

For coffee, hold the fenjan with one hand/controller and the dallah with the other. Wrist rotation tilts the pot around its base pivot; filling uses the real transformed outlet and moving cup-mouth marker. Releasing the cup interrupts flow and settling. For incense, scrape the pale bark patch with a held pinch/select before picking up the revealed resin. For halwa, the mahafa must have an active owner before fire-fanning strokes count. Pottery shaping is followed by three separate decoration touches/selections.

Mark desktop-only environmental meshes with `object.userData.xrDesktopOnly = true`. They are hidden only during XR and restored on exit. The renderer must be constructed with `{alpha:true}`. Use one `renderer.setAnimationLoop((time,frame)=>...)`; never introduce an extra animation loop for XR.

## Primary references

- [Meta: WebXR Hands](https://developers.meta.com/vr/documentation/web/webxr-hands) — joint input and hand/controller behavior; palm-at-eye-level pinch is reserved for the system.
- [Meta: Mixed Reality support](https://developers.meta.com/vr/documentation/web/webxr-mixed-reality) — `immersive-ar`, support detection and transparent passthrough rendering.
- [Meta: Browser specifications](https://developers.meta.com/vr/documentation/web/browser-specs) — runtime feature detection instead of user-agent assumptions.
- [MDN: requestSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession) — optional features, secure context and user activation.
- [MDN: getJointPose](https://developer.mozilla.org/en-US/docs/Web/API/XRFrame/getJointPose) — joint poses may be unavailable; real input must be queried each frame.
- [MDN: requestHitTestSource](https://developer.mozilla.org/en-US/docs/Web/API/XRSession/requestHitTestSource) — optional feature and API checks; cancel source on end.
- [MDN: enabledFeatures](https://developer.mozilla.org/en-US/docs/Web/API/XRSession/enabledFeatures) — granted features can differ from the requested list.

No documented interoperable WebXR mouth-open input suitable for this target was identified in the checked sources. This is a reason to use fanning, not a claim that every proprietary future face API is impossible. Any future face adapter should be implemented only against an identified device API and tested with its required permissions.

## Quest acceptance pass still required

Open a trusted HTTPS deployment in Meta Quest Browser; the computer's `localhost` is not the headset's `localhost`. Verify enter/deny/exit/reenter, placement while seated and standing, fixed-menu readability when looking away and back, recenter after moving, tree scraping, stone tracing, each pottery decoration, mahafa pickup and fanning, and simultaneous cup/pot holding and wrist tilt. Also test each hand missing, controller fallback, DOM overlay granted/absent, pause during a held object, system menu interruption, dropped-object recovery, 0–5 rewards, and two complete replays. Inspect real frame timing and GPU memory on the headset before calling the 72 FPS target met.
