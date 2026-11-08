# Travel Planner provider setup

Travel Planner attachment metadata is stored in the notebook's existing synced state. File bytes are sent directly to a user's Google Drive, Dropbox or Box account; this feature does not upload files to Supabase Storage. The current UI accepts PDF and image files up to 25 MB. Users can optionally keep a copy in the browser's Cache Storage on that device for offline use; this cache is device-local and is not uploaded or synchronised.

## Google Drive

Google uses Unbound's existing OAuth session and `drive.file` grant. A user who has not granted Drive access must reconnect Google from Settings with Drive file access enabled. Travel file uploads do not run or enable notebook backups. Drive file references are retained in trip metadata; the bytes remain in Drive.

## Dropbox

Dropbox uses the existing app key and a PKCE authorization flow. The travel attachment flow asks the user to connect Dropbox when needed and uploads into the app's Dropbox area under `Unbound Days/Travel`. Dropbox's current client integration keeps the short-lived access token in memory, so a user may need to reconnect after a reload or token expiry. No Dropbox credential is stored in notebook data.

## Box

Box uses OAuth authorization code exchange through the authenticated `box-connection` Supabase Edge Function. The function keeps refresh tokens encrypted server-side; browser code receives short-lived access tokens only. Before enabling Box in a deployed environment:

1. Create a Box OAuth 2.0 application with upload and download scopes, and register the Unbound origins and redirect URL.
2. Set the public client ID in `cloud-config.js` as `boxClientId`.
3. Configure Supabase function secrets `BOX_CLIENT_ID`, `BOX_CLIENT_SECRET`, `BOX_TOKEN_KEY` and the already-used `APP_ORIGINS`. `BOX_TOKEN_KEY` must be a base64 encoding of 32 random bytes.
4. Apply migration `202611080001_box_connections.sql` and deploy the `box-connection` Edge Function.

The Box client secret and token key must never be placed in browser configuration. This repository change does not apply migrations or set provider secrets.

## Calendar export

Google Calendar export is disabled by default on each trip. Enabling it exports dated bookings and activities to the user's configured default calendar. Unbound stores the Google event ID and updates that event when its source booking or activity changes. Unchecking export pauses further updates; it does not delete events already in Google Calendar. Users can remove exported events from Google Calendar themselves.

Timed entries retain an IANA time-zone value, falling back to the trip time zone and then the device time zone. All-day and date-only bookings use Google Calendar all-day events.

## Duplication and archival

Duplicating a trip copies its trip details, bookings and independent activities with new record IDs. It does not copy attachment references, packing check states, saved-idea links, budget costs or Google Calendar event IDs. Archiving a trip preserves its related records and offers a restore action.
