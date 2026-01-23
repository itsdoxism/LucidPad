const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs/promises");

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0b0b",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "..", "preload", "preload.js")
    }
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  mainWindow = win;
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  const updateUrl = process.env.LP_UPDATE_URL;
  if (updateUrl) {
    autoUpdater.setFeedURL({ provider: "generic", url: updateUrl });
  }

  autoUpdater.on("update-available", () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("lp:update:available");
    }
  });

  autoUpdater.on("update-downloaded", () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    dialog.showMessageBox(win, {
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      title: "Update ready",
      message: "An update has been downloaded. Restart to apply it."
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on("error", (error) => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("lp:update:error", { message: error?.message || "Update error" });
    }
  });

  autoUpdater.checkForUpdatesAndNotify();
}

ipcMain.handle("lp:action", async (_event, { name, payload } = {}) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    return { canceled: true };
  }

  switch (name) {
    case "file:open": {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Open File",
        properties: ["openFile"],
        filters: [
          { name: "Text", extensions: ["txt", "md", "html"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = filePaths[0];
      const content = await fs.readFile(filePath, "utf8");
      return { canceled: false, filePath, content };
    }
    case "file:save":
    case "file:saveAs": {
      const content = payload?.content ?? "";
      let filePath = payload?.filePath ?? "";

      if (!filePath || name === "file:saveAs") {
        const result = await dialog.showSaveDialog(win, {
          title: name === "file:saveAs" ? "Save As" : "Save File",
          defaultPath: "LucidPad.txt",
          filters: [
            { name: "Text", extensions: ["txt"] },
            { name: "Markdown", extensions: ["md"] },
            { name: "All Files", extensions: ["*"] }
          ]
        });

        if (result.canceled || !result.filePath) {
          return { canceled: true };
        }
        filePath = result.filePath;
      }

      await fs.writeFile(filePath, content, "utf8");
      return { canceled: false, filePath };
    }
    case "file:openPath": {
      const filePath = payload?.filePath;
      if (!filePath) {
        return { canceled: true };
      }
      const content = await fs.readFile(filePath, "utf8");
      return { canceled: false, filePath, content };
    }
    case "file:autoSave": {
      const content = payload?.content ?? "";
      const filePath = payload?.filePath ?? "";
      if (!filePath) {
        return { canceled: true };
      }
      await fs.writeFile(filePath, content, "utf8");
      return { canceled: false, filePath };
    }
    case "edit:undo":
      win.webContents.undo();
      return { canceled: false };
    case "edit:redo":
      win.webContents.redo();
      return { canceled: false };
    case "edit:cut":
      win.webContents.cut();
      return { canceled: false };
    case "edit:copy":
      win.webContents.copy();
      return { canceled: false };
    case "edit:paste":
      win.webContents.paste();
      return { canceled: false };
    case "edit:selectAll":
      win.webContents.selectAll();
      return { canceled: false };
    case "view:fullscreen": {
      const next = !win.isFullScreen();
      win.setFullScreen(next);
      return { canceled: false, fullScreen: next };
    }
    case "view:getFullscreen":
      return { canceled: false, fullScreen: win.isFullScreen() };
    case "view:setFullscreen": {
      const enabled = !!payload?.enabled;
      win.setFullScreen(enabled);
      return { canceled: false, fullScreen: enabled };
    }
    case "view:zoomIn": {
      const level = await win.webContents.getZoomLevel();
      await win.webContents.setZoomLevel(level + 0.5);
      return { canceled: false };
    }
    case "view:zoomOut": {
      const level = await win.webContents.getZoomLevel();
      await win.webContents.setZoomLevel(level - 0.5);
      return { canceled: false };
    }
    case "view:zoomReset":
      await win.webContents.setZoomLevel(0);
      return { canceled: false };
    case "app:quit":
      app.quit();
      return { canceled: false };
    case "app:version":
      return { canceled: false, version: app.getVersion() };
    case "file:exportPdf": {
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export PDF",
        defaultPath: "LucidPad.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });

      if (canceled || !filePath) {
        return { canceled: true };
      }

      const pdfData = await win.webContents.printToPDF({});
      await fs.writeFile(filePath, pdfData);
      return { canceled: false, filePath };
    }
    case "file:exportTxt": {
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export TXT",
        defaultPath: "LucidPad.txt",
        filters: [{ name: "Text", extensions: ["txt"] }]
      });

      if (canceled || !filePath) {
        return { canceled: true };
      }

      const content = payload?.content ?? "";
      await fs.writeFile(filePath, content, "utf8");
      return { canceled: false, filePath };
    }
    case "file:exportHtml": {
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export HTML",
        defaultPath: "LucidPad.html",
        filters: [{ name: "HTML", extensions: ["html"] }]
      });

      if (canceled || !filePath) {
        return { canceled: true };
      }

      const content = payload?.content ?? "";
      await fs.writeFile(filePath, content, "utf8");
      return { canceled: false, filePath };
    }
    default:
      return { canceled: false };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
