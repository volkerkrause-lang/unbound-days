# Unbound implementation status
Audit date: 2026-10-14. Audit only; no features, service settings or production deployment changed.
Repository: volkerkrause-lang/unbound-days (not unbound).
Audited main: c007985841e2cb3423d1f3c13c26baa8e3360cd1. Version 0.3.34.
Development branch: audit/commercial-readiness-2026-10-14.

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
- [ ] Approval for Group A and proposed architecture.
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
