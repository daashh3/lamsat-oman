# Mubkhar and dallah update

Current challenge integration: [GAMIFICATION_UPDATE.md](GAMIFICATION_UPDATE.md). The burner starts with cold coal and exposes `setLit(bool)` / `updateEmbers(time)`. The game passes `{manualStop:true}` to the dallah animator and calls `stop()` for a smooth player-controlled return; it can therefore overflow. The original finite timing below remains the standalone animator default.

The supplied incense render and blueprint were re-inspected for this update. The burner retains its four-column support, stepped base, flared four-sided bowl and scalloped upper rim. New rounded plinth/support geometry, turned column collars, bevelled wall thickness, rolled rims, raised borders and ornament following the sloped surface make reflections and the silhouette more legible. The liner remains open and separate from the outer brass, and the charcoal uses irregular faceted pieces.

Its `MeshStandardMaterial` brass now uses metalness `.88`, roughness `.38`, a subtle deterministic hammered bump/roughness texture, and environment reflection intensity `1.1`. More polished rim/edge material uses roughness `.22`; darker recessed ornament uses `.43`. These surfaces use the app's existing PMREM environment lighting. No downloaded material maps or new external library are required. Geometry remains a reference-inspired procedural approximation.

Existing scene contracts are unchanged: `createMabkhara()` returns `userData.bowlCenter = (0,.47,0)`, `bowlRadius=.12`, `charcoal[]`, and `bowl`. The actual gameplay radius remains the chapter's existing `.115` m tolerance.

The coffee pot is explicitly a bottom-pivot `THREE.Group`: `set.userData.dallah` and `dallahPivot` identify the same group, and `baseMarker` sits at its local `(0,0,0)`. Vessel geometry is above that base plane. The spout remains a direct child at `(.16,.24,0)`, preserving existing hand/drag interaction and liquid alignment checks. Warm brass reflections are moderated with roughness `.30` and metalness `.88`.

## Click-to-pour integration

```js
import { DallahPourAnimator } from './objects/DallahPourAnimator.js';

const { dallah, spout, cupCenter } = coffeeSet.userData;
const pour = new DallahPourAnimator(dallah, { spout, cupPosition: cupCenter });

// User click / XR button: stop any manual ownership first.
pour.start();

// Inside the existing renderer.setAnimationLoop, while gameplay is not paused:
pour.update(deltaSeconds);

// Before a manual grab, retain the current physical pose:
pour.cancel({ restore: false });

// Chapter reset/dispose: restore the original base pose.
pour.cancel();
```

`cupPosition` is in the pot's parent's coordinates. The phase sequence is lift (0.7 s), tilt (0.8 s), pour (3.2 s), untilt (0.8 s), return (0.7 s). Smoothstep easing and quaternion slerp avoid rotation snaps; the base stays stationary during tilting, so the spout describes a natural arc. During the hold, the actual outlet is `.16` m above the cup center. Arbitrary valid frame steps consume phase boundaries consistently.

The animator only moves geometry: it does not increment gameplay progress. Treat `pour.active` as animation ownership when running the existing transformed-spout/angle tests and accumulate the same 2.8-second valid fill as manual pouring. Do not gate fill solely by `isPouring`, because the geometry is authoritative. Additional clicks while active return `false` and do not restart or queue overlapping animations. The standalone animator can freeze by stopping `update`; this application's pause action instead cancels/restores the pot to release held interactions safely. Resume and click pour again to continue filling; valid fill already earned is retained.

Validation: `src/tests/DallahPourAnimator.test.js` checks base placement, no start teleport, fixed pivot during tilt, real transformed spout alignment under a rotated parent, sustained hold, 30/72 Hz equivalence, duplicate clicks, interruption/reset and the burner material/drop contract. Headset hardware behavior remains unverified until tested on a real Quest.
