import { app, ipcMain, dialog, BrowserWindow, Menu, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_NAME = "main_window";
let mainWindow;
let NOTES_DIR = path.join(app.getPath("userData"), "notes");
function ensureNotesDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}
ipcMain.handle("get-notes", async () => {
  ensureNotesDir();
  const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(NOTES_DIR, file), "utf-8");
    return JSON.parse(content);
  });
});
ipcMain.handle("save-note", async (_event, note) => {
  ensureNotesDir();
  const filepath = path.join(NOTES_DIR, `${note.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(note, null, 2));
});
ipcMain.handle("delete-note", async (_event, id) => {
  const filepath = path.join(NOTES_DIR, `${id}.json`);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
});
function createMenu() {
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
            mainWindow?.webContents.send("menu:new-note");
          }
        },
        { type: "separator" },
        {
          label: "Choose Notes Folder...",
          accelerator: "CmdOrCtrl+Shift+O",
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openDirectory"],
              title: "Select Notes Folder"
            });
            if (!result.canceled && result.filePaths.length > 0) {
              NOTES_DIR = result.filePaths[0];
              ensureNotesDir();
              mainWindow.webContents.send("reload-notes");
            }
          }
        },
        {
          label: "Open Notes Folder",
          click: () => {
            shell.openPath(NOTES_DIR);
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
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Calcite",
    webPreferences: {
      preload: path.join(__dirname$1, "..", "preload", "index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  const isDev = !app.isPackaged;
  if (isDev && process.env["VITE_DEV_SERVER_URL"]) {
    console.log("Loading dev URL:", process.env["VITE_DEV_SERVER_URL"]);
    await mainWindow.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else {
    const indexPath = isDev ? path.join(__dirname$1, "..", "renderer", "index.html") : path.join(__dirname$1, "..", "renderer", "index.html");
    await mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = void 0;
  });
}
app.on("browser-window-created", () => {
  ensureNotesDir();
});
ipcMain.handle("select-notes-folder", async () => {
  try {
    if (!mainWindow) {
      console.error("mainWindow is not defined");
      return null;
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Notes Folder"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const newDir = result.filePaths[0];
      console.log("Selected folder:", newDir);
      NOTES_DIR = newDir;
      ensureNotesDir();
      mainWindow.webContents.send("reload-notes");
      return newDir;
    }
    return null;
  } catch (e) {
    console.error("Error in select-notes-folder:", e);
    return null;
  }
});
ipcMain.handle("get-notes-folder", () => {
  return NOTES_DIR;
});
app.whenReady().then(() => {
  createMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
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
