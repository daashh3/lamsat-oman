# Third-party components and assets

- Three.js 0.181.2 — MIT; https://github.com/mrdoob/three.js/blob/r181/LICENSE
- Vite 7.3.8 — MIT; https://github.com/vitejs/vite/blob/main/LICENSE
- Playwright 1.58.2 — Apache-2.0; https://github.com/microsoft/playwright/blob/main/LICENSE
- Tajawal Regular — SIL Open Font License 1.1. The font and complete license are bundled in `public/assets/fonts/`; source: https://github.com/google/fonts/tree/main/ofl/tajawal
- Omani flag image — official download from Oman's Foreign Ministry: https://www.fm.gov.om/en/ministry/media/downloads/ ; original file https://www.fm.gov.om/wp-content/uploads/Flag_of_OmanMin-of-Info.jpg . It is used on animated 3D cloth with the emblem and colors preserved. No Creative Commons license is asserted for this government image.
- Ten modeling reference JPEGs — supplied by the user, preserved unchanged in `public/assets/reference/`. They are not fetched at runtime or used as substitutes for the modeled objects.
- All geometric carvings, procedural textures and synthesized sounds in this project were generated in code for this experience. No paid assets or copyrighted music downloads were used.
- `public/assets/audio/heritage-ambient.wav` — original two-minute composition synthesized for this project by `scripts/generate-music.mjs`; no third-party music sample or recording is used.

- `public/assets/audio/oman-evening.wav` — new original 96-second stereo instrumental composition generated locally by `scripts/generate-music.mjs`; no recordings, vocals or third-party samples. Replaces the earlier track during playback.

- `public/assets/audio/oud-majlis.wav` — new original 120-second stereo composition synthesized locally: soft oud-like string tones and a warm drone, without recordings, third-party samples, percussion or vocals. Arabic-inspired composition, not a recording of a traditional Omani piece.
