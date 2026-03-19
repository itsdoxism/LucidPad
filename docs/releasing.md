# LucidPad Release Flow

## Versioning
- Keep `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` on the same version.
- Add a matching entry to `src/renderer/public/release-notes.json`.

## Signing
- Tauri updater requires a signing key.
- Keep the private key out of git. This repo ignores `src-tauri/.tauri/`.
- `src-tauri/tauri.conf.json` must contain the matching public key.
- Set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` before running the release build when the local key is password-protected.

## Local Release Build
- In PowerShell, set the updater password first:
- `$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<your-password>"`
- Run `npm run release`
- The release script will:
- build signed Windows bundles
- collect installer and `.sig` files
- generate `latest.json`
- write upload instructions to `release/v<version>/UPLOAD.txt`

## GitHub Actions Release
- This repo includes `.github/workflows/release.yml` for automatic Windows releases.
- It runs when you push a tag like `v0.3.0`.
- Add these repository secrets in GitHub:
- `TAURI_SIGNING_PRIVATE_KEY` (the full private key text)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Then push the version tag:
- `git tag v0.3.0`
- `git push origin v0.3.0`
- The workflow builds the app, signs updater assets, uploads installers and `.sig` files, and publishes `latest.json` to the GitHub Release automatically.

## GitHub Release Upload
- Create or edit the GitHub Release with tag `v<version>`.
- Upload every file from `release/v<version>/`.
- The app is configured to fetch:
- `https://github.com/JustDream-LoL/LucidPad/releases/latest/download/latest.json`

## Validation
- Install the previous packaged version first.
- Launch the app from the installed location.
- Trigger `Check for updates`.
- Confirm the app downloads the new release, reaches the custom restart state, and restarts into the new version.
