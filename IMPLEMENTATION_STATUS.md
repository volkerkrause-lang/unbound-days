# Unbound implementation status
Audit date: 2026-10-14. Audit only; no features, service settings or production deployment changed.
Repository: volkerkrause-lang/unbound-days (not unbound).
Audited main: c007985841e2cb3423d1f3c13c26baa8e3360cd1. Version 0.3.34.
Audit branch: audit/commercial-readiness-2026-10-14.
Group A development branch: development/account-foundation. Approved 2026-10-14; not merged/deployed.

## Findings and reusable code
- Plain JavaScript ES modules, HTML/CSS, no installed dependencies/build requirement. Node static development server is not an API backend.
- GitHub Actions validates/packages/deploys main to GitHub Pages. Audit branch pushes do not trigger this workflow. Do not run its workflow_dispatch on this branch: it includes deployment.
- No authentication, database, RLS, server authorization, Stripe, entitlements, account deletion or admin dashboard.
- app.js stores version-1 notebook under unbound-days-v1; storage.js maintains IndexedDB recovery mirror. Local history keeps five snapshots, trash keeps 50 records. Browser data is device/origin specific, not account specific.
- Preserve events/tasks/notes/habits/entries/ink/trash/bookmarks/settings, stable cover IDs and embedded uploaded covers. Planning forms and Bright Ideas use entries/notes. Keep Google caches separate from authoritative user-created records.
- google.js implements Calendar list/read/create/PATCH/delete, pagination, stable Google IDs and If-Match ETags. app.js supports selected/default calendars, manual refresh and year refresh. Reuse API conversions and tests, repairing limitations.
- Google public client ID is empty in cloud-config.js; a user may have set it locally, which repository inspection cannot establish. Access tokens are memory-only and lost on reload/expiry. No secure refresh backend or durable synchronization journal.
- Calendar is direct API editing plus cached reads, not complete two-way database synchronization. Creation retries have no idempotency; no incremental sync tokens/tombstones; event timezone metadata is discarded. Imported reminders become blank; edits send useDefault and can replace existing reminder choices. Recurring events are expanded and edits target instances; series fidelity requires work.
- No Google Tasks API integration. Existing local tasks already appear by date in planner.
- Drive appDataFolder immutable JSON snapshots, listing, restore, debounce/rate batching and conflict-aware notebook merging already exist. Reuse backup adapter/schema/merge tests, but remove Drive journal as live database synchronization once cloud database is authoritative.
- Drive backup coupled to Calendar scopes/connection. No cryptographic integrity check, retention policy or durable retry queue. Last success is memory-only. Each backup can contain both full notebook and merge base; unlimited versions increase size and download work. Failure inhibits automatic queue until another trigger/manual retry; not a robust retry mechanism. Only while app active/connected.
- Dropbox PKCE backup exists; leave it intact and outside this audit's implementation scope.
- Live Google account, iPad, cross-device/offline behavior and hosted deployment not tested. Passing mocks do not establish these work.

## Recommended architecture (proposed, awaiting approval)
Keep notebook frontend; add official Supabase client, Supabase Auth/Postgres/RLS/Edge Functions. Use one primary Postgres data store with user-owned records, optimistic revisions, and persistent local pending operations; private storage buckets for uploaded assets if needed. Reuse schema and merge functions without rewriting UI.
Separate backend-managed roles from payment entitlements. Bootstrap owner's verified auth UUID by privileged setup; never by frontend email or user-editable metadata. Admin has all features but no blanket SELECT on planner data; dashboard receives only protected account/billing/operational metadata.
Backend handles separate incremental Google authorizations, state/PKCE where supported, encrypted refresh-token storage inaccessible to browsers, API proxy/sync and Stripe. Google login alone does not grant Calendar/Tasks/Drive access.
GitHub Pages official policy disallows commercial SaaS and sensitive password transactions. Proposed release frontend: Cloudflare Pages static hosting; keep current production unchanged until approval. Do not introduce a second API backend. Production hosting/auth configuration requires separate approval.
Drive remains recovery only. Prefer existing hidden appDataFolder (non-sensitive scope, app-only visibility); offer JSON export for user access. Visible app-created folder with drive.file is an alternative if direct Drive visibility required; no broad drive scope. Hidden folder can be deleted by user and must not be sole database disaster recovery.
Use activity-driven sync/backup initially; no browser-closed guarantee. Only add backend scheduling when explicitly required and costed.

