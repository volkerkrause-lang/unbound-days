# Persistent Google connection — development activation

Prepared on branch `development/google-persistent-connection`, based on Classic & Clean mobile `2b67841`. Production stays unchanged. This requires backend activation before replacing the existing development preview. Merely publishing frontend files is insufficient.

## Configure Supabase development

Project: `msgitgnzgfrsaxgklohy`.

1. Authentication → URL Configuration: set **Site URL** to `https://unbound-development.pages.dev/` (remove `localhost` as default). Add exact Redirect URLs:
   - `https://unbound-development.pages.dev/`
   - `https://development-classic-clean-mo.unbound-development.pages.dev/`
   - The exact preview root for this branch after Cloudflare returns it.
   Keep local URLs only for local testing. Do not use wildcard release redirects. The callback must return to the same origin where PKCE started; a separate hostname cannot read its verifier or notebook.
2. Apply `supabase/migrations/202610160001_google_connections.sql` to this development project only. This adds a new RLS-protected table, does not modify notebook content, and cascades grants on account deletion. Browser roles have no permissions on it; only the server service role accesses ciphertext.
3. Configure Edge Function secrets, never frontend configuration or Git:
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: the **same OAuth client** as Supabase Authentication → Google. The secret must stay on the server.
   - `GOOGLE_TOKEN_KEY`: base64 encoding of 32 cryptographically random bytes for AES-256-GCM. Keep it stable. Replacing it without re-encrypting records requires consent again.
   - `APP_ORIGINS`: comma-separated exact development frontend origins, without trailing slashes. Include the two hosts above and the returned branch preview host. Preserve origins needed by the existing delete-account function; this secret is shared between functions.
4. Deploy `google-connection` to the development project, using the repository function/config. `verify_jwt = false` is intentional: the handler checks every bearer JWT with Supabase `auth.getUser`. It rejects unauthorized origins and binds refreshed Google subject/client/scopes to the authenticated user's Google identity. No caller-supplied user ID is accepted.

## Google Cloud

Use existing **Unbound Web App** OAuth client. Its authorized redirect URI remains `https://msgitgnzgfrsaxgklohy.supabase.co/auth/v1/callback`. This redirect flow does not use GIS popup JavaScript origins. Calendar API, Tasks API and Drive API must be enabled. The requested Drive permission is `drive.file`, limited to files Unbound creates or the user opens with it.

For durable public use, move the OAuth consent app out of **Testing** and complete Google's verification requirements for the requested scopes. Google external apps in Testing normally receive refresh tokens that expire after seven days for these scopes. Revoking access, security events, account restrictions and provider policies can still require consent; no application can promise access forever.

## Activate and verify

After backend setup, publish this branch to a development preview. Sign in with Google once and grant all four API scopes. Login now requests offline access; Connect Google explicitly requests fresh consent when needed. the callback transfers the grant to the authenticated backend. Refresh credentials are encrypted at rest and stripped from the browser's persisted Supabase session. Short-lived Google access tokens are held in app memory.

Verify with the owner's account (never create/delete personal records just for testing):

- iPad Safari and the reported iPad browser: Google sign-in returns to the initiating hosted URL, never `localhost`; no popup is required.
- Calendar and Tasks load, Drive reports a confirmed backup. Check existing records rather than test writes unless authorized.
- Reload, background/foreground, and return after an hour: connection renews without another prompt.
- Log into the same Unbound account on mobile and desktop, including password login: server grant restores automatically; chosen calendar settings remain per device.
- Log out: access clears locally without revoking the server grant. Explicit Disconnect removes the server grant for all devices; already-issued short-lived access tokens can remain valid until expiry.
- Partial consent, revoked grant and offline mode show an honest reconnect/error state; notebook writes remain locally recoverable.
- Account switching cannot access a different user's Google grant. No refresh credentials appear in notebook exports or browser session storage.

Automated coverage: redirect options, storage stripping, device restoration, renewal coalescing, logout race, encryption/tamper detection, server origin/auth/account/client/scope validation, RLS grants and cascade; existing calendar/tasks/recovery tests. Live Google/iPad behavior remains unverified until configuration and real consent succeed.
