const { app, BrowserWindow, dialog, ipcMain, shell, session, Menu, MenuItem } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs/promises");
const { exec } = require("child_process");

async function resolveExportDefaultPath(fileName, folder) {
  const trimmed = typeof folder === "string" ? folder.trim() : "";
  if (!trimmed) return fileName;
  const resolved = path.resolve(trimmed);
  try {
    await fs.mkdir(resolved, { recursive: true });
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return fileName;
    }
    return path.join(resolved, fileName);
  } catch (_error) {
    return fileName;
  }
}

function decodeUtf16Be(buffer) {
  const swapped = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i += 2) {
    swapped[i] = buffer[i + 1];
    swapped[i + 1] = buffer[i];
  }
  return swapped.toString("utf16le");
}

function detectEncoding(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { encoding: "UTF-8", offset: 3 };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return { encoding: "UTF-16LE", offset: 2 };
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return { encoding: "UTF-16BE", offset: 2 };
  }
  return { encoding: "UTF-8", offset: 0 };
}

function decodeBuffer(buffer) {
  const { encoding, offset } = detectEncoding(buffer);
  const slice = buffer.slice(offset);
  if (encoding === "UTF-16LE") {
    return { encoding, content: slice.toString("utf16le") };
  }
  if (encoding === "UTF-16BE") {
    return { encoding, content: decodeUtf16Be(slice) };
  }
  return { encoding: "UTF-8", content: slice.toString("utf8") };
}

let mainWindow = null;
const downloadItems = new Map();
const WINDOW_MIN_WIDTH = 980;
const WINDOW_MIN_HEIGHT = 680;

function resolveAppIcon(isDev) {
  if (isDev) {
    return path.join(__dirname, "..", "renderer", "public", "logo", "LucidPad.png");
  }
  return path.join(app.getAppPath(), "dist", "renderer", "logo", "LucidPad.png");
}

function createWindow() {
  const isDev = !app.isPackaged;
  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    backgroundColor: "#0b0b0b",
    frame: false,
    titleBarStyle: "hidden",
    icon: resolveAppIcon(isDev),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "..", "preload", "preload.js")
    }
  });

  if (isDev) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(app.getAppPath(), "dist", "renderer", "index.html"));
  }
  win.setMenuBarVisibility(false);
  win.setMenu(null);
  win.webContents.on("context-menu", (event, params) => {
    if (!params.misspelledWord) return;
    event.preventDefault();
    win.webContents.send("spell:context", {
      word: params.misspelledWord,
      suggestions: params.dictionarySuggestions || [],
      x: params.x,
      y: params.y
    });
  });
  mainWindow = win;
}


app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  setupDownloadTracking();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function getMainWindow() {
  return mainWindow || BrowserWindow.getFocusedWindow();
}

function setupDownloadTracking() {
  session.defaultSession.on("will-download", (_event, item, webContents) => {
    const win = webContents ? BrowserWindow.fromWebContents(webContents) : getMainWindow();
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    downloadItems.set(id, item);
    const send = (channel, payload) => {
      if (win) {
        win.webContents.send(channel, payload);
      }
    };

    send("download:started", {
      id,
      filename: item.getFilename(),
      totalBytes: item.getTotalBytes()
    });

    let lastBytes = 0;
    let lastTime = Date.now();
    item.on("updated", (_ev, state) => {
      if (state === "interrupted") {
        send("download:error", { id, message: "Download interrupted." });
        return;
      }
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      const now = Date.now();
      const elapsed = Math.max(1, now - lastTime);
      const delta = received - lastBytes;
      const speed = delta / (elapsed / 1000);
      lastBytes = received;
      lastTime = now;

      send("download:progress", {
        id,
        receivedBytes: received,
        totalBytes: total,
        progress: total > 0 ? received / total : 0,
        speed
      });
    });

    item.once("done", (_ev, state) => {
      downloadItems.delete(id);
      if (state === "completed") {
        send("download:done", {
          id,
          filename: item.getFilename(),
          filePath: item.getSavePath()
        });
      } else {
        send("download:error", { id, message: `Download ${state}.` });
      }
    });
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  const updateUrl = process.env.LP_UPDATE_URL;
  if (updateUrl) {
    autoUpdater.setFeedURL({ provider: "generic", url: updateUrl });
  }

  autoUpdater.on("update-available", (info) => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("update:available", {
        version: info?.version || ""
      });
    }
  });

  autoUpdater.on("update-not-available", () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("update:none");
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("update:progress", {
        receivedBytes: progress.transferred,
        totalBytes: progress.total,
        progress: progress.percent ? progress.percent / 100 : 0,
        speed: progress.bytesPerSecond
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("update:downloaded");
    }
  });

  autoUpdater.on("error", (error) => {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send("update:error", { message: error?.message || "Update error" });
    }
  });

  autoUpdater.checkForUpdates();
}