## Costs and limits checked against official sources
- Supabase Free: 50,000 MAU, 500 MB database, 1 GB object storage, 5 GB egress, 500,000 Edge Function invocations. Two active projects; inactive projects pause after one week; automatic database backups excluded. Suitable development/small pilot, not an assurance of commercial reliability. Pro starts USD25/month, upgrade only with approval.
- Cloudflare Pages Free: 500 builds/month, 25 MiB max asset, static requests free/unlimited. Proposed replacement because current hosting unsuitable, not activated.
- Supabase default email restricted to project team addresses, currently two messages/hour; custom SMTP required for public verification/reset. Select/reuse a transactional SMTP provider and verify domain; cost still to confirm.
- Stripe test mode incurs no real transaction charge. Standard UK cards: 1.5% + GBP0.20; pay-as-you-go Billing adds 0.7% subscription volume. Other card classes/currency conversion/tax tooling may cost more. No live payments or prices decided.
- Calendar standard API use no additional charge; official quota page flags planned excess-quota charges later in 2026. Tasks courtesy limit 50,000 queries/day. Do not enable paid quota/billing automatically. Drive uses user's storage/quota; backup retention required. No blanket promise all Google API usage remains free.
- Pilot infrastructure may be GBP0/month within quotas with suitable free SMTP/host. Domains, higher email volume, database reliability/backup upgrades, legal/accounting and applicable taxes/ICO fees are separate; no exact commercial total without volume and business choices.

Official references:
https://supabase.com/pricing
https://supabase.com/docs/guides/platform/billing-on-supabase
https://supabase.com/docs/guides/auth/auth-smtp
https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
https://developers.cloudflare.com/pages/platform/limits/
https://developers.cloudflare.com/pages/functions/pricing/
https://stripe.com/gb/pricing
https://stripe.com/gb/billing/pricing
https://developers.google.com/workspace/calendar/api/guides/quota
https://developers.google.com/workspace/tasks/limits
https://developers.google.com/workspace/drive/api/guides/appdata

## Data risks / migration gates
1. Changing origin loses access to existing localStorage/IndexedDB from new domain. Export from OLD origin first; test restore and verify counts/content before import. Do not clear old copies.
2. Guest notebook cannot automatically be assumed to belong to whichever user logs in. Explicit claim/import, account-scoped local stores and journals, isolated logout/account switching, recoverable guest export.
3. Import fingerprint + transaction + unique migration record; retry must not duplicate records. Review conflicts, never overwrite existing cloud notebook blindly.
4. Google account identity must be bound to Unbound user; avoid reusing journals or backups across different Google/Unbound accounts. Preserve external IDs and deletion tombstones.
5. Keep schema-compatible exports, reject malformed data before mutation, checksum manifests and dry-run recovery.
6. Free database has no included automated backup. Optional user Drive snapshots do not replace operator disaster recovery.

## Implementation checklist
- [x] Repository verified and targeted audit completed.
- [x] Syntax validation and baseline tests.
- [x] Approval for Group A and proposed architecture.
- [ ] A: Auth pages/session/verification/reset/account settings/export/delete; UUID admin bootstrap; RLS and private assets; safe account-scoped local migration; revision-aware live cloud save/load and persistent offline operations. Tests: cross-user denial, role escalation denial, admin planner privacy, duplicate import, conflict/retry/logout/reload; staging two-device/offline verification.
- [ ] B (separate approval after A): backend OAuth and separate permissions; repair Calendar with durable mappings, idempotent writes, incremental pulls/deletions, timezone/recurrence/reminder fidelity; Tasks list/task mappings, completion/due dates/local times; bounded retries/conflict review; versioned Drive backup/checksums/retention/manual restore with pre-restore snapshot. Tests: duplicates/deletion/conflicts/expiry/revocation/DST/recurrence/due dates/corrupt recovery + authorized live-account roundtrip.
- [ ] C (separate approval after B): Stripe test Checkout/Billing/Portal, idempotent verified raw-body webhooks and server entitlements; admin bypass; preserve expired accounts' data; metadata-only dashboard and protected audited controls. Tests: forged/replayed/out-of-order webhooks, cancellation/renewal/failed payment/access controls. Premium features/prices remain undecided.
- [ ] Release gates: production approvals, operator backups/recovery rehearsal, auth abuse limits, integration monitoring and secret handling; privacy/terms, UK GDPR processor contracts/retention/deletion/export, applicable ICO obligations, consumer subscription/cancellation rules, VAT/accounting and mobile-store billing review. Legal compliance not certified.

