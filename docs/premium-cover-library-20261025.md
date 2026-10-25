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
