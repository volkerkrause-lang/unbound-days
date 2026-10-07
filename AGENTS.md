# Default update and preservation process

For every Unbound Days change, follow this process without asking the owner to repeat it:

1. Fetch the GitHub main branch and inspect current changes. Preserve the owner's work.
2. Keep the `unbound-days-v1` saved notebook key and backwards-compatible import schema. Never clear entries on an update. Cover IDs must remain stable.
3. Save writing immediately locally, maintain the IndexedDB recovery mirror, and show storage failures truthfully. Prevent other tabs from silently overwriting changes.
4. Google appointments default to the user's chosen writable calendar when connected. Keep failed saves in the open editor. Never claim Google saving worked before its API confirms it.
5. After consent for notebook backup, automatically store immutable notebook snapshots in the app's private Google Drive data folder while connected. Report expired sessions and backup failures. Restore only on explicit user selection; never overwrite from another device automatically.
6. Never commit personal entries, calendar caches, credentials, access tokens, backup files, or uploaded personal covers to this public repository. Only the public OAuth client ID may appear in app configuration.
7. Run syntax checks, calendar/recovery tests, and inspect cover, navigation and reload persistence in the browser. Update service-worker cache version and package every new module/asset.
8. Publish through GitHub main with an expected-head lease. Confirm GitHub Actions passes and open the live Pages app to verify the release. Report blockers clearly; preserve completed improvements.
9. Before changing storage formats, take recovery copies and verify old notebooks import correctly. Browser copies do not replace off-device backups.
