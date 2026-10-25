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
