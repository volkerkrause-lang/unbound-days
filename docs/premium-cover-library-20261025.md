# Premium cover library — 25 October 2026

The cover picker now browses 12 named material/art collections with search,
Featured and Favourites. Original numeric IDs 0–39 and custom uploads remain
unchanged. IDs 40–135 add eight vector designs per collection. Artwork uses
procedural grain, gradients, material motifs and SVG detail, rather than 96
new photorealistic photographs. Existing photographic cover artwork remains.

`cover-library.js` owns catalogue, generated artwork, safe option defaults and
shared presentation attributes. `cover-gallery.js` owns browsing and the draft
preview. Selecting a cover does not change the notebook until Apply cover.
Finish, colour tone, decoration, clasp and lettering affect the shared book
layers on preview and closed notebook. The original images can contain painted
clasps/decorations; overlays cannot erase details baked into original images.

Options are stored as JSON text at `entries['cover:personalisation']`, preserving
the established notebook format, account reconciliation and backup validation.
Name/title/lettering colour reuse existing preferences. Initials derive from
the saved name; there is no separate name record. Favourites keep the existing
settings array. User uploads are never included in repository assets.

New modules and all 96 SVG files are packaged and precached. Service worker
v1.8.0-premium-cover-library; app/module imports v0.4.5. Existing mobile cover
smoke uses the new Preview → Apply interaction. The new cover browser smoke is
included in CI at four device sizes.

Verification: syntax, 104 existing unit tests and build passed. New cover smoke
passed at desktop, iPad landscape, iPad portrait and mobile: category counts,
search, preview without applying, finish/clasp/lettering, favourites, application,
navigation, no horizontal overflow, reload and preserved unrelated writing.
Screenshots at all four sizes inspected. Existing notebook/account and mobile
navigation/cover/writing smoke passed. No physical iPad or real authenticated
cross-device sync test was performed.

## Missing-design discovery fix

All 136 source images decoded successfully in the browser; all 96 added SVGs
were present and valid XML. The picker retained search/category/collection
filters between openings and placed the 40 original covers ahead of all new
ones. Categories overflowed horizontally, obscuring later categories.

Opening the picker now clears filters. A New designs (96) view, Original
collection (40), explicit Show all covers reset and available/shown counts
make the whole catalogue discoverable. New designs sort first. A category
select exposes every category on all devices; desktop pills wrap, and mobile
uses the compact select. Mobile finish/details initially collapses to expose
cover choices sooner. Thumbnails use lazy image elements instead of requesting
every full-size CSS background immediately. IDs and saved preferences do not
change. App/import 0.4.6; service worker v1.8.1-complete-cover-collection.

Extended responsive smoke checks every category has eight new covers, all
136 artwork files decode, new/original counts, filter resets, reopening the
picker, selected details, favourites, navigation and persisted writing.

## Distinct artwork correction, 25 October
The previous loader audit proved image decoding but missed the product defect:
category variants shared their base palette and most motifs. All 96 additive
covers now use individual material palettes and name-specific pattern selection.
Examples include ivory ostrich leather, oxblood crocodile, quilted navy, copper,
rose gold, Damascus waves, sea glass, crystal, opal, malachite and lunar eclipse.
These remain scalable vector illustrations; they are not photographic materials.
Stable cover IDs and saved personalisation are preserved. Original 40 files are unchanged.

Rebuild source assets with `node scripts/generate-cover-artwork.mjs`.
The new browser artwork audit verifies every generated file matches its source,
all 96 decode, and all 96 have distinct rendered pixels. It also captures a
complete contact sheet for visual review and runs in development CI. Pixel
uniqueness is a guard against literal duplicates; the contact sheet remains
necessary to judge meaningful visual distinction.

Artwork URLs now use `?v=2`; module imports are 0.4.7 and offline cache is
v1.8.2-distinct-cover-artwork. This prevents a cached old category texture from
standing in for the replacement. Do not clear notebook storage when refreshing.
