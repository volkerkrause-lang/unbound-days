# Personal cloud storage: development activation runbook

This runbook activates the feature on the isolated Unbound development project. It does not authorize production changes. The development Supabase project currently configured in `account-config.js` is `msgitgnzgfrsaxgklohy`.

## 1. Get a working feature preview

The current Cloudflare Pages branch-preview address returned “Deployment Not Found,” including after the draft PR was opened. In the Cloudflare dashboard, open the `unbound-development` Pages project and check:

- Git integration is still connected to `volkerkrause-lang/unbound-days`.
- Preview deployments are enabled for non-production branches and pull requests.
- The preview build command and output directory match the existing development build.
- The latest feature branch commit `61588f9` has a successful Pages deployment.

Use the exact preview URL shown by Cloudflare in the next steps. Do not assume the branch-derived URL is correct. Do not change the production branch or production project settings.

## 2. Register or configure provider applications

Provider console links:

- [Google Cloud Console — OAuth clients](https://console.cloud.google.com/auth/clients)
- [Dropbox App Console](https://www.dropbox.com/developers/apps)
- [Box Developer Console](https://app.box.com/developers/console)

Use Web application / user-authorised OAuth. Keep the existing Google Supabase callback URI configured; add the Unbound app callback instead of replacing it. Google requires an exact redirect URI match, including scheme and trailing slash. The app's current callback is the active Unbound origin plus its current path (usually `/`). If the capture route is served at `/quick-capture.html`, add that exact path too. Register the exact feature-preview host after Cloudflare provides it.

Provider-specific settings:

- **Google Drive:** enable the Google Drive API. Keep the `drive.file` scope as a separate consent from Google sign-in. The existing public client ID is in `cloud-config.js`; its matching client secret belongs only in Supabase Edge Function secrets. Google OAuth documentation: [Web server OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server).
- **Dropbox:** enable `files.content.read`, `files.content.write`, and `files.metadata.read`; configure offline refresh-token access and the exact redirect URI. Reuse the existing app if its `Unbound Days` backups need to remain visible. Dropbox documentation: [OAuth guide](https://developers.dropbox.com/oauth-guide).
- **Box:** create a user OAuth 2.0 app with PKCE, refresh-token support, and the read/write scopes needed for file and folder operations. Add the exact redirect URI. Put its public client ID in `cloud-config.js` as `boxClientId`; never put its secret there. Box refresh tokens are single-use, so verify that a refresh returns a replacement token. Box documentation: [Security, tokens and scopes](https://developer.box.com/guides/security).

Provider OAuth consoles may require app verification, admin approval or a test-user list before external users can connect. Complete any provider-specific review before public release.

## 3. Configure the isolated Supabase project

Open the [Supabase development project](https://supabase.com/dashboard/project/msgitgnzgfrsaxgklohy). In **SQL Editor**, inspect the pending migration and apply only [`202611060001_personal_storage.sql`](../supabase/migrations/202611060001_personal_storage.sql) to this development project. It creates new tables and policies; it does not migrate existing files.

In **Edge Functions → Secrets**, set:

| Secret | Value |
|---|---|
| `APP_ORIGINS` | Exact comma-separated origins, no trailing slash. Keep existing origins used by `google-connection` and `delete-account`, and add the stable development origin plus the exact feature preview origin. Add the standalone Quick Capture origin only when it exists. Never use `*`. |
| `STORAGE_TOKEN_KEY` | A fresh 32-byte random key, base64 encoded. Generate locally with `openssl rand -base64 32`; do not commit or send it in chat. Keep it stable; changing it requires re-encrypting saved tokens or users must reconnect. |
| `GOOGLE_STORAGE_CLIENT_ID` | Matching Google web OAuth client ID. |
| `GOOGLE_STORAGE_CLIENT_SECRET` | Matching Google web OAuth client secret. |
| `DROPBOX_APP_KEY` | Dropbox app key (public identifier; must match the client configuration). |
| `DROPBOX_APP_SECRET` | Dropbox app secret. |
| `BOX_CLIENT_ID` | Box OAuth client ID. |
| `BOX_CLIENT_SECRET` | Box OAuth client secret. |

The current public Google and Dropbox identifiers are already present in `cloud-config.js`. The Box client ID is blank and needs the value from its Box app registration. Do not put provider secrets, the Supabase service-role key, or `STORAGE_TOKEN_KEY` in `cloud-config.js`, GitHub, or browser code.

In Supabase **Authentication → URL Configuration**, add the exact development and feature-preview origins to allowed redirect URLs while preserving existing entries. Keep production settings unchanged.

## 4. Deploy the Edge Function to development

After confirming the active Supabase CLI project reference is `msgitgnzgfrsaxgklohy`, deploy only this function:

```sh
supabase functions deploy personal-storage --project-ref msgitgnzgfrsaxgklohy
```

The function reads Supabase URL and service-role credentials from its managed environment. Do not pass the service-role key on the command line. The function verifies the user's bearer token itself; `verify_jwt = false` in `supabase/config.toml` is intentional.

## 5. Live verification checklist

Use a dedicated test Unbound account and provider test accounts. For each provider independently:

1. Connect and verify that the provider's consent is separate from Google identity sign-in.
2. Upload an image and PDF; check that the binary appears only in that provider account and that Supabase stores metadata only.
3. Open/download the attachment from another device/session signed into the same Unbound account.
4. Reload and verify refresh works without asking the user to connect storage again.
5. Test disconnect, then reconnect. Confirm disconnect does not delete provider files.
6. Test backup, list, restore and retention using disposable test data only.
7. Test offline capture, retry, expired/revoked consent and provider quota failure. Confirm no premature “saved” state and no silent fallback.
8. Confirm account A cannot read account B metadata/files through Unbound.

Do not use the owner's personal files for destructive tests. Provider integrations remain “not live verified” until these checks pass.

## 6. Quick Capture and production boundary

The in-app Quick Capture already uses the shared storage path. A standalone app hosted on a different origin still needs its own authenticated Supabase session for the same Unbound account, or a separately reviewed one-time account handoff. Browser sessions and local storage do not cross origins. No cloud connection should be repeated once that account session is established.

The standalone deployment origin has not been chosen, so it cannot yet be allowlisted. Production migration, production secrets, public OAuth verification and merging the draft PR remain separate release decisions. Do not apply this runbook to production.
