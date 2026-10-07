# Unbound Days

Open the app: https://volkerkrause-lang.github.io/unbound-days/

A tactile notebook planner designed first for iPad in landscape, with responsive mobile and desktop layouts. This is a working first edition, not yet a production commercial service.

## Run

Requires Node.js 22 or later. No package installation or build step is needed.

```sh
npm start
```

Open `http://localhost:4173`. Use `npm run check` and `npm test` for syntax and calendar logic checks. Serve over HTTPS for installation, dictation permissions and offline support outside localhost. Do not open index.html via file://; ES modules and the service worker require an HTTP server.

## Features

- Landscape notebook layout, warm paper, embossed Unbound Days wordmark, current planner year and optional cover name/title.
- Thirty-two generated cover designs, including Steampunk, Rococo, titanium and five additional leather bindings, favourites, switching without changing entries, and uploaded image covers with crop positioning and lettering choices.
- Year, month, week and day calendar views with clickable dates and ISO week numbers. Today ribbon, year selection and monthly side tabs.
- Appointments, all-day/multi-day entries, local daily/weekly/monthly/yearly repetition, categories, locations, notes and calendar export.
- Prioritised tasks, completion, individual rescheduling and optional carry-forward of overdue tasks.
- Year and month goals linked to tasks, notes, habits and monthly reflections.
- Bundled Caveat handwriting font, keyboard text, iPad Scribble text fields, optional browser speech recognition, and pen/eraser/undo sketch canvas.
- Immediate autosaving, a transactional IndexedDB recovery mirror, five recent snapshots, JSON export/import, and recovery of locally deleted events/tasks/notes/habits.
- Google Calendar list/read/create/edit/delete implementation, selectable calendars, paginated yearly fetching, and conditional edits with ETags. Access tokens stay in memory.
- Offline app assets, accessible native dialogs, keyboard focus, reduced-motion support and installable manifest.

## GitHub Pages

Source and all artwork are stored in the public repository `volkerkrause-lang/unbound-days`. GitHub Pages is configured to use **GitHub Actions**. Every push to `main` validates the JavaScript, runs the tests, packages the web assets, and publishes after those checks pass. You can also run **Check and publish Unbound Days** manually in Actions.

All asset/module paths are relative so deployment works under `/unbound-days/`. The publishing package contains app assets only. Personal planner entries stay in the browser and are never committed to this repository.

## Google Calendar setup

1. Create a Google Cloud project, enable the Google Calendar API and Google Drive API and configure the OAuth consent screen.
2. Create an OAuth client of type **Web application**. Add the exact deployment origin to **Authorized JavaScript origins**. For local development add `http://localhost:4173`. Origins do not include the `/unbound-days/` path.
3. During testing, add your Google account to the consent screen's test users. Public release may require Google verification.
4. In the planner's Settings paste the public OAuth client ID, then Connect Google Calendar. Never enter a client secret into the planner.

Requested scopes are `calendar.events` and `calendar.calendarlist.readonly`. Users choose displayed calendars. Writes are explicit and go to the selected calendar. The app uses Google Identity Services' browser token client; it has no refresh-token backend. Reconnect after a browser reload or token expiry. Refresh to receive changes made elsewhere. The clearly labelled optional notebook-backup permission adds `drive.appdata`; after consent it uploads full notebook snapshots automatically while the app is open, at most once a minute, with a five-second initial debounce. Tokens remain in memory. Reconnect after reload or expiry.

Official references:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/calendar/api/v3/reference/events/list

## Limits to understand

- Notes, habits, goals, tasks and uploaded covers save locally and can be backed up automatically to the private Google Drive app data folder after consent. Backups are immutable snapshots, not automatic cross-device merging; restore a chosen copy or transfer an exported file. Google events can be fetched on another device after connecting there.
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

## Release and backup process

Follow `AGENTS.md` for each future update. Main pushes run tests and deploy automatically. App releases preserve the saved notebook key. There are two local copies, recent recovery snapshots, explicit file export, and optional automatic private Google backups. Backup errors are visible. Google setup is required once: configure a Web OAuth client for `https://volkerkrause-lang.github.io`, allow your account as a test user, then connect from Settings. The Cloud console could not be reached from the development browser for this release; live OAuth and Drive consent remain unverified. No personal calendar data has been added to the public repository.

New cover art was generated with the built-in image tool. The prompt set and asset destinations are recorded in `docs/cover-art.md`. New covers have fine material texture and lit relief; CSS adds layered page edges, bevels, binding depth and cast shadows. Page turns use a perspective leaf with a moving shadow; reduced-motion preferences suppress the effect.