## External configuration / blockers
Owner: approve architecture and Group A; create/select isolated Supabase Free development project (region decision), supply public URL/publishable key through configuration, keep service keys server-side; verify first account UUID for privileged admin assignment.
Choose release domain/frontend host before final OAuth redirects. Verify sender domain and custom SMTP; backend SMTP secrets never in repository/chat.
For B: own Google Cloud project, enable Calendar/Tasks/Drive, separate development OAuth redirect/origin, test users, incremental consent, backend secret storage. Public Calendar/Tasks scopes may require verification; test-mode refresh expiry must be accounted for. Preserve original Google app/project access to legacy hidden backups.
For C: Stripe account and test keys/webhook secret through secure backend configuration; approve monthly/annual prices, Premium feature matrix and policies before live launch.
No need to activate services during audit. Configured external dashboards and private browser notebook data not accessible through source audit.

## Validation / next action
npm run check: passed. npm test: 38 passed, 0 failed.
No code changed; browser checks omitted for documentation-only audit. AGENTS.md publish requirement superseded by explicit audit-only/no-production instructions.
Next: obtain Group A approval, implement on development branch and isolated configuration; do not merge, deploy, change production settings or buy upgrades.

## Group A implementation — 2026-10-14
Implemented on development/account-foundation; Group A is NOT yet accepted as complete because hosted configuration/live verification remain pending.
- Official Supabase JS client bundled/pinned, PKCE email signup/login/Google login, verification/reset callbacks, persistent sessions, account settings, logout controls and optional Turnstile.
- Postgres migration: private user notebook/profile/import tables, RLS, UUID-based privileged admin bootstrap, server-side unrestricted-admin check. No admin SELECT on another planner. Regular users cannot modify role metadata/tables. One authoritative notebook JSON row per user retains current UI schema and entity IDs; optimistic revisions/merge baselines avoid a risky UI rewrite. Large uploaded covers remain embedded for compatibility; extract into private assets only if needed.
- Account-scoped localStorage/IndexedDB, guest preservation, explicit validated/exported/fingerprinted legacy import into an empty cloud account, transactional duplicate rejection. Durable local draft/base survives network failures; active checks/reconnect retry, same-field conflict review, bounded contention retries, auth-switch/in-flight guards and other-tab lock preservation.
- Database cloud loading/saving adapters implemented. Cross-device and offline behavior is covered by deterministic synchronization tests but NOT verified on real devices/hosted service.
- Authenticated notebooks disable legacy Drive journal merging so Drive is no longer their live source. Existing Calendar and optional provider backup adapters retained; secure backend Google authorization/account-binding still Group B. Guest behavior retained.
- Password-reauthenticated own-account deletion Edge Function; cascade deletes planner/profile/import state; confirmed deletion removes that account's local notebook/recovery. Separate provider backups remain. Account export included; hosted backup/log retention/legal deletion policy still release work.
- Build/development server now serves _site; security headers prepared for proposed Cloudflare host; development CI validates/packages only and never deploys. Production main/settings untouched.
- Setup: docs/account-setup.md. Public account-config.js now points to the isolated development project (configured 2026-10-14). No secrets introduced or paid services activated.

### Group A remaining gates
1. Owner creates isolated Supabase Free development project and supplies URL/public publishable key. Apply migration there; enable confirmation and appropriate rate limits/custom SMTP; configure Google login callback and optional Turnstile.
2. Deploy own-account deletion function to development, set APP_ORIGINS; verify owner's UUID and privileged admin assignment. This is not production configuration.
3. Run actual signup/verify/reset/Google/logout, two-user RLS via hosted API, two-device/offline/reload/conflict/migration and disposable-account deletion tests. Credentials/account configuration are not available in this session.
4. Browser visual/persistence smoke prepared at scripts/browser-smoke.mjs. Chromium download failed (truncated/non-ZIP response) in this environment; no browser visual verification claimed. Run after installing Chromium in a working environment. No repeat download attempts required here.
5. Only after these gates and review, consider Group A accepted and request Group B approval. No Group B/C implementation started.

### Validation
Syntax checks and static bundle build passed. Full regression: 45 tests, 0 failures (38 existing + 7 focused account/database/sync tests). PGlite runs real PostgreSQL row policies, privileges, transaction/CAS and cascade behavior with a simulated auth.uid/session; it does not validate hosted Auth/Edge Function runtime. Production dependency audit: zero known vulnerabilities. Browser/live account tests pending as above.

