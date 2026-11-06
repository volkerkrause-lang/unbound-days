# Personal cloud storage: audit and implementation plan

Date: 6 November 2026  
Audited ref: `development/filofax-refinement-20261017` at `b64926cf26dfcef6f324f5ba58b6dd2c402dfd7d`

## Executive finding

Unbound currently synchronises complete notebook JSON through Supabase and stores note attachments as Base64 data URLs inside that JSON. This makes every changed notebook upload include the attachment payloads again. Google Drive and Dropbox are currently notebook-backup providers; neither is a general attachment store. Box is a disabled placeholder. There is no existing unified storage preference or shared attachment service for Quick Capture.

The repository confirms a credible source of high egress, but it cannot establish the exact cause or volume of the reported Supabase spike. Supabase project usage metrics and query logs are not available in this workspace. The dashboard's per-service, per-day egress and database-size breakdown is needed to attribute the event conclusively.

## Phase A — confirmed audit

### Attachment and sync data path

- `note-media.js` reads image, PDF, text and Word files into Base64 data URLs and stores them as `idea:<noteId>:attachments` inside `state.entries`.
- New note attachments are limited to 3 MB. Voice memos are also Base64 encoded and limited to 6 MB.
- `sync.js` includes the complete `entries` object in `notebookContent`; therefore attachment data is included in the Supabase notebook JSON and provider notebook backups.
- The `public.valid_notebook` SQL function permits up to 10 MiB of JSON. A notebook can approach that limit because of embedded attachments and JSON/Base64 overhead.
- `account-sync.js` performs a lightweight revision query when its cached revision is unchanged, and fetches notebook data only when revision changes. Saves send the full notebook document to `save_notebook`.
- `account-ui.js` checks for cross-device changes every five minutes while visible, on visibility changes, and when the browser comes online. The revision-only polling reduces reads when no device has changed the notebook, but changed data is still a full-document transfer.
- `storage.js` keeps an IndexedDB recovery mirror. This is useful for recovery but is not shared cloud storage and does not remove Base64 from cloud sync.
- The service worker caches same-origin GET responses. It does not intercept non-GET Supabase writes; it is not evidence of the egress spike.

### Existing provider integrations

- **Google Drive:** `google.js` lists, uploads, reads and prunes notebook snapshots in an `Unbound` folder. The Drive permission is `drive.file`; automatic snapshots keep the newest 20. It is not used for note attachments.
- **Google credential handling:** `google-session.js`, `accounts.js`, the `google_connections` migration, and `supabase/functions/google-connection` persist an encrypted Google refresh token server-side and return short-lived access tokens to the browser. The table denies client access and grants the service role access. The edge function checks allowed origins, authenticated user, token identity and required scopes.
- **Consent boundary issue:** `googleLoginOptions()` currently includes Calendar, Tasks **and Drive** scopes in the Supabase Google sign-in request. This does not satisfy the requirement that Google identity sign-in and Drive access be separate consent decisions. Existing Google calendar/task integrations must be preserved while separating those consent flows.
- **Dropbox:** `dropbox.js` supports Dropbox OAuth PKCE and notebook backups only. Its access token is held in module memory; no refresh token or account-level encrypted connection is saved, so it does not provide durable cross-device connection state. The current Dropbox app key is present in the public client config, as is normal for a public OAuth client; no secret should be added there.
- **Box:** no Box adapter, OAuth handler, configuration or metadata was found. The backup setup UI explicitly labels Box as requiring a secure connection service.
- **Preferences:** the current notebook `backupProvider` setting selects Google or Dropbox backups; this is device notebook state, not a durable account-level preference. The settings UI has no attachment-storage provider preference.
- **Quick Capture:** `quick-capture.js` compresses photographs and saves them into the local Unbound notebook/inbox flow. It does not upload to a personal cloud provider. Hosting it on a separate origin would not share the browser's same-origin storage or session automatically.

### Supabase traffic and earlier mitigation

