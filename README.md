# Unbound Days

A tactile notebook planner designed first for iPad in landscape, with responsive mobile and desktop layouts. This is a working first edition, not yet a production commercial service.

## Run

Requires Node.js 22 or later. No package installation or build step is needed.

```sh
npm start
```

Open `http://localhost:4173`. Use `npm run check` and `npm test` for syntax and calendar logic checks. Serve over HTTPS for installation, dictation permissions and offline support outside localhost. Do not open index.html via file://; ES modules and the service worker require an HTTP server.

## Features

- Landscape notebook layout, warm paper, embossed Unbound Days wordmark, current planner year and optional cover name/title.
- Twenty generated cover designs, favourites, switching without changing entries, and uploaded image covers with crop positioning and lettering choices.
- Year, month, week and day calendar views with clickable dates and ISO week numbers. Today ribbon, year selection and monthly side tabs.
- Appointments, all-day/multi-day entries, local daily/weekly/monthly/yearly repetition, categories, locations, notes and calendar export.
- Prioritised tasks, completion, individual rescheduling and optional carry-forward of overdue tasks.
- Year and month goals linked to tasks, notes, habits and monthly reflections.
- Bundled Caveat handwriting font, keyboard text, iPad Scribble text fields, optional browser speech recognition, and pen/eraser/undo sketch canvas.
- Device-local autosaving, five recent snapshots, JSON export/import, and recovery of locally deleted events/tasks/notes/habits.
- Google Calendar list/read/create/edit/delete implementation, selectable calendars, paginated yearly fetching, and conditional edits with ETags. Access tokens stay in memory.
- Offline app assets, accessible native dialogs, keyboard focus, reduced-motion support and installable manifest.

## GitHub Pages

1. Create a new repository named `unbound-days` in your account. Prefer private source if your GitHub plan supports Pages for private repositories; otherwise publishing the source publicly is a separate choice. The static planner itself has no login wall.
2. Upload this folder's contents, including `.github/workflows/pages.yml`. Keep all planner data out of the source repository.
3. In repository Settings → Pages, choose **GitHub Actions** as the source.
4. Push to the `main` branch or run **Publish Unbound Days** manually.

All asset/module paths are relative so deployment works under `/unbound-days/`. The workflow uploads only app assets, not project docs or private data. Repo creation and Pages deployment have not been performed by this source package.

## Google Calendar setup

1. Create a Google Cloud project, enable the Google Calendar API and configure the OAuth consent screen.
2. Create an OAuth client of type **Web application**. Add the exact deployment origin to **Authorized JavaScript origins**. For local development add `http://localhost:4173`. Origins do not include the `/unbound-days/` path.
3. During testing, add your Google account to the consent screen's test users. Public release may require Google verification.
4. In the planner's Settings paste the public OAuth client ID, then Connect Google Calendar. Never enter a client secret into the planner.

Requested scopes are `calendar.events` and `calendar.calendarlist.readonly`. Users choose displayed calendars. Writes are explicit and go to the selected calendar. The app uses Google Identity Services' browser token client; it has no refresh-token backend. Reconnect after a browser reload or token expiry. Refresh to receive changes made elsewhere. Nothing is secretly uploaded from local notes to Google.

Official references:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/calendar/api/v3/reference/events/list

## Limits to understand

- Notes, habits, goals, tasks and uploaded covers are saved only in this browser. Automatic cross-device notebook sync is not yet implemented; use a backup file to transfer a notebook. Google events can be fetched on another device after connecting there.
- Google integration is implemented but cannot be verified against a live account until an OAuth client ID and consent are supplied. It refreshes on request/year change, not in the background. Offline Google edits are blocked rather than queued.
- iPad handwriting-to-text depends on Apple's Scribble, available in compatible text fields and supported languages. Original sketch strokes are separate; there is no custom handwriting OCR. Browser dictation varies by browser, may use a provider's speech service, and requires permission; the iPad keyboard microphone is the fallback. Test both on physical iPad hardware.
- Notebook reminders are in-app and require the app to remain open. Google reminders are sent by Google. No background web-push reminder service exists yet.
- Month/year repetition skips dates that do not exist (e.g. the 31st in February). Local repeating edits/deletions apply to the whole series. Google recurrence-instance edits apply to that instance only.
- Google events are displayed in the browser's timezone. ICS exports use floating local times; consumers choose their timezone. Per-event timezone selection is a follow-up requirement for travel use.
- Local storage is limited and can be cleared by the browser. Backups are essential. Do not treat this beta as the only copy of important appointments.
- A static app is not a finished commercial infrastructure: user accounts, durable encrypted server storage, robust offline change reconciliation, privacy policies, payments, monitoring, migrations and verified app-store packaging remain future work.

All accepted product requirements and planned gaps are tracked in `docs/requirements.md`.

## Assets

Cover textures: generated for this project. Caveat font: Google Fonts, SIL Open Font License 1.1; see `assets/Caveat-OFL.txt`. Branding is a working product name, not trademark clearance.