Next recommended action: configure the isolated development Supabase project using docs/account-setup.md, then complete Group A live verification. Do not merge or deploy to production.

## Development connection check — 2026-10-14
Owner supplied development URL and public publishable key; committed only on development/account-foundation. Read-only Auth settings check returned 200: email enabled, verification required, Google login disabled. Read-only notebooks schema check returned PGRST205 (table absent from schema cache): database migration still needs applying. No signup, service setting, database change or production deployment performed. Next: owner opens SQL Editor in Unbound Development and runs the checked-in account migration; then verify hosted table/API policies.

## Hosted schema verified — 2026-10-14
Owner ran the full migration after correcting Run selected. SQL catalogue check shows profiles, notebooks, notebook_imports and has_unrestricted_access exist. Read-only anonymous API checks now return 401/42501 for profiles/notebooks SELECT and administrator-check execution, confirming logged-out access is denied. Hosted per-user RLS, write RPC and Auth flows still require signed-in staging tests. Next: configure a separate development frontend and exact Auth callback URL, then owner/signup and hosted authorization verification. No production deployment.

## Task redesign — 14 October 2026
- Isolated branch: `development/tasks-view`, based on development head b6c6564; production unchanged.
- Implemented: short coloured bookmark list ribbons, contained horizontal scrolling, one task list, All/Today/Upcoming/Overdue/Completed filters; long-press arrangement mode, mouse/touch reordering and accessible arrows, pins, undo/reset; quick entry, date shortcuts, bulk completion/date/priority, duplicate editor; saved opening/list/filter/scroll preferences; gold side Today bookmark above month tabs.
- Legacy tasks retain IDs and default to My tasks. Existing notes/goals/idea links are preserved; duplicates receive fresh IDs and no remote mapping. Optional list/view metadata lives in existing private notebook settings. No destructive migration or production deployment.
- Fixed cloud validation of omitted device-only preferences (the reported Invalid preferences error); task-list preferences survive cloud snapshot validation. Cross-device and real-device behaviour still require hosted testing.
- Google Tasks sync NOT implemented or enabled. The existing browser Google token flow has no server-side refresh-token broker. The UI explicitly reports secure setup pending; local lists are not presented as Google imports.
- Required next setup: enable Google Tasks API in the existing Google Cloud project; prepare backend OAuth client-secret configuration in Supabase secrets (never chat/git), backend token-encryption key and callback/origin allowlist. Implement and test OAuth state/PKCE, encrypted private token storage, durable mappings/outbox, duplicate-safe sync and conflicts before connecting real tasks. Exact callback URL must match the eventual broker function.
- Checks: new task data/workflow tests pass, account/RLS tests pass, JS syntax and production build pass. Updated the existing Drive test to match the already implemented visible-folder drive.file design. Browser installation failed with truncated Chromium archives; no visual/live-Google/offline-device claims.
- Next: review this branch's task interface in a development preview, then implement secure Google authorization and sync. No alarms; existing search/sorting unchanged.

## Google Tasks integration draft — 14 October 2026

Baseline `development/account-foundation` at `b6c656441b84d548ed6cfb114a51439ab5c79630` is an ancestor of `development/tasks-view` at `f8197ac5cd655a0a594a27450c928331e0366892` (one additional interface commit, no divergent history). The separate `development/google-tasks-integration` branch preserves both; neither source branch nor main is changed.

- Reuses the browser Google connection with full Tasks scope plus OpenID identity verification. Access tokens remain in module memory; reconnection is explicit after expiry/reload. Google account identity namespaces lists and tasks and prevents writes into another connected account.
- Discovers paginated task lists as existing bookmark tabs; imports active, completed, hidden, deleted and assigned records. The existing Today view and list preferences remain intact. Calendar-day task chips reuse notebook tasks; Tasks synchronisation never creates Calendar events.
- Two-way title, notes, date and completion synchronisation; explicit deletion tombstones; imports subtask relationships and creates new subtasks beneath existing or newly synchronised parents. Priorities, times, planner links and ink remain notebook metadata.
- Three-way conflict review and conditional ETag writes; missing remote records are retained for review. Unknown POST outcomes persist before sending and pause automatic creation retries. The originating device performs initial creation; other devices wait to reduce duplicate creation. Linking an uncertain creation requires explicitly checking its Google task ID.
- Parent deletion pauses while subtasks remain; assigned-source deletion must be reviewed in Google. Undo restores a pending deletion in place; a confirmed remote deletion restores only a local recovery copy.