- The database schema stores one JSONB notebook row per user. Every successful `save_notebook` call replaces that row; RLS limits reads to the authenticated owner. The 10 MiB function guard is a maximum request payload, not a target size.
- The current account sync already has revision caching: when the server revision matches the local base it avoids downloading the full notebook. This reduces repeated full-read egress but does not reduce full-document writes, and cannot help clients whose local revision/base is missing.
- The repository contains the November 2 egress validation work on a separate line of development. Its documented/code changes centre on revision caching, fewer redundant background checks and browser validation. It does not contain Supabase dashboard telemetry or an attribution of the earlier usage spike.
- The remembered Supabase notice reported the free-plan egress threshold was exceeded and a grace period was in effect. The notice alone does not show which service or request caused it.
- **Confirmed likely contributor:** large Base64 attachment fields are repeatedly included in full notebook writes and downloads after edits or remote changes. Base64 expands raw data by roughly one third before JSON overhead.
- **Other possible contributors, not confirmed:** repeated reads on new devices or cache resets, large custom covers or ink data, automated browser checks, preview deployments, and auth/function traffic. Repository code alone cannot distinguish these from the confirmed payload risk.
- Required evidence for exact attribution: Supabase Dashboard → Usage, daily egress split by Database/API, Auth, Storage, Functions and Realtime; database size and API request counts over 29 Oct–1 Nov; PostgREST logs/query counts if retained; and a sample notebook JSON byte size with/without attachments. No Supabase dashboard connector or credentials are available to this task, so no project data was queried.

## Phase B — recommended shared architecture

### Storage boundary

Keep text notes, transcription, links, tasks, calendar data, drawing/ink state, and attachment metadata in the existing account sync. Keep new binary files in the user's selected provider. Do not rewrite or remove existing embedded attachments; render them through the legacy path. No automatic migration. Provider changes apply only to new uploads, and each file's metadata continues to identify its original provider.

Use one small attachment metadata record (either a new owner-scoped table or versioned notebook metadata after payload separation), with fields: stable attachment ID, owner user ID, note/capture ID, provider, provider file ID/path, name, MIME type, byte size, created time, optional dimensions/duration, upload state, and a content hash/idempotency key. Do not store access tokens, raw file bytes, public sharing URLs, or file contents in notebook JSON. Provider IDs are private locators, not public URLs.

### Provider service

Create one `PersonalStorage` client interface (`status`, `beginConnect`, `disconnect`, `upload`, `download/preview`, `delete`) and small Google Drive, Dropbox and Box adapters. Notes & Ideas and Quick Capture call this service; neither contains provider-specific API code. Uploaded content goes directly from the browser to the provider using a short-lived scoped access token or provider upload session. Supabase handles OAuth code exchange/refresh, encrypted refresh-token storage, metadata authorization and short-lived token issuance; it does not proxy large file bodies.

For all OAuth callbacks, validate state and PKCE, bind provider identity/connection to the authenticated Unbound user, enforce approved redirect origins, and keep refresh credentials encrypted server-side. Keep access tokens in memory only. Google Drive uses the narrow `drive.file` scope with separate consent from Google login. Dropbox should use offline refresh-token authorization through the server broker, not the current browser-only online token flow. Box needs its own registered OAuth application and server-side rotating-refresh-token handling. Provider tokens/metadata tables require strict owner isolation; service-role access stays inside authenticated edge functions.

For cross-origin Quick Capture, use an explicit one-time handoff or the same Supabase auth callback on the capture origin. Do not assume localStorage, cookies or an Unbound browser session is shared between origins. A short-lived, one-time code bound to the same Unbound account is preferred when the capture origin cannot independently restore its Supabase session. Quick Capture must resolve the account's same default provider and use the same upload and metadata path.

### Reliability and migration compatibility

On capture, store a bounded local pending blob in IndexedDB with attachment ID/idempotency key and show `Waiting to upload`. Retry with exponential backoff and a bounded attempt window; use provider upload sessions for larger files. Mark cloud saved only after provider confirmation and metadata commit. Keep a visible retry/reconnect/download-local action for full quota, revoked consent or network errors. Never silently fall back to Unbound storage or another provider. Warn before discarding a pending local-only capture.

Existing Base64 references remain readable and unchanged. New external references use a versioned metadata shape. Provider disconnect removes only Unbound's token record and preference; it never deletes cloud files. Note deletion removes metadata only after explicit user intent and never deletes cloud binaries by default. Switching default provider affects new uploads only.

Before any database rollout, prepare additive migrations, RLS policies, function tests and a rollback plan. No production schema or project was changed in this audit.

## Cost and traffic estimate

These are planning estimates, not an invoice forecast. Assumptions: all subscribers are active once per day; each client downloads one 100 KiB lightweight notebook state daily; clients upload one 25 KiB text/metadata delta daily; attachment bytes are uploaded/downloaded directly with the user's provider and do not traverse Supabase; no realtime traffic; one Supabase production project; no unusual auth abuse; Cloudflare Pages serves the static app. Daily read/write sizes are intentionally conservative for a small text-only planner and must be replaced by measured median/p95 payloads.

