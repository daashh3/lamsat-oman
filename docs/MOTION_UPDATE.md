# Movement tuning

Changes are in the existing `lamsat-oman` project. The PowerShell launcher is unchanged.

- Released tools, the cup and the pot return smoothly to their stored positions and orientations. Grabbing them during a return cancels that animation. Pause, tracking cancellation and chapter changes still restore them immediately and clear ownership.
- Wrist rotation preserves the original hand contact point on the pot, scraper, chisel and fan. Tilting the pot no longer moves its grip away from the hand. Starting an automatic pour cancels any competing return animation.
- Remote engraving/scraping targets the cutting edge. Assisted strokes move the actual edge continuously; there is no point-to-point teleport. Progress still depends on the chapter's contact and movement checks.
- Rope travel is constrained, and progress comes from the visible handle's downward movement. Assisted pulling reverses smoothly, and the boat starts rocking from its neutral pose. Stirring and fanning assistance ease the held tool into position and use its actual movement.
- Shallow pointer rays and invalid poses are ignored. Release/cancel works even when no working-plane intersection exists. Invalid or interrupted hand tracking cannot create an automatic re-grab; the player opens and closes the pinch to resume after cancellation.
- Desktop orbit and zoom sensitivity are reduced while preserving full rotation. Reduced-motion mode retains immediate returns and cup lifting.

## Files changed

| Files | Purpose |
| --- | --- |
| `src/core/ChapterManager.js` | Grip anchoring, smooth returns, precise tools, rope/boat and assisted movement |
| `src/utils/PoseTransitions.js` (new) | Position/quaternion transitions in the existing animation loop |
| `src/app/App.js` | Reliable release/cancel and pointer projection |
| `src/app/DesktopNavigation.js` | Orbit and zoom sensitivity |
| `src/xr/HandTracking.js` | Pose validation and tracking recovery |
| `src/chapters/FrankincenseChapter.js` | Reset scraping direction after interruption |
| `src/tests/Motion.test.js` (new), `ChallengeScene.test.js`, `XRInput.test.js` | Movement regression coverage |
| `scripts/browser-test.mjs` | Allow a released tool to return before picking it up again |
| `README.md`, `docs/GAMIFICATION_UPDATE.md`, `docs/UPDATED_CODE.md` | Current documentation and complete source export |
| `dist/`, `test-results/` | Production build and validation artifacts |

## Verification

122 automated tests and the production build passed. New coverage checks smooth returns at 30/72 Hz, re-grabbing during a return, wrist contact alignment, tool movement limits, constrained rope progress, uninterrupted assisted cooking, competing pot animations, invalid poses and tracking recovery.

The full Microsoft Edge browser journey also passed with no console/page errors: all three engravings, charcoal/scraper/resin, rope pulling, pottery, held mahafa strokes, held cup, overflow and successful retry, all seven stations/five rewards, replay, pause/restart, mobile layouts and GPU resource reset. See `test-results/browser-report.json` and `test-results/unit-report.txt`. Browser gestures use real input events, not injected progress.

No physical Quest headset was available. XR input tests use mocks; physical tracking and comfort still require a headset run. Vite's existing Three.js chunk-size advisory is nonfatal.

## Run

Use the same command as before; no project download or installation is needed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\user\OneDrive\Desktop\LamsatOman_References_Fixed\lamsat-oman\Start-LamsatOman.ps1"
```

If the page is already open, refresh it with Ctrl+F5.
