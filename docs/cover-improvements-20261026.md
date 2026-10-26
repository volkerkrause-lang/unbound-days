# Incremental cover improvements — 26 October 2026

Development branch only: `development/filofax-refinement-20261017`.

## Stages 1–3

Stage 1 published as `17d16c96b0ebb3c0de8c2f944a45619304d74571` and Stage 2 as `591a4f05f85babeb0b07d0d412f12c37c0fe7d30`. Only name, title and lettering colour remain; year is larger, brand separated and independently treated by physical substrate.

Stage 3 published as `374657fde48ea1b19a49a2eccd434ea279909c69`. Recovered four existing images (106, 107, 108, 111), replaced Mechanical Clockwork (109) with exposed horological machinery, preserved other Fantasy artwork. All committed replacement blobs match local hashes. Runtime revision 0.4.13.

Verification follow-up `c72b90f74186fefa3b4bbc58a7127b4ed4e049af` removes an unnecessary Ubuntu system-package upgrade that stalled on the font mirror. Browser installation is bounded to 5 minutes, browser tests to 15. No assertions were removed. Run 40358005004 passed syntax, 104 tests, build and all responsive/regression checks; Cloudflare succeeded. Live Fantasy images, immediate selection and reload retention verified. CI screenshots reviewed at mobile and iPad. Physical devices were not tested.

## Stage 4 — Nature & Botanical

Audited all eight newer category entries plus original category membership. The eight entries 112–119 had present but low-detail procedural SVG artwork; no corresponding photographic recovery assets were found before generation. All eight generated PNGs survived the interrupted session and were recovered without regeneration. Original category artwork remains unchanged. Versioned WebPs preserve IDs, originals and notebook data.

| ID | Design | Physical material/composition |
|---|---|---|
|112|Pressed wildflowers|Preserved meadow flowers on handmade cotton paper|
|113|Autumn canopy|Maple and oak relief in chestnut calfskin|
|114|Kintsugi garden|Glazed celadon porcelain, repaired gold seams, ceramic blossom relief|
|115|Botanical study|Magnolia specimen study on aged vellum|
|116|Moss woodland|Weathered walnut, moss, lichens and fern border|
|117|Ocean currents|Deep teal fused glass, current ribbons and trapped bubbles|
|118|Butterfly wings|Iridescent morpho wing patterns in silk jacquard|
|119|Fern herbarium|Pressed ferns and mounting strips on aged rag paper|

Generation used the built-in image tool, one separate request per design. Shared prompt requirements: landscape 10:7 orthographic full-bleed notebook material, no surrounding scene/page edges, upper-left soft studio light, detailed tactile material and contact shadows, broad clear centre-left for runtime year/name, no text/numbers/logo/watermark or flat vector art. Assets are `assets/collection/cover-112-premium-v4.webp` through `cover-119-premium-v4.webp`.

The existing manifest/updater synchronises paths, hashes, byte sizes and offline references. Screenshot checks now await the final re-rendered thumbnail decoding before capture, avoiding misleading blank thumbnails in CI evidence. Runtime revision 0.4.14. Local syntax, 104 tests and build passed before publishing; CI and live verification must be checked after publication.

## Stage 4 verification

Implementation `8910c48e3b4562df9cb232b8a3f2f143de341833`; screenshot-wait correction `e2089699ec122ae82d6e6f3dfe1cce9f6088ea5e`. Full CI run 40406003901 passed, Cloudflare succeeded. Live revision 0.4.14 and all eight new Nature thumbnails were checked; mobile/iPad picker containment and three controls checked in the connected browser. Signed-in Google journal reports a pre-existing storage quota warning; notebook entries/account data were not changed during checks.

## Stage 5 — Modern & Abstract

Audited entries 120–127: existing procedural SVGs were present but insufficiently detailed. Eight separate built-in image-generation requests replace them with physical material compositions. Original SVGs and stable IDs are preserved. Shared prompts require full-bleed orthographic landscape 10:7, upper-left light, broad centre-left lettering space, no text/logo or surrounding scene.

