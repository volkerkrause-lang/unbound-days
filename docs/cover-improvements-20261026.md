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

## Remaining sequence

Stage 5: eight Modern & Abstract entries 120–127. Stage 6: eight Rare Books & Manuscripts entries 128–135. Their current SVGs must not be described as photorealistic repairs. Stage 7: verify committed assets, final CI, development deployment and responsive layouts. Main/public production must remain unchanged.
