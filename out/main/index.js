import { app, Menu, dialog, shell, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import log from "electron-log";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch (e) {
    log.error("Error loading config:", e);
  }
  return {};
}
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    log.error("Error saving config:", e);
  }
}
function getNotesDir(appConfig) {
  return appConfig.notesDir || path.join(app.getPath("userData"), "notes");
}
function ensureNotesDir(notesDir2) {
  if (!fs.existsSync(notesDir2)) {
    fs.mkdirSync(notesDir2, { recursive: true });
  }
}
function isPathWithinNotesDir(filePath, notesDir2) {
  const resolvedPath = path.resolve(filePath);
  const resolvedNotesDir = path.resolve(notesDir2);
  return resolvedPath.startsWith(resolvedNotesDir);
}
const WINDOW_STATE_FILE = path.join(app.getPath("userData"), "window-state.json");
function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, "utf-8"));
    }
  } catch (e) {
    log.error("Error loading window state:", e);
  }
  return { width: 1200, height: 800 };
}
function saveWindowState(state) {
  try {
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    log.error("Error saving window state:", e);
  }
}
let notesDir$3;
let theme$1;
let treeWidth$1;
function initMenuConfig(dir, t, tw) {
  notesDir$3 = dir;
  theme$1 = t;
  treeWidth$1 = tw;
}
function createMenu(mainWindow2) {
  const template = [
    {
      label: "Calcite",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Note",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow2?.webContents.send("menu:new-note");
          }
        },
        { type: "separator" },
        {
          label: "Choose Notes Folder...",
          accelerator: "CmdOrCtrl+Shift+O",
          click: async () => {
            if (!mainWindow2) return;
            const result = await dialog.showOpenDialog(mainWindow2, {
              properties: ["openDirectory"],
              title: "Select Notes Folder"
            });
            if (!result.canceled && result.filePaths.length > 0) {
              notesDir$3 = result.filePaths[0];
              saveConfig({ notesDir: result.filePaths[0], theme: theme$1, treeWidth: treeWidth$1 });
              ensureNotesDir(notesDir$3);
              mainWindow2.webContents.send("reload-notes");
            }
          }
        },
        {
          label: "Open Notes Folder",
          click: () => {
            if (notesDir$3) {
              shell.openPath(notesDir$3);
            }
          }
        },
        { type: "separator" },
        { role: "close" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
let notesDir$2;
function setNotesDir$1(dir) {
  notesDir$2 = dir;
}
function registerNotesHandlers() {
  ipcMain.handle("get-notes", async () => {
    try {
      log.info("get-notes called, notesDir:", notesDir$2);
      if (!notesDir$2) {
        log.error("notesDir is not set");
        return [];
      }
      ensureNotesDir(notesDir$2);
      const notes = [];
      const readDirRecursive = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            readDirRecursive(fullPath);
          } else if (entry.name.endsWith(".md")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const name = path.basename(entry.name, ".md");
            const stats = fs.statSync(fullPath);
            notes.push({
              id: fullPath,
              title: name,
              content,
              createdAt: stats.birthtimeMs,
              updatedAt: stats.mtimeMs
            });
          }
        }
      };
      readDirRecursive(notesDir$2);
      log.info("Found files:", notes.length);
      return notes;
    } catch (e) {
      log.error("Error getting notes:", e);
      return [];
    }
  });
  ipcMain.handle("get-all-notes-for-graph", async () => {
    try {
      log.info("get-all-notes-for-graph called, notesDir:", notesDir$2);
      if (!notesDir$2) {
        log.error("notesDir is not set for graph");
        return [];
      }
      ensureNotesDir(notesDir$2);
      const notes = [];
      const readDirRecursive = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            readDirRecursive(fullPath);
          } else if (entry.name.endsWith(".md")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const name = path.basename(entry.name, ".md");
            const stats = fs.statSync(fullPath);
            notes.push({
              id: fullPath,
              name,
              content,
              createdAt: stats.birthtimeMs,
              updatedAt: stats.mtimeMs
            });
          }
        }
      };
      readDirRecursive(notesDir$2);
      log.info("Found files for graph:", notes.length);
      return notes;
    } catch (e) {
      log.error("Error getting all notes for graph:", e);
      return [];
    }
  });
  ipcMain.handle("save-note", async (_event, note) => {
    try {
      if (!note || typeof note !== "object") {
        return { success: false, error: "Invalid note object" };
      }
      if (!note.id || typeof note.id !== "string") {
        return { success: false, error: "Note ID is required" };
      }
      if (note.content === void 0 || note.content === null) {
        return { success: false, error: "Note content is required" };
      }
      const filePath = note.id.endsWith(".md") ? note.id : path.join(notesDir$2, `${note.id}.md`);
      if (!isPathWithinNotesDir(filePath, notesDir$2)) {
        log.error("Attempted to save file outside notes directory:", filePath);
        return { success: false, error: "Access denied: path outside notes directory" };
      }
      fs.writeFileSync(filePath, note.content, "utf-8");
      return { success: true };
    } catch (e) {
      log.error("Error saving note:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("delete-note", async (_event, filePath) => {
    try {
      if (!filePath || typeof filePath !== "string") {
        return { success: false, error: "Invalid file path" };
      }
      if (!isPathWithinNotesDir(filePath, notesDir$2)) {
        log.error("Attempted to delete file outside notes directory:", filePath);
        return { success: false, error: "Access denied: path outside notes directory" };
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: "File not found" };
    } catch (e) {
      log.error("Error deleting note:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("save-new-note", async (_event, filePath, content) => {
    try {
      if (!filePath || typeof filePath !== "string") {
        return { success: false, error: "Invalid file path" };
      }
      if (content === void 0 || content === null) {
        return { success: false, error: "Content is required" };
      }
      if (!isPathWithinNotesDir(filePath, notesDir$2)) {
        log.error("Attempted to save file outside notes directory:", filePath);
        return { success: false, error: "Access denied: path outside notes directory" };
      }
      fs.writeFileSync(filePath, content, "utf-8");
      return { success: true };
    } catch (e) {
      log.error("Error saving note:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("rename-note", async (_event, oldPath, newFileName) => {
    try {
      if (!oldPath || typeof oldPath !== "string") {
        return { success: false, error: "Invalid old path" };
      }
      if (!newFileName || typeof newFileName !== "string") {
        return { success: false, error: "Invalid new file name" };
      }
      const sanitizedName = newFileName.replace(/[^a-zA-Z0-9\-]/g, "-");
      if (!isPathWithinNotesDir(oldPath, notesDir$2)) {
        log.error("Attempted to rename file outside notes directory:", oldPath);
        return { success: false, error: "Access denied: path outside notes directory" };
      }
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, `${sanitizedName}.md`);
      if (fs.existsSync(newPath)) {
        return { success: false, error: "A file with this name already exists" };
      }
      fs.renameSync(oldPath, newPath);
      return { success: true, newPath };
    } catch (e) {
      log.error("Error renaming note:", e);
      return { success: false, error: String(e) };
    }
  });
}
let notesDir$1;
let theme;
let treeWidth;
function initConfig() {
  const config = loadConfig();
  notesDir$1 = getNotesDir(config);
  theme = config.theme || "dark";
  treeWidth = config.treeWidth || 220;
}
function getNotesDirValue() {
  return notesDir$1;
}
function getThemeValue() {
  return theme;
}
function getTreeWidthValue() {
  return treeWidth;
}
function registerConfigHandlers(mainWindow2) {
  ipcMain.handle("get-notes-folder", () => notesDir$1);
  ipcMain.handle("get-theme", () => theme);
  ipcMain.handle("save-theme", async (_event, newTheme) => {
    try {
      theme = newTheme;
      saveConfig({ notesDir: notesDir$1, theme, treeWidth });
      return true;
    } catch (e) {
      log.error("Error saving theme:", e);
      return false;
    }
  });
  ipcMain.handle("get-tree-width", () => treeWidth);
  ipcMain.handle("save-tree-width", async (_event, width) => {
    try {
      treeWidth = width;
      saveConfig({ notesDir: notesDir$1, theme, treeWidth: width });
      return true;
    } catch (e) {
      log.error("Error saving tree width:", e);
      return false;
    }
  });
  ipcMain.handle("select-notes-folder", async () => {
    try {
      if (!mainWindow2) {
        log.error("mainWindow is not defined");
        return null;
      }
      const result = await dialog.showOpenDialog(mainWindow2, {
        properties: ["openDirectory"],
        title: "Select Notes Folder"
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const newDir = result.filePaths[0];
        log.info("Selected folder:", newDir);
        notesDir$1 = newDir;
        saveConfig({ notesDir: newDir, theme, treeWidth });
        ensureNotesDir(notesDir$1);
        mainWindow2.webContents.send("reload-notes");
        return newDir;
      }
      return null;
    } catch (e) {
      log.error("Error in select-notes-folder:", e);
      return null;
    }
  });
}
let notesDir;
function setNotesDir(dir) {
  notesDir = dir;
}
function registerFilesystemHandlers() {
  ipcMain.handle("delete-folder", async (_event, folderPath) => {
    try {
      if (!folderPath || typeof folderPath !== "string") {
        return { success: false, error: "Invalid folder path" };
      }
      if (!isPathWithinNotesDir(folderPath, notesDir)) {
        log.error("Attempted to delete folder outside notes directory:", folderPath);
        return { success: false, error: "Access denied: path outside notes directory" };
      }
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        return { success: true };
      }
      return { success: false, error: "Folder not found" };
    } catch (e) {
      log.error("Error deleting folder:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("has-md-files", async (_event, dirPath) => {
    if (!dirPath || typeof dirPath !== "string") {
      return false;
    }
    const checkDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (checkDir(fullPath)) return true;
          } else if (entry.name.endsWith(".md")) {
            return true;
          }
        }
      } catch {
        return false;
      }
      return false;
    };
    return checkDir(dirPath);
  });
  ipcMain.handle("create-folder", async (_event, parentPath, folderName) => {
    try {
      if (!parentPath || typeof parentPath !== "string") {
        return { success: false, error: "Invalid parent path" };
      }
      if (!folderName || typeof folderName !== "string") {
        return { success: false, error: "Invalid folder name" };
      }
      const sanitizedName = folderName.replace(/[^a-zA-Z0-9\-]/g, "-");
      if (!isPathWithinNotesDir(parentPath, notesDir)) {
        log.error("Attempted to create folder outside notes directory:", parentPath);
        return { success: false, error: "Access denied" };
      }
      const newPath = path.join(parentPath, sanitizedName);
      if (fs.existsSync(newPath)) {
        return { success: false, error: "A folder with this name already exists" };
      }
      fs.mkdirSync(newPath, { recursive: true });
      return { success: true, path: newPath };
    } catch (e) {
      log.error("Error creating folder:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("rename-folder", async (_event, oldPath, newName) => {
    try {
      if (!oldPath || typeof oldPath !== "string") {
        return { success: false, error: "Invalid folder path" };
      }
      if (!newName || typeof newName !== "string") {
        return { success: false, error: "Invalid folder name" };
      }
      const sanitizedName = newName.replace(/[^a-zA-Z0-9\-]/g, "-");
      if (!isPathWithinNotesDir(oldPath, notesDir)) {
        log.error("Attempted to rename folder outside notes directory:", oldPath);
        return { success: false, error: "Access denied" };
      }
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, sanitizedName);
      if (fs.existsSync(newPath) && newPath !== oldPath) {
        return { success: false, error: "A folder with this name already exists" };
      }
      fs.renameSync(oldPath, newPath);
      return { success: true, newPath };
    } catch (e) {
      log.error("Error renaming folder:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("move-file", async (_event, sourcePath, destFolder) => {
    try {
      if (!sourcePath || typeof sourcePath !== "string") {
        return { success: false, error: "Invalid source path" };
      }
      if (!destFolder || typeof destFolder !== "string") {
        return { success: false, error: "Invalid destination folder" };
      }
      if (!isPathWithinNotesDir(sourcePath, notesDir)) {
        log.error("Attempted to move file outside notes directory:", sourcePath);
        return { success: false, error: "Access denied" };
      }
      if (!isPathWithinNotesDir(destFolder, notesDir)) {
        log.error("Attempted to move file to outside notes directory:", destFolder);
        return { success: false, error: "Access denied" };
      }
      const fileName = path.basename(sourcePath);
      let destPath = path.join(destFolder, fileName);
      if (fs.existsSync(destPath)) {
        const nameWithoutExt = fileName.replace(/\.md$/, "");
        let counter = 1;
        let newFileName = `${nameWithoutExt}-${counter}.md`;
        destPath = path.join(destFolder, newFileName);
        while (fs.existsSync(destPath)) {
          counter++;
          newFileName = `${nameWithoutExt}-${counter}.md`;
          destPath = path.join(destFolder, newFileName);
        }
      }
      fs.renameSync(sourcePath, destPath);
      return { success: true, newPath: destPath };
    } catch (e) {
      log.error("Error moving file:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("get-directory", async (_event, dirPath) => {
    try {
      if (!dirPath || typeof dirPath !== "string") {
        return [];
      }
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries.filter((entry) => !entry.name.startsWith(".") && (entry.isDirectory() || entry.name.endsWith(".md"))).map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory()
        };
      }).sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (e) {
      log.error("Error reading directory:", e);
      return [];
    }
  });
  ipcMain.handle("read-file", async (_event, filePath) => {
    try {
      if (!filePath || typeof filePath !== "string") {
        return null;
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const name = path.basename(filePath, ".md");
      const stats = fs.statSync(filePath);
      return {
        id: filePath,
        title: name,
        content,
        createdAt: stats.birthtimeMs,
        updatedAt: stats.mtimeMs
      };
    } catch (e) {
      log.error("Error reading file:", e);
      return null;
    }
  });
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_NAME = "main_window";
let mainWindow;
log.initialize();
log.transports.file.level = "info";
log.transports.console.level = app.isPackaged ? "warn" : "debug";
process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error);
  if (app.isPackaged) {
    app.quit();
  }
});
process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Rejection at:", promise, "reason:", reason);
});
function setupIpcHandlers() {
  registerNotesHandlers();
  registerConfigHandlers(mainWindow);
  registerFilesystemHandlers();
}
async function createWindow() {
  const windowState = loadWindowState();
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    title: "Calcite",
    show: false,
    webPreferences: {
      preload: path.join(__dirname$1, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }
  initConfig();
  setNotesDir$1(getNotesDirValue());
  setNotesDir(getNotesDirValue());
  setupIpcHandlers();
  const isDev = !app.isPackaged;
  if (isDev && VITE_DEV_SERVER_URL) {
    log.debug("Loading dev URL:", VITE_DEV_SERVER_URL);
    await mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname$1, "..", "renderer", "index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  const saveCurrentState = () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized()
    });
  };
  mainWindow.on("resize", saveCurrentState);
  mainWindow.on("move", saveCurrentState);
  mainWindow.on("maximize", saveCurrentState);
  mainWindow.on("unmaximize", saveCurrentState);
  mainWindow.on("closed", () => {
    mainWindow = void 0;
  });
  if (!app.isPackaged && mainWindow) {
    let reloadTimeout = null;
    const srcPath = path.join(__dirname$1, "..", "..", "src");
    log.info("Hot reload enabled. Watching path:", srcPath);
    try {
      const watcher = fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const ext = filename.split(".").pop();
        if (!["tsx", "ts", "css"].includes(ext || "")) return;
        log.info("Detected change in:", filename);
        if (reloadTimeout) clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            log.info("Reloading renderer...");
            mainWindow.reload();
          }
        }, 500);
      });
      watcher.on("error", (err) => {
        log.error("Watcher error:", err);
      });
    } catch (e) {
      log.warn("Could not watch renderer files:", e);
    }
  }
  initMenuConfig(getNotesDirValue(), getThemeValue(), getTreeWidthValue());
  createMenu(mainWindow);
}
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info("Another instance is already running. Quitting...");
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    ensureNotesDir(getNotesDir(loadConfig()));
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
export {
  MAIN_WINDOW_VITE_DEV_SERVER_URL,
  MAIN_WINDOW_VITE_NAME,
  VITE_DEV_SERVER_URL
};
