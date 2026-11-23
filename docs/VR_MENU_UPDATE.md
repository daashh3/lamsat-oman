# VR reading board, door proportions and new music

Current audio and door changes supersede this historical report: [effects-only audio and revised door](EFFECTS_AND_DOOR_UPDATE.md). Music is removed from runtime.

Implemented in the existing project; the PowerShell startup command is unchanged.

- Replaced the music completely with **Oud Majlis**, an original two-minute stereo composition: soft oud-like plucked strings, Arabic modal intervals, warm drone and slow phrases with rests. No percussion, bright bells or vocals. This is Arabic-inspired original music, not a recording of a traditional Omani song.
- Resized the door architecture to approximately **70.9 cm wide × 97.4 cm tall**. The three selection boxes retain their usable size. A separate uniform transform on each stone panel preserves square/star proportions; tracing and carving particles follow the actual transformed surface, including its hinge.
- The XR board is about **69 × 97 cm**, with **29.5 × 9 cm** buttons separated by clear gaps. The main text, optional story and controls occupy distinct rectangles. Font wrapping is recomputed at its fitted size and tested using the actual bundled Arabic font.
- The board is placed once beside the exhibit, about **1.25 metres** from the initial viewer in the default layout, facing that location. Placement checks sight lines past the exhibit and moves the board sideways if obstructed. It remains fixed when the head moves; explicit recenter places it again.
- XR uses this single 3D board. The desktop DOM menus are hidden during immersive sessions. Text respects depth and is readable from the front; controls behind solid exhibits cannot be activated through them.
- Chapter-specific buttons select door templates, ignite coal, decorate pottery and manage pouring. Completed actions and pouring without a held cup are disabled. Pause/resume, music, recenter, restart and exit remain available. A fingertip resting on a button cannot repeatedly activate it after release.
- Speech/TTS and small side keepsakes remain removed.

## Files

`src/ui/HUD.js`, `src/ui/ArabicText.js`, `src/ui/styles.css`, `src/app/App.js`, `src/core/ChapterManager.js`, `src/objects/OmaniGate.js`, `src/audio/AudioManager.js`, `scripts/generate-music.mjs`, new `public/assets/audio/oud-majlis.wav`.

Validation: new `src/tests/HUDLayout.test.js`, updated `ChallengeScene`, `CraftDecoration`, `AudioManager` tests, new `scripts/xr-ui-test.mjs`, and updated `scripts/browser-test.mjs`. README, audio asset notes, notices, current reports, complete source export and production output were refreshed.

## Verification

129 automated tests, the production build and the full desktop browser journey passed. A separate real-WebGL rendering check covers Arabic text bounds, eight-button chapter layouts and removal of duplicate DOM menus; the rendered gate/coffee boards were visually reviewed. Regression tests check all visible label/button corners against the actual taller door so it cannot obscure the initial board placement.

See `test-results/unit-report.txt`, `browser-report.json`, `xr-ui-report.json`, `xr-menu-gate.png` and `xr-menu-coffee.png`. The music WAV header, stereo format, two-minute duration, loop boundary and clipping were checked. The existing Three.js build-size advisory is nonfatal.

**No physical Quest headset was connected.** These checks validate code, geometry, spatial input and rendered UI; headset comfort, tracking accuracy and real stereo output still need a device run. No site was published.

Run the existing `Start-LamsatOman.ps1` command and refresh with Ctrl+F5. No download or reinstall is needed.
