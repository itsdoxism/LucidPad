const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lp", {
  action: (name, payload) => ipcRenderer.invoke("lp:action", { name, payload })
});
