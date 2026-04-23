import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
export const MAIN_WINDOW_VITE_NAME = 'main_window';

let mainWindow: BrowserWindow | undefined;

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig(): { notesDir?: string; theme?: 'dark' | 'light' } {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return {};
}

function saveConfig(config: { notesDir?: string; theme?: 'dark' | 'light' }) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

const savedConfig = loadConfig();
let NOTES_DIR = savedConfig.notesDir || path.join(app.getPath('userData'), 'notes');
let THEME = savedConfig.theme || 'dark';

function ensureNotesDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

ipcMain.handle('get-notes', async () => {
  ensureNotesDir();
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(NOTES_DIR, file), 'utf-8');
    return JSON.parse(content);
  });
});

ipcMain.handle('save-note', async (_event, note) => {
  try {
    const filePath = note.id.endsWith('.md') ? note.id : path.join(NOTES_DIR, `${note.id}.md`);
    const content = note.content;
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (e) {
    console.error('Error saving note:', e);
  }
});

ipcMain.handle('delete-note', async (_event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('Error deleting note:', e);
  }
});

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Calcite',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-note');
          }
        },
        { type: 'separator' },
        {
          label: 'Choose Notes Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Notes Folder'
            });
            if (!result.canceled && result.filePaths.length > 0) {
              NOTES_DIR = result.filePaths[0];
              saveConfig({ notesDir: result.filePaths[0] });
              ensureNotesDir();
              mainWindow.webContents.send('reload-notes');
            }
          }
        },
        {
          label: 'Open Notes Folder',
          click: () => {
            shell.openPath(NOTES_DIR);
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
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
    title: 'Calcite',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const isDev = !app.isPackaged;
  
  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    console.log('Loading dev URL:', process.env['VITE_DEV_SERVER_URL']);
    await mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    const indexPath = isDev 
      ? path.join(__dirname, '..', 'renderer', 'index.html')
      : path.join(__dirname, '..', 'renderer', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

app.on('browser-window-created', () => {
  ensureNotesDir();
});

ipcMain.handle('select-notes-folder', async () => {
  try {
    if (!mainWindow) {
      console.error('mainWindow is not defined');
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Notes Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const newDir = result.filePaths[0];
      console.log('Selected folder:', newDir);
      NOTES_DIR = newDir;
      saveConfig({ notesDir: newDir });
      ensureNotesDir();
      mainWindow.webContents.send('reload-notes');
      return newDir;
    }
    return null;
  } catch (e) {
    console.error('Error in select-notes-folder:', e);
    return null;
  }
});

ipcMain.handle('has-md-files', async (_event, dirPath: string): Promise<boolean> => {
  const checkDir = (dir: string): boolean => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (checkDir(fullPath)) return true;
        } else if (entry.name.endsWith('.md')) {
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

ipcMain.handle('save-new-note', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error('Error saving note:', e);
    return false;
  }
});

ipcMain.handle('get-notes-folder', () => {
  return NOTES_DIR;
});

ipcMain.handle('get-theme', () => {
  return THEME;
});

ipcMain.handle('save-theme', async (_event, theme: 'dark' | 'light') => {
  try {
    THEME = theme;
    saveConfig({ notesDir: NOTES_DIR, theme });
    return true;
  } catch (e) {
    console.error('Error saving theme:', e);
    return false;
  }
});

ipcMain.handle('get-directory', async (_event, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => !entry.name.startsWith('.') && (entry.isDirectory() || entry.name.endsWith('.md')))
      .map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory()
        };
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = path.basename(filePath, '.md');
    return {
      id: filePath,
      title: name,
      content: content,
      createdAt: fs.statSync(filePath).birthtimeMs,
      updatedAt: fs.statSync(filePath).mtimeMs
    };
  } catch {
    return null;
  }
});

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});