ipcMain.handle("lp:action", async (_event, { name, payload } = {}) => {
  const win = getMainWindow();
  if (!win) {
    return { canceled: true };
  }

  switch (name) {
    case "git:branch": {
      const repoPath = payload?.repoPath || app.getAppPath();
      return new Promise((resolve) => {
        exec("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }, (error, stdout) => {
          if (error) {
            resolve({ branch: "" });
            return;
          }
          resolve({ branch: stdout.trim() });
        });
      });
    }
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
      const buffer = await fs.readFile(filePath);
      const decoded = decodeBuffer(buffer);
      return { canceled: false, filePath, content: decoded.content, encoding: decoded.encoding };
    }
    case "file:save":
    case "file:saveAs": {
      const content = payload?.content ?? "";
      let filePath = payload?.filePath ?? "";
      const suggestedName = typeof payload?.suggestedName === "string" ? payload.suggestedName : "";
      const preferredExt = typeof payload?.preferredExt === "string" ? payload.preferredExt : "";

      if (!filePath || name === "file:saveAs") {
        const result = await dialog.showSaveDialog(win, {
          title: name === "file:saveAs" ? "Save As" : "Save File",
          defaultPath: suggestedName || "LucidPad.txt",
          filters: preferredExt === "md"
            ? [
              { name: "Markdown", extensions: ["md"] },
              { name: "Text", extensions: ["txt"] },
              { name: "All Files", extensions: ["*"] }
            ]
            : preferredExt === "txt"
              ? [
                { name: "Text", extensions: ["txt"] },
                { name: "Markdown", extensions: ["md"] },
                { name: "All Files", extensions: ["*"] }
              ]
              : [
                { name: "Text", extensions: ["txt"] },
                { name: "Markdown", extensions: ["md"] },
                { name: "All Files", extensions: ["*"] }
              ]
        });

        if (result.canceled || !result.filePath) {
          return { canceled: true };
        }
        filePath = result.filePath;
        if (preferredExt && !filePath.toLowerCase().endsWith(`.${preferredExt}`)) {
          filePath = `${filePath.replace(/\.[^/.]+$/, "")}.${preferredExt}`;
        }
      }

      await fs.writeFile(filePath, content, "utf8");
      return { canceled: false, filePath };
    }
    case "file:openPath": {
      const filePath = payload?.filePath;
      if (!filePath) {
        return { canceled: true };
      }
      const buffer = await fs.readFile(filePath);
      const decoded = decodeBuffer(buffer);
      return { canceled: false, filePath, content: decoded.content, encoding: decoded.encoding };
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
    case "file:exists": {
      const filePath = payload?.filePath;
      if (!filePath) {
        return { exists: false };
      }
      try {
        await fs.access(filePath);
        return { exists: true };
      } catch (_error) {
        return { exists: false };
      }
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
    case "window:minimize":
      win.minimize();
      return { canceled: false };
    case "window:toggleMaximize": {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return { canceled: false, maximized: win.isMaximized() };
    }
    case "window:close":
      win.close();
      return { canceled: false };
    case "window:isMaximized":
      return { canceled: false, maximized: win.isMaximized() };
    case "app:quit":
      app.quit();
      return { canceled: false };
    case "app:version":
      return { canceled: false, version: app.getVersion() };
    case "app:startup:get": {
      const settings = app.getLoginItemSettings();
      return { canceled: false, enabled: !!settings.openAtLogin };
    }
    case "app:startup:set": {
      const enabled = !!payload?.enabled;
      app.setLoginItemSettings({ openAtLogin: enabled });
      const settings = app.getLoginItemSettings();
      return { canceled: false, enabled: !!settings.openAtLogin };
    }
    case "update:check":
      await autoUpdater.checkForUpdates();
      return { canceled: false };
    case "update:download":
      await autoUpdater.downloadUpdate();
      return { canceled: false };
    case "update:install":
      autoUpdater.quitAndInstall();
      return { canceled: false };
    case "spell:replace": {
      const suggestion = payload?.suggestion;
      if (suggestion) {
        win.webContents.replaceMisspelling(suggestion);
      }
      return { canceled: false };
    }
    case "spell:add": {
      const word = payload?.word;
      if (word) {
        win.webContents.session.addWordToSpellCheckerDictionary(word);
      }
      return { canceled: false };
    }
    case "download:pause": {
      const id = payload?.id;
      const item = id ? downloadItems.get(id) : null;
      if (item && !item.isPaused()) {
        item.pause();
      }
      return { canceled: false };
    }
    case "download:resume": {
      const id = payload?.id;
      const item = id ? downloadItems.get(id) : null;
      if (item && item.isPaused()) {
        item.resume();
      }
      return { canceled: false };
    }
    case "download:cancel": {
      const id = payload?.id;
      const item = id ? downloadItems.get(id) : null;
      if (item) {
        item.cancel();
      }
      return { canceled: false };
    }
    case "download:openFolder": {
      const filePath = payload?.filePath;
      if (filePath) {
        await shell.showItemInFolder(filePath);
      }
      return { canceled: false };
    }
    case "download:openFile": {
      const filePath = payload?.filePath;
      if (filePath) {
        await shell.openPath(filePath);
      }
      return { canceled: false };
    }
    case "file:exportPdf": {
      const defaultPath = await resolveExportDefaultPath("LucidPad.pdf", payload?.defaultFolder);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export PDF",
        defaultPath,
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
      const defaultPath = await resolveExportDefaultPath("LucidPad.txt", payload?.defaultFolder);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export TXT",
        defaultPath,
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
      const defaultPath = await resolveExportDefaultPath("LucidPad.html", payload?.defaultFolder);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Export HTML",
        defaultPath,
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
