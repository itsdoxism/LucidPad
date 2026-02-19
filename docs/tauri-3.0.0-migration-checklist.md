# LucidPad 3.0.0 - Electron to Tauri Migration Checklist

This checklist is designed to migrate the current Electron app (0.2.x) to a Tauri-based app for 3.0.0 with minimum renderer rewrite.

## Scope
- Keep current renderer UX/flows as-is where possible.
- Replace Electron main/preload IPC with Tauri commands + events.
- Keep app update flow custom in renderer.
- Ship 3.0.0 as a clean major release.

## Target Architecture
- Frontend: existing renderer (`src/renderer`) continues to run in a webview.
- Backend: Rust commands in `src-tauri` replace `src/main/main.js` actions.
- Bridge: expose a compatibility API so renderer still uses `api.action(name, payload)` shape.

## Phase 0 - Freeze and Baseline
- [ ] Create a final Electron baseline tag from stable 0.2.x (for rollback).
- [ ] Verify 0.2.x release assets include updater metadata and installer.
- [ ] Record feature parity baseline (file ops, tabs, trash, update, spell, startup, export).

## Phase 1 - Add Tauri Skeleton
- [ ] Initialize `src-tauri` with window config matching current app:
- frame disabled
- hidden title bar
- minimum width/height
- custom icon
- [ ] Keep renderer build output path aligned with Tauri config.
- [ ] Add a thin JS adapter (`window.lp` compatible wrapper) for Tauri invoke/event APIs.

## Phase 2 - Command Parity (Critical)
Implement Tauri command equivalents for each current Electron action:

### App and window
- [ ] `app:version`
- [ ] `app:quit`
- [ ] `app:startup:get`
- [ ] `app:startup:set`
- [ ] `window:minimize`
- [ ] `window:toggleMaximize`
- [ ] `window:isMaximized`
- [ ] `window:close`
- [ ] `view:getFullscreen`
- [ ] `view:setFullscreen`
- [ ] `view:zoomIn`
- [ ] `view:zoomOut`
- [ ] `view:zoomReset`

### File operations
- [ ] `file:open`
- [ ] `file:openPath`
- [ ] `file:save`
- [ ] `file:saveAs`
- [ ] `file:autoSave`
- [ ] `file:exists`
- [ ] `file:exportPdf`
- [ ] `file:exportTxt`
- [ ] `file:exportHtml`

### Editor actions
- [ ] `edit:undo`
- [ ] `edit:redo`
- [ ] `edit:cut`
- [ ] `edit:copy`
- [ ] `edit:paste`
- [ ] `edit:selectAll`

### Update flow
- [ ] `update:check`
- [ ] `update:download`
- [ ] `update:install`
- [ ] Emit events equivalent to preload bridge:
- `update:available`
- `update:none`
- `update:progress`
- `update:downloaded`
- `update:error`

### Download/OS integration
- [ ] `download:pause`
- [ ] `download:resume`
- [ ] `download:cancel`
- [ ] `download:openFolder`
- [ ] `download:openFile`

### Spell and misc
- [ ] `spell:replace`
- [ ] `spell:add`
- [ ] `git:branch` (optional in production; keep for status feature parity)

## Phase 3 - Event Parity
Current renderer expects these event hooks:
- [ ] `onDownloadStarted`
- [ ] `onDownloadProgress`
- [ ] `onDownloadDone`
- [ ] `onDownloadError`
- [ ] `onUpdateAvailable`
- [ ] `onUpdateNone`
- [ ] `onUpdateProgress`
- [ ] `onUpdateDownloaded`
- [ ] `onUpdateError`
- [ ] `onSpellContext`

Map each to Tauri event emit/listen with identical payload shapes.

## Phase 4 - Updater Strategy (Electron -> Tauri)
Direct in-place updater migration from Electron binary to Tauri binary is usually unreliable.
Use a bridge strategy:
- [ ] Last Electron release (2.x) should show a migration banner for 3.0.0.
- [ ] Provide explicit CTA: download/install LucidPad 3.0.0.
- [ ] Keep old update endpoint active for emergency 2.x patches.

## Phase 5 - Build and Release Pipeline
- [ ] Add Tauri build scripts (debug + release).
- [ ] Configure signing/notarization as needed for target OS.
- [ ] Configure Tauri updater endpoint and metadata.
- [ ] Validate GitHub release artifacts for Tauri update channel.

## Phase 6 - QA Matrix
Run all tests on packaged builds, not dev mode only.

### Functional
- [ ] Open/save/save as
- [ ] Auto-save
- [ ] Export (PDF/TXT/HTML)
- [ ] Window controls and fullscreen
- [ ] Spellcheck context behavior
- [ ] Update modal/check/download/install
- [ ] Startup toggle

### Regression
- [ ] Custom titlebar and toolbar layout
- [ ] View mode transitions
- [ ] Background media (image/mp4) + adaptive vibe
- [ ] i18n language switching persistence

## Suggested Compatibility Adapter
Keep renderer code stable by routing through one adapter:
- Electron mode: use existing `window.lp` from preload.
- Tauri mode: expose same methods from a Tauri shim.

Adapter contract:
- `action(name, payload)` -> Promise
- `onDownloadStarted(handler)`
- `onDownloadProgress(handler)`
- `onDownloadDone(handler)`
- `onDownloadError(handler)`
- `onUpdateAvailable(handler)`
- `onUpdateNone(handler)`
- `onUpdateProgress(handler)`
- `onUpdateDownloaded(handler)`
- `onUpdateError(handler)`
- `onSpellContext(handler)`

## Definition of Done for 3.0.0
- [ ] All command/event parity items implemented.
- [ ] No critical UX regressions vs 0.2.x baseline.
- [ ] Packaged updater path verified end-to-end on real machine.
- [ ] Migration messaging from 2.x to 3.0.0 shipped.

## Notes
- Keep this file updated as each item is implemented.
- Prefer migrating in small PRs by feature slice (window/file/update) rather than one large rewrite.
