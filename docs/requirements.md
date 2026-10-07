# Unbound Days — agreed product requirements

Authoritative planning record for this project, 7 October 2026.

## Product

- Working product name: **Unbound Days**, as explicitly selected by Volker. Name availability has not been legally cleared.
- An electronic calendar and planner resembling a beautiful physical notebook, not a marketing page or PDF viewer.
- Optimised for full-screen iPad landscape. Responsive mobile and desktop layouts; readable portrait iPad mode.
- Calendar should support existing Google Calendar. Goal is two-way calendar integration with user-selectable calendars.
- Enter by keyboard, Apple Pencil or dictation. Text should look consistent in a nice handwriting font. Keep freehand original ink separately for sketches/annotations.

## Ten accepted functional improvements

1. Enter appointments once and display in year/month/week/day views.
2. Click dates and ISO week numbers to navigate.
3. Today ribbon bookmark reachable throughout the notebook.
4. Carry unfinished tasks forward by choice.
5. Turn yearly goals into monthly milestones and dated tasks.
6. Combine typing and Pencil writing.
7. Reminders and repeating entries.
8. Whole-notebook search for events, tasks and typed/converted writing.
9. Device-adapted pages, generous writing space and touch controls.
10. Automatic saving, offline use, cross-device synchronisation, backup and deletion recovery.

## Notebook sections from reference screenshots

Year overview; monthly calendar with priorities/notes; weekly spread; daily priorities and schedule; task quadrants (most important, important, if I have time, sometime later); yearly/monthly goals; notes; monthly habits; monthly reflection (personal goals, work/study goals, what went well, improve, learn, gratitude).

## Accepted visual direction

- Cognac leather default with subtle embossed logo, no prominent product marketing on cover.
- Main cover feature is the planner year; optional name and custom title. Do not relabel an archived year's cover when the current year changes.
- Cover Gallery, at least ten selectable designs, favorites, instant previews, upload own picture with cropping and contrast controls. Changing cover never changes planner content.
- Art and materials should be diverse, not only leather colour variants: linen, wood, Art Deco, watercolor, botanical, celestial, kintsugi, stained glass, pressed botanicals, retro futurism, topographic relief, mother of pearl, Bauhaus geometry, cosmic nebula, embroidery and liquid chrome.
- Warm paper texture, central fold and page edges, tabs connected to selected pages, physical month tabs, ink colours, translucent highlighting, Today ribbon and subtle opening/page-turn animations.
- Readability and writing latency take priority over decorative effects. Respect reduced motion.

## First edition status

Implemented: functional pages, navigation, views, local events/repetition, tasks/goals, notes/habits/reflections, handwriting-font text, dictation where browser supports it, Scribble-ready text inputs, original-ink canvas, generated covers, upload, backups/recovery, installable offline shell, source package and GitHub Pages workflow. Google API code is included but needs deployment-origin OAuth configuration and live validation.

Not yet complete: durable cross-device notebook sync; custom handwriting recognition; real iPad hardware validation; background reminders; automatic offline Google conflict queue; production authentication, billing, privacy/legal documents; sophisticated cover-opening/page-curl animation; highlighting. Full commercial release must close these gaps.

## Commercial direction

Start with an installable web app and validate daily use, then consider a native iPad implementation for best Pencil performance. Possible one-off core purchase and optional cloud-service subscription are exploratory, not final business decisions.

## Confirmed follow-up decisions — 7 October 2026

- Implement now, as authorised in the latest request.
- Pencil and dictation controls in every user writing field; preserve the existing control style. Native date/time selectors and application credentials are not writing fields.
- Clear, truthful local saving, offline, disconnected, pending backup, completed backup and conflict status.
- Complete notebook export to iPad Files, local recovery mirror, easy guided first-use cloud backup setup. Google Drive, Dropbox and Box are requested providers; cloud registration must be completed before claiming an account connection.
- Device continuity with safe merging and explicit conflict review. Keep immutable copies.
- Named bookmark ribbons linked to specific notebook pages.
- Rejected: quick capture, natural-language appointments, drag-to-reschedule and custom page layouts. Do not reintroduce them.
- Refine covers 0–20 without changing IDs or removing other designs. Premium cognac leather is the default; realistic material scale, binding, shadows, reflections and 3D depth.
- Cloud integration release limits must be stated plainly: provider credentials, actual OAuth consent, Box secure backend, and real iPad testing remain external setup/validation work.