| Subscribers | Estimated Supabase database egress / month | Base plan allowance comparison | Planning view |
|---:|---:|---|---|
| 100 | ~0.37 GB | Below current Free uncached 5 GB | No egress overage expected; production compute/backup requirements may still favour Pro. |
| 1,000 | ~3.7 GB | Below current Free uncached 5 GB, but close once other services are included | Monitor combined service egress; Pro includes 250 GB uncached quota. |
| 10,000 | ~37 GB | Above Free; within Pro 250 GB | No egress overage under assumptions; likely the fixed database/compute plan and support needs dominate. |

Calculation: 125 KiB/day/subscriber × 30 days × subscribers. This excludes extra full-document transfers caused by edits, multi-device use, reloads, retries, large notebook JSON, auth and edge-function responses. For comparison, 1 MiB of full notebook data fetched daily by 10,000 users is about 293 GB/month by itself, above a 250 GB quota. Embedded attachments can make that much larger.

Supabase's [current egress documentation](https://supabase.com/docs/guides/platform/manage-your-usage/egress) lists Free at 5 GB uncached and 5 GB cached egress, and Pro at 250 GB of each; uncached overage is $0.09/GB and cached overage $0.03/GB. Supabase's [pricing page](https://supabase.com/pricing) lists Pro at $25/month before additional compute/usage. Cloudflare Pages may have other costs based on plan/use. These shared platform costs cannot be given as a reliable per-subscriber amount without measured payloads, user activity, chosen Supabase plan and provider/API behavior. Personal cloud storage shifts file capacity/download responsibility to each user's provider but does not remove Supabase database/auth, static hosting, edge function, provider API quota or support costs.

## Required before live provider implementation

- Supabase usage export or dashboard figures for 29 Oct–1 Nov, especially uncached Database/PostgREST egress, Auth and Edge Functions, plus current plan and billing-cycle quota.
- Confirmed deployment path for Supabase Edge Functions and additive SQL migrations on the isolated development project only.
- Google OAuth consent configuration for the separated Drive scope, redirect URI(s), verification status and secret availability in Supabase Edge Function secrets.
- Dropbox app registration with production/development redirect URIs, offline access and file-content API access enabled.
- Box developer app registration, redirect URIs, scopes and refresh-token configuration.
- Explicitly listed origins for the existing Unbound preview and the eventual standalone Quick Capture deployment.

## Phase C–F — implementation status on the isolated feature branch

The audit findings above describe the original development ref. The following implementation has since been added on `feature/personal-cloud-storage-audit-20261106`:

- Added an additive Supabase migration for owner-scoped storage preferences and attachment metadata, plus a server-only encrypted connection table. RLS and a database constraint prevent selecting an unconnected provider. The migration has **not** been applied to any Supabase project.
- Added a shared browser storage service with Google Drive, Dropbox and Box adapter paths, PKCE authorization, direct provider uploads/downloads and metadata-only Supabase writes. New file additions use this path; older Base64 attachments remain readable and are not migrated.
- Added an authenticated edge-function broker for OAuth code exchange and token refresh. Refresh tokens are AES-GCM encrypted server-side; short-lived access tokens stay in memory. The function does not proxy file bytes.
- Removed Drive permission from the Google identity sign-in scopes. Drive consent is requested separately by the storage flow. Existing Google Calendar and Tasks scopes remain.
- Added a bounded IndexedDB attachment queue for offline/pending captures. In-app Quick Capture uses the Notes & Ideas attachment route and therefore the same selected provider. The future separate-origin Quick Capture app is **not** implemented; it will need its own authenticated session or a narrowly scoped handoff and an explicit allowed origin.
- Added Settings → Storage & Backups for account-level **attachment destination** selection and connection status. Notebook-backup provider selection remains in the older backup flow and is still device/notebook scoped; account-level backup preference, Box notebook backups and last-successful-backup status remain unfinished.
- Expanded CSP for provider API, upload and OAuth endpoints. Added mocked broker, migration/RLS, OAuth and adapter tests.

Verification in this workspace: `npm run check`, `npm test` (145 passing), `npm run build`, and `git diff --check` pass. Provider calls in tests are mocked; no Google, Dropbox or Box live OAuth/upload smoke test has been run. Browser end-to-end tests could not run because Playwright Chromium is unavailable in this environment. No Supabase migration/function deployment or Cloudflare preview deployment was performed. No provider credentials were available, and Supabase usage dashboard metrics remain unavailable; the traffic attribution above is therefore still a confirmed payload risk, not an exact measured cause.

Required before enabling live providers: configure exact development origins and redirect URIs, register each provider application, store broker secrets in the isolated development Supabase project, apply the migration there, deploy the edge function, then run live consent/upload/download/reconnect tests. Do not configure these secrets in browser code. Notebook backup integration and standalone Quick Capture origin/session integration need follow-up implementation before the complete requested architecture is finished.
