const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lp", {
  action: (name, payload) => ipcRenderer.invoke("lp:action", { name, payload }),
  onDownloadStarted: (handler) => ipcRenderer.on("download:started", (_event, payload) => handler(payload)),
  onDownloadProgress: (handler) => ipcRenderer.on("download:progress", (_event, payload) => handler(payload)),
  onDownloadDone: (handler) => ipcRenderer.on("download:done", (_event, payload) => handler(payload)),
  onDownloadError: (handler) => ipcRenderer.on("download:error", (_event, payload) => handler(payload)),
  onUpdateAvailable: (handler) => ipcRenderer.on("update:available", (_event, payload) => handler(payload)),
  onUpdateNone: (handler) => ipcRenderer.on("update:none", () => handler()),
  onUpdateProgress: (handler) => ipcRenderer.on("update:progress", (_event, payload) => handler(payload)),
  onUpdateDownloaded: (handler) => ipcRenderer.on("update:downloaded", () => handler()),
  onUpdateError: (handler) => ipcRenderer.on("update:error", (_event, payload) => handler(payload)),
  onSpellContext: (handler) => ipcRenderer.on("spell:context", (_event, payload) => handler(payload))
});
