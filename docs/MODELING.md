# Reference-led procedural modeling specification

All ten supplied JPEG files were visually inspected, as render/blueprint pairs, before creating geometry. They are illustrative references, not scans or 3D files. Units below are converted to meters; each large building or vessel becomes a museum-scale diorama. Front faces point along +Z and model bases are y=0. All exported constructors return Three.js Groups.

| Pair | Observed defining details | Geometry and display scale |
|---|---|---|
| Gate | Dark layered wood; rectangular frame around a pointed arch; two studded leaves; raised floral/star panels; ring knockers; cyan rim. Drawing says 320 cm high, 300 cm bottom width, 190 cm opening, 30 cm depth (top dimension also inconsistently says 250 cm). | Use main specification 3.2 × 3 × .3 m scaled .2625 to .84 × .7875 × .07875 m. Separate actual hinge pivots. Repeated instanced studs, layered frame, tube star/rosette ornament, mesh arch. |
| Incense | Gold four-corner flared open bowl, scalloped rim, four slender columns, splayed square base, raised ornament; charcoal below rim. | 600/350/250 mm → .60 m height, .35 m upper width, .25 m foot. Four curved wall panels, open bowl and independent charcoal, finial behind opening. |
| Dhow | Curved plank hull, upswept bow and stern, pale waterline, deck, two masts in blueprint, lateen sail, many ropes, stern canopy and railing. Drawing labels 30 m length, 5.6 m beam, 2.4 m hull depth, 9 m overall height, but rendered sail is visually taller. | Length 1.08 m, beam .202 m, hull depth .086 m. Sail/masts use slightly taller .40 m total height to retain render's recognizable silhouette, explicitly an illustrative adjustment. Custom sampled hull surface and deck; separate deformable cloth triangle. |
| Fort | Gently tapered ochre cylinder; pointed/rounded merlons; slit windows, warm arched inset; timber studded entrance; patchy masonry and two horizontal courses. | 700/450/500 cm → 7/4.5/5 m, scaled .1: .70 m high, .45 m top/.50 m bottom. Instanced battlements and stone courses, extruded pointed windows and door frame. |
| Pottery | Open terracotta vessels, swelling shoulder, narrow neck, flared mouth, foot ring; zigzag, diamond, dotted and diagonal bands; some two-handled variants. Drawing dimensions explicitly mm: 260–320 high, 130–220 wide. | Default .28 m high × .20 m maximum diameter. Custom radial mesh with continuous inner wall; shape by profile vertex changes, not uniform scale. Decorative band group and geometric zigzags revealed after firing. |

The tree, wheel, kiln, halwa cooking set, coffee dallah and lantern extend the same wood/gold/clay/sandstone material vocabulary. These are procedural approximations, not exact reproductions, photogrammetry, or professional sculpture. Fine reference filigree is simplified into actual repeated raised geometry; surfaces use small deterministic procedural texture maps rather than photos of the references.

## Model API

- `createGate()` → `userData.leftDoor`, `rightDoor` hinge Groups; front face z=.055, leaves x ±.25, y 0–.578.
- `createMabkhara()` → `bowlCenter = (0,.47,0)`, `bowlRadius=.12`, `charcoal` array.
- `createTree()` → `resin` Mesh, local position (.10,.32,.05).
- `createDhow()` → `sail`, `ropeHandle`; `setSailProgress(group, progress)` deforms cloth.
- `createFort()` → `door`, `windows` array.
- `createPotteryWheel()` → `wheel`, `topCenter=(0,.18,0)`.
- `createVase()` → `body`, `decoration`; `updateVase(groupOrBody,height,width)` takes final physical meters, updates radial profile vertices and normals.
- `createHalwaSet()` → `cauldron`, `mixture`, `stick`, `ingredients`, `fire`, `servingBowl`; cauldron center `(0,.22,0)`.
- `createCoffeeSet()` → `dallah`, `spout` marker attached to dallah, `cups`, `liquid`, `stream`.
- `createLantern()` → `core`, `light`, `panels`.
- `createFlag(width=.3)` → `cloth`; `updateFlag(group,time,reducedMotion)`.

Exact dimensions and local attachment points are also stored in each model's `userData` for collision code.

## Flag source and fidelity

The local `public/assets/textures/oman-flag-official.jpg` is the 2,000 × 1,143 image explicitly offered for download by Oman's Foreign Ministry on its [Downloads page](https://www.fm.gov.om/en/ministry/media/downloads/). Original asset URL: `https://www.fm.gov.om/wp-content/uploads/Flag_of_OmanMin-of-Info.jpg`. Downloaded and visually inspected during implementation on 2026-11-14. It shows white/red/green horizontal bands, the red hoist occupying one-third width, and the white khanjar, belt and crossed-sword emblem in the upper hoist. This corrects the simplified star-like emblem in the supplied dhow illustration. The texture is applied to a subdivided, animated cloth mesh, not used as a substitute for the dhow or lantern geometry. It retains the Ministry image's 2000:1143 aspect and exact emblem orientation. The Ministry distributes this national-symbol image as an official download; no separate Creative Commons license is asserted. Retain this source attribution.

## Performance and limitations

Repeated studs, merlons, stones, leaves and ingredient bits use `InstancedMesh`. Static children with shared materials are merged; hinges, sail, rope handle, wheel, vase, ingredients, dallah and liquids remain separate animation targets. Procedural 64 × 64 surface textures are deterministic and shared within each palette. Most lathed profiles use 28–48 radial segments. Models have real volume, raised details and open vessel rims. Fort slit windows use shallow dark inset geometry rather than costly Boolean holes; fine floral filigree is an original simplified geometric interpretation. Lighting, texture fidelity and silhouette need on-device artistic review. The official flag asset is the only external visual asset required by these model modules; it is bundled locally.