Validation: the consolidated existing/new suite passed 67 tests after adapting the backup OAuth mock for identity verification. Subsequent focused validation passed 25 tests, including added OAuth-expiry and deletion-restore tests. Syntax and build passed. Browser smoke was blocked by a missing Playwright Chromium executable; browser download failed, and no further attempts were made.

Deployment verification: HTTP 200 from `https://unbound-development.pages.dev`; served app.js and google.js SHA-256 hashes match the account-foundation branch. Its configured deployment branch was recorded earlier as account-foundation; Cloudflare dashboard/API configuration was not re-read because no Cloudflare administrative connection is available here. No deployment setting was changed. The integration code is not claimed deployed.

Remaining validation and limitations:
1. Review/merge the draft PR into account-foundation to update the existing development deployment, without changing its configured branch. Never merge this work into main as part of this task.
2. Reconnect Google on the authorised development origin, grant Tasks/OpenID identity access, and verify list discovery; create/edit/complete/reopen/delete a disposable task; create and edit a disposable subtask; verify changes made in Google import back; verify Calendar and Drive still work. No live OAuth session was available in this execution environment, so no live Tasks round-trip was performed.
3. Run browser smoke when Chromium is available. Check account/login, cover, navigation, task form, Today and reload persistence before removing draft status.
4. Existing Google task list transfers and existing subtask-parent changes are deliberately blocked in Unbound; perform those changes in Google and refresh, or explicitly duplicate a task. New lists created by the existing Unbound list button remain local. Synchronisation runs on connection, after notebook edits, Calendar refresh or the Tasks sync button; it is not a background service.
5. Unknown creation outcomes require explicit review rather than automatic duplicate-prone retries. Initial creation on another device waits for the original device. Browser-only tokens do not provide unattended refresh.

## Custom templates and title colours — 20 October 2026

Requirements 20 and 21 are appended to docs/requirements.md without removing previous requirements.

Implemented reusable template snapshots, My Forms above built-in categories, nested folders, search, rename/move/duplicate/delete, protected layout editing via independent drafts, confirmed replacement/deletion, independent sheets and existing pinning. Folder deletion moves contained templates to My Forms. Filled answers/audio/ink stay in sheets rather than becoming template defaults. New components default to full width. The Planning Tools return button now reaches the two-option hub. Existing filled built-in forms are labelled Saved sheets to distinguish them from reusable templates.

Shared title colours use a fixed palette and normalised title hash with explicit distinct defaults for Early/Late/Long Day/Appointment/CES Las Vegas. Appointment editing supports a palette override and Automatic reset. Preferences are string-backed notebook entries, carried by existing recovery/backups/account merge. Google event payloads are not used to store colour preferences. Existing recurrence and Google save handlers remain in use.

Validation: syntax checks and production build passed; 92 Node tests passed. Browser workflows passed at desktop 1366×1024, iPad landscape 1180×820, iPad portrait 820×1180, and mobile 390×844: template creation, original-sheet preservation, full-width defaults, folder creation/move, independent template use, reload persistence, colour equality/override persistence and month-cell containment. New browser smoke is included in development CI.

Limits: arbitrary titles can share one of the 12 palette colours; users can override them. Actual signed-in Google Calendar/account cross-device round trips require connected test accounts and were not performed in this isolated browser. Existing API/account/sync tests passed. Production main is unchanged; this continues the existing development improvement task.


## Planning voice memos and copy icon — 20 October 2026

Fixed hosted audio playback policy: CSP now permits local data/blob audio; microphone permission is explicitly limited to this origin. Voice recording uses supported MIME negotiation (including MP4 for Safari), guarded permission requests, persistent capture state through redraws, visible requesting/recording/saving states, a running duration and a persistent Stop button. Errors explain microphone refusal/unavailability. Empty/failed captures preserve previous memos; stream tracks are released on stop/error/cancellation; notebook/account changes cannot redirect a recording into another account. Refresh warns while a recording is unfinished. Component copy now uses a conventional two-page SVG with visible Copy text and an accessible label.

Validation: 98 Node tests, syntax checks and production build passed. Browser checks at desktop, iPad-sized and mobile viewports exercised permission refusal/retry, native MediaRecorder encoding from a synthetic microphone, redraw while recording, stopping/releasing tracks, real audio playback with the hosted CSP, component copy, containment and persisted playback data after reload. Physical microphone and Safari/iPad hardware checks remain device-dependent; no live microphone was accessed by the test.
