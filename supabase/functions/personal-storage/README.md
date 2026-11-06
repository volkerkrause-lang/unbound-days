# Personal storage function configuration

Deploy this function only to the isolated development Supabase project after applying `202611060001_personal_storage.sql` there. Do not apply the migration or set environment variables on production as part of this branch.

Required Edge Function secrets:

- `APP_ORIGINS`: comma-separated exact HTTPS origins allowed to invoke the function. Include the Unbound development preview and, when built, the standalone Quick Capture origin.
- `STORAGE_TOKEN_KEY`: base64 encoding of exactly 32 random bytes. Keep it separate from the database and rotate only with a planned token re-encryption procedure.
- `GOOGLE_STORAGE_CLIENT_ID` and `GOOGLE_STORAGE_CLIENT_SECRET`: matching Google OAuth web client. Register the exact callback URL shown by the Unbound development origin (currently origin plus `/`). The app requests `drive.file` separately from account sign-in.
- `DROPBOX_APP_KEY` and `DROPBOX_APP_SECRET`: matching Dropbox application; enable `files.content.read`, `files.content.write` and `files.metadata.read`; Dropbox uses `files.content.write` for deletion as well, and register the exact callback URL. Reuse the existing Dropbox app registration if existing `/Unbound Days` backups must remain visible.
- `BOX_CLIENT_ID` and `BOX_CLIENT_SECRET`: matching Box OAuth application with PKCE enabled, refresh-token support and the file upload/download/delete scopes configured in Box Developer Console. Register the exact callback URL.

Only client IDs/app keys belong in browser configuration. Secrets and refresh-token encryption keys must remain Edge Function secrets. Notebook backups use the existing Google Drive `Unbound` folder and Dropbox `/Unbound Days` folder where the same OAuth app is configured; Box uses an `Unbound` folder. Account-level automatic backups are throttled to at most once per six hours and retain up to 20 matching Unbound snapshot files. The browser receives short-lived access tokens only in memory; file bodies are transferred directly to the selected provider. The Supabase function never receives attachment bytes.

Before enabling a provider, verify its redirect URI, requested scopes, CORS behavior and token refresh/rotation with a test account. A provider is not live until that smoke test succeeds. Supabase `APP_ORIGINS` must include every active Unbound origin exactly; do not use a wildcard.
