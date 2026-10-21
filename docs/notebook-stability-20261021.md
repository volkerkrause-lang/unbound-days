# Notebook stability and input refinement — 21 October 2026

Development target: `development/filofax-refinement-20261017`; preview: https://unbound-development.pages.dev. Keep `main` unchanged.

## Causes established in source

- Calendar refresh and Tasks sync called the global `render()`, replacing unrelated pages and scroll containers.
- Every notebook save, including ink, scheduled Tasks reconciliation. Only task-content changes now schedule it.
- Ink setup reset the tool and undo history on every render, and only pointer-up persisted strokes.
- Task scroll restoration ran before insertion of quick-delete controls. Browser scroll anchoring then shifted the restored position. Capture now precedes replacement; restoration follows insertion; task-container anchoring is disabled.
- Recorder ownership depended on the entries object reference, which a legitimate account sync can replace. Recording is now bound to notebook/account identity.

## Implemented

- Pencil, microphone, keyboard floating controls and cursor-preserving dictation insertion; dictation toggles start/stop.
- Calendar refresh updates the calendar only when the user is not editing. Tasks refresh does not rebuild other sections. Task tab/scroll preferences remain device-local, including when merging older cloud snapshots. Account sync preserves the selected note, pauses application of remote merges during focused editing/drawing, and reconciles idle visible editors/canvases in place. Cloud saves remain queued and resume after editing.
- In-progress Notes and builder ink receives immediate local draft protection, with full notebook/recovery persistence on stroke completion; recovery applies a newer interrupted draft after account resolution. Existing notebook and ink formats remain unchanged.
- Pressure/coalesced pen points; touch pointers do not draw by default on multitouch devices. Finger drawing is an explicit option in Notes; normal finger scrolling remains available when off. Canvas observers are cleaned up. Undo survives same-note rerenders.
- Notes toolbar: paper, calligraphy pen, pencil, colours, eraser, attachments, undo, redo, voice memo, followed by size control. Separate freehand/structured modes preserve stored layers.
- Stored image/document/audio attachments, image size and horizontal placement, attachment ordering/removal and attachment undo/redo fallback. Files are limited to 3 MB each; short recordings to approximately 6 MB encoded. Larger files require a future dedicated attachment store; notebook storage failure indicators remain active.
- Shared Google request gate: service/account-scoped deduplication, 60-second GET caching, mutation invalidation, quota classification, Retry-After/exponential cooldown, no automatic mutation retries, and Calendar incremental sync tokens with 410 recovery. Diagnostics retain service, endpoint, HTTP status, reason and retry time without credentials. Failed Tasks edits remain local; ambiguous creates retain review protection.
- Compact four-control task management row, confirmed bulk deletion with recovery records, inline notes, regular text, fixed metallic tab geometry and contrasting neighbouring colours, inline + task submit.
- Existing two-option Planning Tools landing, eight components, reusable templates and folders retained. Builder drawing gains pencil/size/palm guards, protected drafts and retained history. Deadline actions retain a confirmed event link and reopen it rather than create a duplicate.

## Browser/platform boundaries

Apple documents double-tap via UIKit `UIPencilInteraction`:
https://developer.apple.com/documentation/uikit/uipencilinteraction
No equivalent Safari event was established. This web app does not claim Pencil double-tap or squeeze support. Native iPad integration would be needed to implement those documented interactions. The visible eraser remains available.

Pointer-event emulation can validate touch rejection logic, but cannot establish physical palm rejection, Apple Pencil pressure feel, iPadOS Scribble, or native double-tap behaviour. No physical iPad was available in this environment.

Structured text remains the existing plain-text notebook editor, with native browser editing/undo. Rich-text formatting has not been added. Images support width, horizontal placement and order rather than unrestricted two-dimensional dragging. Ink and attachment histories are separate, not one chronological object/text history.

The exact live quota-producing endpoint cannot be established without a failing authenticated session. All three Google transports are now instrumented; inspect Settings → Google sync diagnostics when a failure occurs. Supabase/Google permissions and actual two-way live integration still require authenticated device verification.

## Verification

- Syntax checks, 103 automated tests (including three new request-gate tests and a device-local task-preference regression), build pass.
- New Notes/task interaction checks passed desktop, iPad landscape, iPad portrait and mobile; mobile window scrolling retained 900 px. Template/folder/colour/containment/reload checks passed all four viewports. Local account/cover/reload smoke passed. Simulated microphone recordings retained playable audio data; no physical microphone claim. Desktop and mobile screenshots inspected, with tab alignment and mobile row density refined.
- Browser results and deployed commit are reported separately in the delivery; do not infer physical-device or authenticated integration success from automated tests.
- Regression script: `scripts/notebook-stability-smoke.mjs`; template/folder/colour regression: `scripts/template-colours-smoke.mjs`.
