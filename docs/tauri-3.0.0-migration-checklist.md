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
- [x] Initialize `src-tauri` with window config matching current app:
- frame disabled
- hidden title bar
- minimum width/height
- custom icon
- [x] Keep renderer build output path aligned with Tauri config.
- [x] Add a thin JS adapter (`window.lp` compatible wrapper) for Tauri invoke/event APIs.

## Phase 2 - Command Parity (Critical)
Implement Tauri command equivalents for each current Electron action:

### App and window
- [x] `app:version`
- [x] `app:quit`
- [x] `app:startup:get`
- [x] `app:startup:set`
- [x] `window:minimize`
- [x] `window:toggleMaximize`
- [x] `window:isMaximized`
- [x] `window:close`
- [x] `view:getFullscreen`
- [x] `view:setFullscreen`
- [x] `view:zoomIn` (compat no-op in Tauri shim)
- [x] `view:zoomOut` (compat no-op in Tauri shim)
- [x] `view:zoomReset` (compat no-op in Tauri shim)

### File operations
- [x] `file:open`
- [x] `file:openPath`
- [x] `file:save`
- [x] `file:saveAs`
- [x] `file:autoSave`
- [x] `file:exists`
- [ ] `file:exportPdf` (placeholder error response; needs real PDF pipeline)
- [x] `file:exportTxt`
- [x] `file:exportHtml`

### Editor actions
- [x] `edit:undo`
- [x] `edit:redo`
- [x] `edit:cut`
- [x] `edit:copy`
- [x] `edit:paste`
- [x] `edit:selectAll`

### Update flow
- [x] `update:check`
- [x] `update:download`
- [x] `update:install`
- [x] Emit events equivalent to preload bridge:
- `update:available`
- `update:none`
- `update:progress`
- `update:downloaded`
- `update:error`

### Download/OS integration
- [x] `download:pause` (compat no-op in Tauri shim)
- [x] `download:resume` (compat no-op in Tauri shim)
- [x] `download:cancel` (compat no-op in Tauri shim)
- [x] `download:openFolder`
- [x] `download:openFile`

### Spell and misc
- [x] `spell:replace`
- [x] `spell:add` (compat no-op in Tauri shim)
- [x] `git:branch` (optional in production; keep for status feature parity)

## Phase 3 - Event Parity
Current renderer expects these event hooks:
- [ ] `onDownloadStarted` (hook exists; native download event source still pending)
- [ ] `onDownloadProgress` (hook exists; native download event source still pending)
- [ ] `onDownloadDone` (hook exists; native download event source still pending)
- [ ] `onDownloadError` (hook exists; native download event source still pending)
- [x] `onUpdateAvailable`
- [x] `onUpdateNone`
- [x] `onUpdateProgress`
- [x] `onUpdateDownloaded`
- [x] `onUpdateError`
- [ ] `onSpellContext` (hook exists; native spell context emission still pending)

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
