# Interaction sounds and revised door

Implemented in the same `lamsat-oman` project. The existing PowerShell launcher is unchanged.

- Removed background music and periodic ambient audio. No audio file or media player is created. The previous WAV files remain unused in the source assets.
- Added short, distinct material sounds for selecting a shape, engraving stone, scraping bark, lighting coal, handling resin, pulling rope, pottery, cooking, fanning and pouring. The door opening sounds once when all three engravings are complete. Pouring and stirring sounds depend on valid active interaction.
- Added **كتم المؤثرات / تشغيل المؤثرات** to the screen and fixed XR board. Volume still works. Mute, pause, reset and dispose immediately stop active effects; skipped sounds are never queued for later playback. Sounds are throttled and limited to eight simultaneous voices. No commentary or TTS is restored.
- Rebuilt the door at its final proportions (about 71 × 97 cm), with joined timber posts/lintel, a closed arched timber transom, deeper jambs and threshold, muted aged-metal trim, mirrored panels and matching handles beside the center seam. Hinges rotate rigid leaves without stretching them. Direct engraving on the three fitted stone panels and the three shape boxes are preserved.

## Files changed

- `src/audio/AudioManager.js`: effects-only Web Audio engine.
- `src/core/ChapterManager.js`: sounds attached to actual accepted interactions and door opening.
- `src/app/App.js`, `src/ui/UIManager.js`, `src/ui/HUD.js`: effects controls and sound lifecycle.
- `src/objects/OmaniGate.js`: revised construction, materials and hinges.
- Tests: `AudioManager`, `ChallengeScene`, `CraftDecoration`, `HUDInput`, `HUDLayout`, plus `scripts/browser-test.mjs`.
- Documentation/output: README, audio asset notes, this report, historical report pointers, complete code export, production build and test artifacts.

## Verification

129 automated tests and the production build passed. Tests cover finite sound buffers, distinct material textures, throttling/voice limits, no idle/media/speech output, native-context failure recovery, mute/pause/reset cleanup, direct engraving and rigid door geometry. The complete seven-station browser journey passed with 220 native audio starts from interactions, no music requests, silence while idle, and no browser errors (`test-results/browser-report.json`). The XR layout check also passed with real Arabic fonts, fixed depth-correct panels and no duplicate DOM menus (`test-results/xr-ui-report.json`).

No physical Meta Quest headset was connected. The existing Three.js bundle-size advisory remains nonfatal.

## Run

Use the same `Start-LamsatOman.ps1` command and refresh the open page with Ctrl+F5. No download or installation is required.
