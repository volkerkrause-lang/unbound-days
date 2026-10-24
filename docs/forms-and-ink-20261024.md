# Forms and Notes update — 24 October 2026

Development branch: `development/filofax-refinement-20261017`. Base `d0557d6`.

- Planning sheets use a compact labelled Delete icon with confirmation. A string-backed deletion marker hides the sheet and unpins it; saved answers and reusable templates remain intact for recovery and sync. Existing archived sheets still open.
- Removed duplicate Planning Tools control from custom forms. Rating style is a select in layout mode; finished forms show only the chosen stars, percentage or Low/Medium/High control. Heading states what is rated. Changing style retains the existing answer.
- Saving a template presents the original sheet as a finished cream paper form, with small Unbound wordmark and restrained coloured section rules. Opening any reusable template uses the finished view, including older templates. Edit layout exposes headings, component library, drag and up/down ordering; View form returns to the finished view. Layout and answers use original storage keys. Separate filled sheets remain independent.
- Notes uses a solid Ink pen with one continuous quadratic-smoothed path, frame-scheduled redraw and coalesced samples (including empty-array fallback). Removed cloning and synchronous storage on every sample; live checkpoints at most four times a second, full saves at stroke completion, visibility/pagehide checkpoint flush, IndexedDB fallback if local checkpoint space is unavailable. Existing ink is retained.
- Touch scrolling on the writing canvas is disabled to prevent a palm starting a pan and cancelling the Pencil stroke. On touch devices pen-only input is default; Palm rejection toggles finger input. Scroll outside the drawing surface.
- Native Apple Pencil barrel double-tap remains unavailable in this browser application. Apple documents `UIPencilInteraction` for UIKit; no supported Safari hook was established. Eraser toolbar remains available. Do not claim the physical gesture has been implemented.
- Google quota gating from 21 October remains; source of the user’s reported quota message requires a real authenticated failure. Live local checkpoint failures no longer call full save repeatedly. Storage errors are not classified as Google API quota messages.

Validation: syntax/build and 103 unit tests; template/folder/colour and new form regression across desktop, iPad landscape/portrait and mobile; Notes pen/palm filtering, reload, document attachment and native audio persistence/playback checks across all four (run one device per browser process locally). Inspected finished desktop/iPad/mobile screenshots. No physical iPad/Pencil or real signed-in Google request tested.

New regression: `scripts/polished-forms-smoke.mjs`, also included in development CI. Service worker `v1.7.2-polished-forms`, runtime URLs `v=0.4.1`.

## Follow-up: compact icons and shared drawing engine

The original update left the planning drawing canvas on the old per-segment renderer. This follow-up shares `drawInkStroke` from `idea-workspace.js` between Notes and planning drawings: one solid centreline, quadratic smoothing and one stroke call, independent of pressure. Planning canvas also uses frame-scheduled redraw, reduced live cloning, empty-coalesced-sample fallback and touch-action none. Existing stroke storage is unchanged.

Form toolbar controls now use compact outlined SVGs with accessible names and hover tooltips, above the form name. Edit layout uses a pencil, View form an eye, collection a grid/folder, pin a pin, duplicate overlapping sheets, template save a starred page, save sheet a disk. Delete keeps its explicit label on larger screens; mobile uses the highlighted trash icon with accessible name and tooltip. Shared on built-in and custom sheets; mobile row uses 34px controls.

Native Apple Pencil double-tap remains unavailable in Safari: no supported web hook was established. A native iPad integration is required; do not claim hardware gesture support or add an invented browser event.

Regression adds pixel-column proof of exactly one ink band from an alternating-pressure pen stroke in planning drawings at all four layouts, verifies one saved stroke with multiple samples, plus the existing Notes/palm/reload checks. Unit test requires one continuous path even with pressure changes. Service worker v1.7.3-compact-ink; runtime v=0.4.2.
