import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { isEnabled as isAutostartEnabled, enable as enableAutostart, disable as disableAutostart } from "@tauri-apps/plugin-autostart";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";

if (!window.lp && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) {
  const appWindow = getCurrentWindow();
  const listeners = new Map();
  let pendingUpdate = null;
  let downloadedUpdate = null;
  const capabilities = Object.freeze({
    spellAdd: false,
    spellContext: false,
    downloadPauseResume: false,
    downloadCancel: false
  });
  const SPELL_ADD_UNSUPPORTED_MESSAGE =
    "Custom dictionary updates are not supported in this build. Use the native context menu instead.";
  const DOWNLOAD_CONTROL_UNSUPPORTED_MESSAGE =
    "Pause, resume, and cancel are not supported for webview downloads in this build.";

  const on = (eventName, handler) => {
    const set = listeners.get(eventName) || new Set();
    set.add(handler);
    listeners.set(eventName, set);
    return () => {
      const current = listeners.get(eventName);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        listeners.delete(eventName);
      }
    };
  };

  const emit = (eventName, payload) => {
    const set = listeners.get(eventName);
    if (!set || set.size === 0) return;
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (_error) {
      }
    });
  };

  const getErrorMessage = (error, fallback = "Unexpected error") => {
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error.message === "string" && error.message.trim()) return error.message;
    return fallback;
  };
  const unsupportedAction = (message, code) => ({
    canceled: false,
    unsupported: true,
    code,
    error: message
  });

  const isUpdaterUnconfiguredError = (message) => {
    if (!message || typeof message !== "string") return false;
    const value = message.toLowerCase();
    return (
      value.includes("updater does not have any endpoints set") ||
      value.includes("updater pubkey") ||
      value.includes("updater public key")
    );
  };

  const backendAction = async (name, payload) => {
    try {
      return await invoke("lp_action", { name, payload: payload ?? null });
    } catch (error) {
      return { canceled: false, error: getErrorMessage(error) };
    }
  };

  const runUpdateCheck = async () => {
    try {
      if (pendingUpdate && typeof pendingUpdate.close === "function") {
        await pendingUpdate.close();
      }
      pendingUpdate = await checkForUpdate();
      downloadedUpdate = null;
      if (pendingUpdate) {
        emit("update:available", { version: pendingUpdate.version || "" });
      } else {
        emit("update:none");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Update check failed");
      if (isUpdaterUnconfiguredError(message)) {
        const friendly =
          "Updater is not configured for this build. Set plugins.updater.endpoints and plugins.updater.pubkey in src-tauri/tauri.conf.json.";
        emit("update:error", { message: friendly, code: "updater_not_configured" });
        return { canceled: false, error: friendly, code: "updater_not_configured" };
      }
      emit("update:error", { message });
    }
    return { canceled: false };
  };

  const runUpdateDownload = async () => {
    if (!pendingUpdate) {
      const message = "No update available";
      emit("update:error", { message });
      return { canceled: false, error: message };
    }

    let totalBytes = 0;
    let receivedBytes = 0;
    let lastBytes = 0;
    let lastTime = Date.now();

    const emitProgress = (speed = 0) => {
      emit("update:progress", {
        receivedBytes,
        totalBytes,
        progress: totalBytes > 0 ? receivedBytes / totalBytes : 0,
        speed
      });
    };

    try {
      await pendingUpdate.download((event) => {
        if (event.event === "Started") {
          totalBytes = Number(event.data?.contentLength || 0);
          receivedBytes = 0;
          lastBytes = 0;
          lastTime = Date.now();
          emitProgress(0);
          return;
        }
        if (event.event === "Progress") {
          const chunk = Number(event.data?.chunkLength || 0);
          receivedBytes += chunk;
          const now = Date.now();
          const elapsedMs = Math.max(1, now - lastTime);
          const delta = receivedBytes - lastBytes;
          const speed = delta / (elapsedMs / 1000);
          lastBytes = receivedBytes;
          lastTime = now;
          emitProgress(speed);
          return;
        }
        if (event.event === "Finished") {
          emitProgress(0);
        }
      });

      downloadedUpdate = pendingUpdate;
      emit("update:downloaded");
      return { canceled: false };
    } catch (error) {
      const message = getErrorMessage(error, "Update download failed");
      emit("update:error", { message });
      return { canceled: false, error: message };
    }
  };

  const runUpdateInstall = async () => {
    const update = downloadedUpdate || pendingUpdate;
    if (!update) {
      return { canceled: false, error: "No downloaded update" };
    }
    try {
      await update.install();
      return { canceled: false };
    } catch (error) {
      const message = getErrorMessage(error, "Update install failed");
      emit("update:error", { message });
      return { canceled: false, error: message };
    }
  };

  window.lp = {
    capabilities,
    action: async (name, payload) => {
      switch (name) {
        case "app:version": {
          try {
            const version = await getVersion();
            return { canceled: false, version };
          } catch (error) {
            return { canceled: false, version: "", error: getErrorMessage(error) };
          }
        }
        case "app:quit": {
          await appWindow.close();
          return { canceled: false };
        }
        case "app:startup:get": {
          try {
            const enabled = await isAutostartEnabled();
            return { canceled: false, enabled: !!enabled };
          } catch (_error) {
            return { canceled: false, enabled: false };
          }
        }
        case "app:startup:set": {
          try {
            const enabled = !!payload?.enabled;
            if (enabled) {
              await enableAutostart();
            } else {
              await disableAutostart();
            }
            const current = await isAutostartEnabled();
            return { canceled: false, enabled: !!current };
          } catch (error) {
            return { canceled: false, enabled: false, error: getErrorMessage(error) };
          }
        }
        case "window:minimize": {
          await appWindow.minimize();
          return { canceled: false };
        }
        case "window:toggleMaximize": {
          const maximized = await appWindow.isMaximized();
          if (maximized) {
            await appWindow.unmaximize();
          } else {
            await appWindow.maximize();
          }
          return { canceled: false, maximized: await appWindow.isMaximized() };
        }
        case "window:isMaximized": {
          return { canceled: false, maximized: await appWindow.isMaximized() };
        }
        case "window:close": {
          await appWindow.close();
          return { canceled: false };
        }
        case "window:startDragging": {
          await appWindow.startDragging();
          return { canceled: false };
        }
        case "view:fullscreen": {
          const next = !(await appWindow.isFullscreen());
          await appWindow.setFullscreen(next);
          return { canceled: false, fullScreen: next };
        }
        case "view:getFullscreen": {
          return { canceled: false, fullScreen: await appWindow.isFullscreen() };
        }
        case "view:setFullscreen": {
          const enabled = !!payload?.enabled;
          await appWindow.setFullscreen(enabled);
          return { canceled: false, fullScreen: enabled };
        }
        case "view:zoomIn":
        case "view:zoomOut":
        case "view:zoomReset": {
          return { canceled: false };
        }
        case "edit:undo": {
          document.execCommand("undo");
          return { canceled: false };
        }
        case "edit:redo": {
          document.execCommand("redo");
          return { canceled: false };
        }
        case "edit:cut": {
          document.execCommand("cut");
          return { canceled: false };
        }
        case "edit:copy": {
          document.execCommand("copy");
          return { canceled: false };
        }
        case "edit:paste": {
          document.execCommand("paste");
          return { canceled: false };
        }
        case "edit:selectAll": {
          document.execCommand("selectAll");
          return { canceled: false };
        }
        case "spell:replace": {
          const suggestion = typeof payload?.suggestion === "string" ? payload.suggestion : "";
          if (suggestion) {
            document.execCommand("insertText", false, suggestion);
          }
          return { canceled: false };
        }
        case "spell:add": {
          return unsupportedAction(SPELL_ADD_UNSUPPORTED_MESSAGE, "spell_add_unsupported");
        }
        case "update:check": {
          return runUpdateCheck();
        }
        case "update:download": {
          return runUpdateDownload();
        }
        case "update:install": {
          return runUpdateInstall();
        }
        case "download:pause":
        case "download:resume":
        case "download:cancel": {
          return unsupportedAction(DOWNLOAD_CONTROL_UNSUPPORTED_MESSAGE, "download_control_unsupported");
        }
        case "download:openFolder": {
          const filePath = typeof payload?.filePath === "string" ? payload.filePath : "";
          if (filePath) {
            await revealItemInDir(filePath);
          }
          return { canceled: false };
        }
        case "download:openFile": {
          const filePath = typeof payload?.filePath === "string" ? payload.filePath : "";
          if (filePath) {
            await openPath(filePath);
          }
          return { canceled: false };
        }
        case "file:open":
        case "file:openPath":
        case "file:save":
        case "file:saveAs":
        case "file:autoSave":
        case "file:exists":
        case "file:exportPdf":
        case "file:exportTxt":
        case "file:exportHtml":
        case "git:branch": {
          return backendAction(name, payload);
        }
        default: {
          return backendAction(name, payload);
        }
      }
    },
    onDownloadStarted: (handler) => on("download:started", handler),
    onDownloadProgress: (handler) => on("download:progress", handler),
    onDownloadDone: (handler) => on("download:done", handler),
    onDownloadError: (handler) => on("download:error", handler),
    onUpdateAvailable: (handler) => on("update:available", handler),
    onUpdateNone: (handler) => on("update:none", () => handler()),
    onUpdateProgress: (handler) => on("update:progress", handler),
    onUpdateDownloaded: (handler) => on("update:downloaded", () => handler()),
    onUpdateError: (handler) => on("update:error", handler),
    onSpellContext: (handler) => on("spell:context", handler)
  };
}