|ID|Design|Physical treatment|
|---|---|---|
|120|Bauhaus composition|Precisely fitted coloured calfskin inlays|
|121|Quiet minimalism|Honed pale limestone, carved recess and slate inlay|
|122|Geometric relief|Milled stepped titanium prisms|
|123|Mid-century rhythm|Walnut and rosewood marquetry with coloured inlays|
|124|Liquid metal|Solid sculptural chrome folds and studio reflections|
|125|Holographic spectrum|Layered dichroic glass fins, facets and refraction|
|126|Optical labyrinth|Machined black steel and raised silver labyrinth|
|127|Sculpted dunes|Undulating carved sandstone relief|

Assets: `assets/collection/cover-120-premium-v4.webp` through `cover-127-premium-v4.webp`. PNG-to-WebP saves use a validated temporary file followed by atomic replacement. The updater rejects empty or incomplete RIFF/WebP bytes before updating the manifest. Runtime revision 0.4.15.

## Stage 5 verification

Implementation `dd80cd813c1fbe7b8fb530cefc113f5272813e65`; measurement correction `94d2eb2299171e152a9a2249726721fdd4905461`. CI run 40407552424 passed the complete suite and Cloudflare succeeded. The initial new cover-fill assertion incorrectly compared transformed outer-border bounds to inner artwork dimensions; corrected to compare artwork layout dimensions with the cover's inner client dimensions. No application assertion was removed. Live revision 0.4.15 and all eight Modern images loaded correctly.

## Stage 6 — Rare Books & Manuscripts

All eight book entries 128–135 were present as procedural SVGs but lacked believable material craftsmanship. Replaced them with eight distinct, individually generated physical bindings: lapis-blue Book of Hours; aged medieval blind-tooled calfskin with bosses/fastening; antique vellum atlas; emerald morocco gilded folio; stitched limp vellum; oxblood scientific archive; silver-tooled navy astronomer's journal; and Venetian marbled paper/leather binding. Full prompts and asset paths are in `cover-generation-prompts-20261026.json`. Original IDs and SVG assets retained. Images decoded and saved atomically before upload; each uploaded blob must match the local Git SHA and size before publication.

Runtime revision 0.4.16. The responsive suite now includes all eight book covers and captures selected book-detail screenshots after background decoding. The asset manifest now maps all 96 added collection entries to individual WebP files. Original 40 designs are preserved.

## Stage 6 verification

Implementation `0edd20d6d4c84981f0d83259d27c090e6d91d211`; CI run 40409261802 passed the full suite, Cloudflare succeeded. Live revision 0.4.16 and all eight book images loaded. An independent Pillow audit decoded all 136 built-in images and found 136 distinct rendered thumbnails with no exact duplicates.

## Stage 7 — final lettering and release audit

The final visual audit found insufficient default-face contrast from reusing one brown on both pale and dark leather. `scripts/generate-cover-tones.py` samples the existing lettering area of each of the 136 images and compiles static material-tinted dark/light ink plus a separate, subtler blind-brand tone into the existing renderer module. This is a build-time/dev helper; no runtime library, user upload, account data or new control is added. Personal ink choices still override matching ink; the logo has its own colour variable and never receives a reflective face.

Selected metallic colours now preserve a directional bevel/reflection face, and selected textile colours retain ridged thread detail. Paper/glass/leather assignments corrected after visual inspection for original Kintsugi, Stained glass, Pressed botanicals, Topographic relief and Watercolour landscape, plus the leather Steampunk Observatory and Alchemy Manuscript. Small previews have readable minimum lettering sizes; two-line names/titles retain full line height.

Responsive checks exercise gold/charcoal on metal and fabric, requiring the material face to survive, ink to change the face and the brand to remain unchanged. Runtime revision 0.4.17. Final CI, committed files, image availability and live responsive layouts must be verified after publication; physical iPad hardware is not claimed.

## Remaining sequence

Stage 7: verify committed assets, final CI, development deployment and responsive layouts. Main/public production must remain unchanged.
