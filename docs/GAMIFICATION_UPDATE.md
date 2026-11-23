# Current project update — direct engraving and instrumental audio

Current audio and door changes supersede this historical report: [effects-only audio and revised door](EFFECTS_AND_DOOR_UPDATE.md). Music is removed from runtime.

Changes were made in the existing `lamsat-oman` project. Use the same `Start-LamsatOman.ps1` command; no download or dependency installation is needed.

Latest refinement: see [VR menu, door proportions and new oud-like music](VR_MENU_UPDATE.md).

## Current behavior

- **Door:** the engraving tool is removed from the scene. Select one of three shape boxes, then press and drag directly over the highlighted stone-panel outline. In XR, pinch and trace with the hand or hold the controller trigger and trace with its ray. Hover alone does not carve, and release/pause stops tracing. All three shapes are still required. Hold-to-trace assistance uses the same ordered progress checks.
- **Dimensions:** selectable boxes are now 18 × 15 cm, spaced 20.5 cm apart. The door is now about 70.9 × 97.4 cm. Visible upper inlays are about 16.7 × 17.1 cm, with the lower inlay about 16.7 × 12.6 cm; square/star proportions remain undistorted. Patterns and the current-point marker are larger, with about a 2 cm visible contact tolerance. Each pattern remains inside its own hinged panel with clearance from the door seam.
- **Speech:** all automatic commentary and requested TTS output are removed. There is no speech on entering a station, completing a challenge, clicking or hovering over text. The screen and fixed XR menu no longer expose a reading button. Instructions and challenge feedback remain written.
- **Small side objects:** the amber resin charm, water/aflaj keepsake and khanjar are removed together with their discovery counter, journal and fact card. The actual frankincense resin used in the incense challenge and other required activity objects remain.
- **Music:** the former track is replaced by the original 120-second stereo instrumental **Oud Majlis**, with soft oud-like plucks, Arabic modal intervals, slow rests and a warm drone. It starts on interaction, loops, and supports mute/volume. There are no recordings or vocals. Its new filename avoids reusing the browser's cached previous track.
- **Other activities:** tree scraping, charcoal, incense placement, rope pulling, pottery decoration, held mahafa, held cup and the smooth base-pivot dallah remain available.

## Changed files

- Scene/gameplay: `src/core/ChapterManager.js`, `src/chapters/GateChapter.js`, `src/chapters/EngravingPatterns.js`, `src/objects/OmaniGate.js`.
- Application/menus: `src/app/App.js`, `src/app/Config.js`, `src/ui/UIManager.js`, `src/ui/HUD.js`.
- Audio: `src/audio/AudioManager.js`, `scripts/generate-music.mjs`, new `public/assets/audio/oman-evening.wav`, and the audio README.
- Tests: `AudioManager`, `ChapterFlow`, `ChallengeScene`, `DoorSlots`, `Motion`, `HUDInput`, `helpers` under `src/tests/`, plus `scripts/browser-test.mjs`.
- Documentation/output: `README.md`, `THIRD_PARTY_NOTICES.md`, this report, `scripts/export-code.mjs`, regenerated `docs/UPDATED_CODE.md`, `dist/` and test reports/screenshots.

The previous standalone narration, trivia and chisel modules remain unused in source for compatibility; they are no longer imported by the application and do not enter the production module graph. Their earlier documentation describes historical features. The current instructions are this report and the README.

## Validation

129 automated tests and the production build passed. Tests cover direct tracing, selection and interruption, panel bounds, no speech calls through the live audio manager or HUD, stereo music format, and the retained activities and mocked XR input.

The full Microsoft Edge browser journey passed with no console/page errors and **zero speech calls**: all three direct engravings, absent tool/discovery controls, new music playback and mute, the seven stations/five rewards, overfill/retry, replay, pause/restart/exit, resource reset and portrait/landscape layouts. The door screenshot was visually checked for panel/shape fit and clear space around the exhibit. A production-bundle check also confirmed the removed speech, keepsake and chisel modules are absent. Current browser results are in `test-results/browser-report.json`; unit output is in `test-results/unit-report.txt`.

The music file is 22,050 Hz, 16-bit stereo PCM, 120 seconds long, with no clipping. Vite's existing large Three.js chunk advisory is nonfatal. No physical Meta Quest headset was available, and no site was published.

## Running

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\user\OneDrive\Desktop\LamsatOman_References_Fixed\lamsat-oman\Start-LamsatOman.ps1"
```

Refresh an already-open page with Ctrl+F5. Keep the local server terminal open while playing. Work on this computer cannot continue while it is powered off or asleep; the saved files remain on disk.
