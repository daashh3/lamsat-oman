# لمسة عُمان — Lamsat Oman

تجربة تراث عُماني تفاعلية بثلاثة أبعاد، تتضمن سبع محطات وخمس قطع تراثية تُكتسب باللعب. تدعم WebXR للواقع الافتراضي والمختلط، والتدوير ٣٦٠° بالفأرة واللمس، ومؤثرات تفاعلية فقط دون موسيقى أو تعليق صوتي.

مصدر المشروع على [GitHub](https://github.com/daashh3/lamsat-oman)، وعنوان GitHub Pages هو [لمسة عُمان](https://daashh3.github.io/lamsat-oman/). للنشر والتشغيل من النظارة والكمبيوتر مطفأ، اتبع [دليل النشر وتغليف تطبيق Quest](quest/README.md). إعداد التخزين للعمل بلا إنترنت جاهز؛ بناء APK ما زال يحتاج مفتاح التوقيع وربط النطاق.

الكود الكامل في كتل قابلة للنسخ: [UPDATED_CODE.md](docs/UPDATED_CODE.md). تفاصيل التحديات: [GAMIFICATION_UPDATE.md](docs/GAMIFICATION_UPDATE.md). عدّل الرسائل المكتوبة والحقائق العربية في [ArabicScripts.js](src/audio/ArabicScripts.js).

تحديث ٢١ نوفمبر ٢٠٢٦: قائمة VR مثبتة على لوحة بجانب المعرض، مع تحدّي إشعال الفحم وكشط الشجرة ووضع اللبان، ونقش الحجر وتزيين الفخار. أصبحت الشجرة والقلعة أكبر، ويلزم حمل الفنجان أثناء السكب وإمساك المهفّة عند تأجيج نار الحلوى.

## التشغيل السريع

يتطلب المشروع Node.js 22.12 أو أحدث مع npm.

```sh
npm install
npm run dev
```

افتح العنوان الذي يعرضه Vite، ثم اختر **ابدأ الرحلة** للعب على الشاشة. `npm run build` ينشئ النسخة النهائية في `dist`، و`npm run preview` يعرضها محلياً. لا تفتح `index.html` مباشرة بصيغة `file://`.

In the supplied workspace, dependencies are already installed. If this environment exposes Node without npm, the equivalent local commands are:

```sh
node node_modules/vite/bin/vite.js
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js preview
node --test src/tests/*.test.js
```

## Play the complete journey

| Chapter | Desktop control | Hand/controller interaction | Reward |
| --- | --- | --- | --- |
| Door engraving | Select a star, square or generated polygon, then press and drag directly along the highlighted outline. No tool is needed. Complete all three patterns to open the gate. | Select a box, then pinch and trace with your hand, or hold the controller trigger while tracing. | Introduction only |
| Frankincense | Click the burner to ignite charcoal. Pick up the dedicated scraper beside the tree and move its blade up/down over the pale bark for four continuous alternating strokes; then drag the harvested resin into the burner. Smoke starts only after the resin is placed. | Select/touch the burner, hold the scraper and work its tip over the marked bark, then grab and drop resin onto the coal. | 1/5 |
| Dhow | Grab the turquoise rope ring and pull down. Release and repeat if necessary. | Pinch and make downward pulls totaling 48 cm. | 2/5 |
| Pottery | Drag clay onto the wheel. Match the gold silhouette using height about 30 cm and diameter about 20 cm. Click the three marked decoration bands, or their assist buttons, before firing. | Shape with both hands, or drag the vase upward/inward with one hand/controller. Touch/select each of the three decoration bands. | 3/5 |
| Halwa | Drag sugar, saffron and nuts into the pot in order. Grab the stick and stir in circles. Then grab the woven **مهفّة** and drag it left/right in front of the fire. | Pinch ingredients; make three continuous stirring turns; hold the mahafa for six broad alternating fan strokes. Empty-hand waving does not count. | 4/5 |
| Coffee | Click the cup or **حمل الفنجان أولاً** to hold it. Click the pot or **ابدأ السكب**, then select **أوقف السكب** around 60–70%. Final fill must settle within 60–80%. Overflow empties the cup for retry; pick it up again. Manual grab/slider/arrow tilt remains available. | Hold the cup in one hand/controller and the dallah in the other; move the outlet over the held cup and tilt the wrist. The cup must remain held through settling. Start/stop HUD controls also require a held cup. | 5/5 |
| Finale | Click the lantern. A ten-second countdown returns to the welcome screen. | Touch the lantern core or controller select. | Celebration only |

Open **أدوات المساعدة والتحكم** for accessible controls. These move the real objects and submit the same validated samples as physical gestures; they do not award completion directly. Select **وضع التدوير ٣٦٠°** to orbit using left mouse drag or one finger; select **وضع التفاعل** to grab the exhibits. Right-drag and two-finger orbit remain available in interaction mode. Space pauses and R recenters. Pause, chapter restart, volume, subtitles, reduced motion, seated placement, quality and exit are available. Progress stays in the current page; reloading starts a new journey.

Music and all speech output are removed. Audio is now limited to short interaction effects: stone engraving, bark scraping, coal ignition, rope creaking, pottery contact, stirring/fanning, cup contact, coffee pouring and the wooden door opening. **كتم المؤثرات** toggles them on the screen and fixed XR board; volume remains available. Idle scenes stay silent. Instructions and challenge feedback remain written.

The three small side keepsakes (resin charm, water/aflaj object and khanjar) and their discovery journal have been removed. The five main chapter rewards and required activity objects remain.

## HTTPS and Meta Quest 3 / 3S

1. Run `npm run build`.
2. Upload **the contents of `dist`**, including `index.html` and `assets`, to an HTTPS static host. For example, Netlify's manual deployment accepts a built output folder at [Netlify Drop](https://app.netlify.com/drop); see [Netlify's deployment documentation](https://docs.netlify.com/deploy/create-deploys/). Cloudflare [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) is another option.
3. Open the resulting trusted **HTTPS URL** in Meta Quest Browser on the headset and enable hand tracking. Select **الدخول إلى VR** for full virtual reality, or **الدخول إلى الواقع المختلط** for passthrough AR. Each mode is detected separately.
4. Allow the browser's XR session request. Look toward a clear comfortable area. The small exhibit appears in front of the actual viewer pose; a suitable hit-test result can anchor placement. Use **تمركز / إعادة التمركز** when needed.
5. Keep hands in the tracking area. Pinch to grab and open fingers to release. The Arabic menu is a fixed reading lectern on the right of the exhibit, with a backing board and base. Turning or moving your head leaves it in place; explicit recenter moves the exhibit and lectern together. It works without DOM Overlay: touch nearby controls, or aim a hand/controller ray and pinch/select. Returning from the headset system menu leaves the experience paused; select resume.

The development computer's `localhost` is **not** the headset's `localhost`. A LAN `http://192.168…` address is not a trusted secure origin for immersive WebXR. For live development, point a trusted HTTPS tunnel at the Vite server, restrict it to the project, and permit only its actual hostname in `server.allowedHosts` if required. The hosted application uses GitHub Pages with HTTPS at https://daashh3.github.io/lamsat-oman/; the development server is not needed on the headset.

## Verification

```sh
npm test
npm run test:browser
```

The current revision passed its production build and 148 automated tests. The offline browser check (`node scripts/pwa-test.mjs`, after building, with Microsoft Edge installed) also passed under a GitHub Pages-style subdirectory, including reloading without a network connection and keeping other applications' caches intact. Reports are in `test-results/unit-report.txt` and `test-results/pwa-report.json`. Earlier full-journey browser verification covered all seven stations, interaction audio, engraving, pouring/retry, replay and mobile layout. XR layout tests use real geometry and Arabic fonts; no physical headset was connected.

`?debug=1` enables a developer-only FPS/draw-call/triangle/tracking/session overlay and a read-only `window.__lamsat` projection/snapshot interface used by the browser test. It does not bypass chapter gates. Current chapter restart and interaction progress provide debugging controls without fabricated rewards. Normal visitors never see this overlay.

Automated WebXR tests use mocks: they are **not headset tests**. No Quest was connected during implementation. See [the delivery report](docs/DELIVERY_REPORT.md), [XR support and the hardware acceptance pass](docs/XR_COMPATIBILITY.md), and [reference modeling specifications](docs/MODELING.md).

## Architecture and assets

- `src/app/App.js`: renderer, one WebXR animation loop, camera, input, settings and lifecycle.
- `src/core/ExperienceManager.js`, `StateMachine.js`, `ProgressManager.js`: sequential chapter flow, pause, reset and deduplicated rewards.
- `src/core/ChapterManager.js`: procedural scene construction, pointer/hand bridge, precise interaction regions, ownership, animations and effects.
- `src/chapters/`: seven independent pure gameplay modules; `ChapterData.js` centralizes canonical coordinates and narration.
- `src/xr/`: real joint input, pinch smoothing, controller rays, surface placement, touch/grab helpers, stationary comfort and the intentionally unsupported face adapter.
- `src/objects/`: eleven reference-inspired factories, including the deformable Omani flag.
- `src/effects/`: bounded particle pool and reusable smoke, fire, water, confetti and light animation.
- `src/audio/`: bounded Web Audio material effects, with no media element, music playback, voice output or idle loop. `ArabicScripts.js` supplies written challenge feedback. Earlier standalone speech code is unused and excluded from the production module graph.
- `src/ui/`: Arabic RTL DOM interface, Arabic canvas text and a fixed exhibit-side reading lectern for XR.
- `public/assets/reference/`: the ten original JPEG references. `textures/` includes the official flag; `fonts/` includes Tajawal and its OFL license.
- `public/assets/audio/`: earlier music assets are retained as unused history. The current application requests none of them; its short effects are synthesized in Web Audio on interaction.

All scenes use real procedural geometry. The images are modeling references, not stand-in object planes. The result is an illustrated museum style with raised ornament and procedural material maps. The mabkhara has physically based hammered brass, bevelled details and environment reflections. Audio consists of synthesized interaction effects; no prerecorded narration or commercial soundtrack is bundled. The intended pacing is roughly 7–10 minutes for exploration, but interaction speed varies.

Pinned runtime: Three.js 0.181.2. Build: Vite 7.3.8, Playwright 1.58.2, lockfile with patched esbuild. Tested with Node 24.22.1 on Windows. See [asset notices](THIRD_PARTY_NOTICES.md).


Windows shortcut: run `.\Start-LamsatOman.ps1` from PowerShell to use the already-installed dependencies and open the local preview. Keep that terminal open while playing.




