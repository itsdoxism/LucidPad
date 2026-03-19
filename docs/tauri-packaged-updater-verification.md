# LucidPad Tauri Packaged Updater Verification

Run this on a real Windows machine using packaged builds. Do not treat `tauri dev` as updater validation.

## Preconditions
- `src-tauri/tauri.conf.json` points to the production updater endpoint.
- The signing/public key pair in `src-tauri/.tauri/` matches the key used to sign update artifacts.
- You have two app versions available:
- installed baseline build, for example `0.2.9`
- newer release build, for example `0.3.0`
- The newer release is published with installer/bundle assets and `latest.json`.

## Release Artifact Checks
- Set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` for the updater key.
- Build the packaged app with `npm run release`.
- Confirm the release output contains the Windows installer/bundle and updater metadata.
- Open `latest.json` and verify:
- `version` matches the new release
- download URLs resolve
- signature/public key data is present and valid

## Baseline Install
- Uninstall older local test copies if they use a different signing identity.
- Install the baseline packaged build.
- Launch the app normally, not from the build output folder.
- Confirm these baseline paths still work:
- open/save/save as
- autosave
- export PDF/TXT/HTML
- custom title bar window controls
- startup toggle

## Update Check Flow
- Ensure the machine can reach the configured updater endpoint.
- Trigger `Check for updates` from the app.
- Verify the update modal shows the expected target version.
- Choose `Later`, relaunch, and confirm skip behavior is correct.
- Trigger `Check for updates` again manually and confirm manual checks still surface the update.

## Download And Install Flow
- Start the update download.
- Verify progress UI advances and completes without renderer errors.
- Confirm the app reaches the ready/restart state.
- Allow install/restart to complete.
- After restart, verify `About` shows the new version.

## Post-Update Regression Checks
- Re-open existing files and confirm content is intact.
- Verify autosave still writes to the same file path.
- Verify settings persistence:
- language
- accent
- word wrap
- startup
- background media
- Verify updater no longer offers the already-installed version.

## Failure Cases To Exercise
- Invalid or unreachable updater endpoint.
- Wrong public key/signature.
- Missing `latest.json`.
- Download interrupted mid-update.
- User closes the update modal and retries later.

## Exit Criteria
- Update check works from an installed packaged baseline.
- Download completes and install applies successfully.
- App restarts into the new version.
- No critical file, settings, or window-control regressions are observed.
