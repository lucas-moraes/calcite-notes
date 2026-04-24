import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
export const MAIN_WINDOW_VITE_NAME = 'main_window';

let mainWindow: BrowserWindow | undefined;

// Configure electron-log
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = app.isPackaged ? 'warn' : 'debug';

// Global error handlers
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  // In production, you might want to show a dialog or log to a file
  if (app.isPackaged) {
    dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig(): { notesDir?: string; theme?: 'dark' | 'light' } {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    log.error('Error loading config:', e);
  }
  return {};
}

function saveConfig(config: { notesDir?: string; theme?: 'dark' | 'light' }) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    log.error('Error saving config:', e);
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

// Path sanitization helper to prevent path traversal attacks
function isPathWithinNotesDir(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedNotesDir = path.resolve(NOTES_DIR);
  return resolvedPath.startsWith(resolvedNotesDir);
}

ipcMain.handle('get-notes', async () => {
  try {
    ensureNotesDir();
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
    return files.map(file => {
      const filePath = path.join(NOTES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(file, '.md');
      const stats = fs.statSync(filePath);
      return {
        id: filePath,
        title: name,
        content: content,
        createdAt: stats.birthtimeMs,
        updatedAt: stats.mtimeMs
      };
    });
  } catch (e) {
    log.error('Error getting notes:', e);
    return [];
  }
});

ipcMain.handle('save-note', async (_event, note: { id?: string; content?: string }) => {
  try {
    // Validate note object
    if (!note || typeof note !== 'object') {
      return { success: false, error: 'Invalid note object' };
    }
    
    if (!note.id || typeof note.id !== 'string') {
      return { success: false, error: 'Note ID is required' };
    }
    
    if (note.content === undefined || note.content === null) {
      return { success: false, error: 'Note content is required' };
    }
    
    const filePath = note.id.endsWith('.md') ? note.id : path.join(NOTES_DIR, `${note.id}.md`);
    
    // Ensure the path is within the allowed notes directory
    if (!isPathWithinNotesDir(filePath)) {
      log.error('Attempted to save file outside notes directory:', filePath);
      return { success: false, error: 'Access denied: path outside notes directory' };
    }
    
    fs.writeFileSync(filePath, note.content, 'utf-8');
    return { success: true };
  } catch (e) {
    log.error('Error saving note:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('delete-note', async (_event, filePath: string) => {
  try {
    // Validate filePath to prevent path traversal
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' };
    }
    
    // Ensure the path is within the allowed notes directory
    if (!isPathWithinNotesDir(filePath)) {
      log.error('Attempted to delete file outside notes directory:', filePath);
      return { success: false, error: 'Access denied: path outside notes directory' };
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (e) {
    log.error('Error deleting note:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('delete-folder', async (_event, folderPath: string) => {
  try {
    if (!folderPath || typeof folderPath !== 'string') {
      return { success: false, error: 'Invalid folder path' };
    }
    
    if (!isPathWithinNotesDir(folderPath)) {
      log.error('Attempted to delete folder outside notes directory:', folderPath);
      return { success: false, error: 'Access denied: path outside notes directory' };
    }
    
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      return { success: true };
    }
    return { success: false, error: 'Folder not found' };
  } catch (e) {
    log.error('Error deleting folder:', e);
    return { success: false, error: String(e) };
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

// Window state management
interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    log.error('Error loading window state:', e);
  }
  return { width: 1200, height: 800 };
}

function saveWindowState(state: WindowState) {
  try {
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    log.error('Error saving window state:', e);
  }
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
    title: 'Calcite',
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  const isDev = !app.isPackaged;
  
  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    log.debug('Loading dev URL:', process.env['VITE_DEV_SERVER_URL']);
    await mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    const indexPath = isDev 
      ? path.join(__dirname, '..', 'renderer', 'index.html')
      : path.join(__dirname, '..', 'renderer', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window state on changes
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

  mainWindow.on('resize', saveCurrentState);
  mainWindow.on('move', saveCurrentState);
  mainWindow.on('maximize', saveCurrentState);
  mainWindow.on('unmaximize', saveCurrentState);
  
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
      log.error('mainWindow is not defined');
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Notes Folder'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const newDir = result.filePaths[0];
      log.info('Selected folder:', newDir);
      NOTES_DIR = newDir;
      saveConfig({ notesDir: newDir });
      ensureNotesDir();
      mainWindow.webContents.send('reload-notes');
      return newDir;
    }
    return null;
  } catch (e) {
    log.error('Error in select-notes-folder:', e);
    return null;
  }
});

ipcMain.handle('has-md-files', async (_event, dirPath: string): Promise<boolean> => {
  // Only validate that it's a valid string path, not security check
  if (!dirPath || typeof dirPath !== 'string') {
    return false;
  }
  
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
    // Validate inputs
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' };
    }
    
    if (content === undefined || content === null) {
      return { success: false, error: 'Content is required' };
    }
    
    // Ensure the path is within the allowed notes directory
    if (!isPathWithinNotesDir(filePath)) {
      log.error('Attempted to save file outside notes directory:', filePath);
      return { success: false, error: 'Access denied: path outside notes directory' };
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    log.error('Error saving note:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('rename-note', async (_event, oldPath: string, newFileName: string) => {
  try {
    if (!oldPath || typeof oldPath !== 'string') {
      return { success: false, error: 'Invalid old path' };
    }
    
    if (!newFileName || typeof newFileName !== 'string') {
      return { success: false, error: 'Invalid new file name' };
    }
    
    // Sanitize file name - replace invalid characters with hyphens
    const sanitizedName = newFileName.replace(/[^a-zA-Z0-9\-]/g, '-');
    
    if (!isPathWithinNotesDir(oldPath)) {
      log.error('Attempted to rename file outside notes directory:', oldPath);
      return { success: false, error: 'Access denied: path outside notes directory' };
    }
    
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, `${sanitizedName}.md`);
    
    if (fs.existsSync(newPath)) {
      return { success: false, error: 'A file with this name already exists' };
    }
    
    fs.renameSync(oldPath, newPath);
    return { success: true, newPath };
  } catch (e) {
    log.error('Error renaming note:', e);
    return { success: false, error: String(e) };
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
    log.error('Error saving theme:', e);
    return false;
  }
});

ipcMain.handle('create-folder', async (_event, parentPath: string, folderName: string) => {
  try {
    if (!parentPath || typeof parentPath !== 'string') {
      return { success: false, error: 'Invalid parent path' };
    }
    
    if (!folderName || typeof folderName !== 'string') {
      return { success: false, error: 'Invalid folder name' };
    }
    
    const sanitizedName = folderName.replace(/[^a-zA-Z0-9\-]/g, '-');
    
    if (!isPathWithinNotesDir(parentPath)) {
      log.error('Attempted to create folder outside notes directory:', parentPath);
      return { success: false, error: 'Access denied' };
    }
    
    const newPath = path.join(parentPath, sanitizedName);
    
    if (fs.existsSync(newPath)) {
      return { success: false, error: 'A folder with this name already exists' };
    }
    
    fs.mkdirSync(newPath, { recursive: true });
    return { success: true, path: newPath };
  } catch (e) {
    log.error('Error creating folder:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('rename-folder', async (_event, oldPath: string, newName: string) => {
  try {
    if (!oldPath || typeof oldPath !== 'string') {
      return { success: false, error: 'Invalid folder path' };
    }
    
    if (!newName || typeof newName !== 'string') {
      return { success: false, error: 'Invalid folder name' };
    }
    
    const sanitizedName = newName.replace(/[^a-zA-Z0-9\-]/g, '-');
    
    if (!isPathWithinNotesDir(oldPath)) {
      log.error('Attempted to rename folder outside notes directory:', oldPath);
      return { success: false, error: 'Access denied' };
    }
    
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, sanitizedName);
    
    if (fs.existsSync(newPath) && newPath !== oldPath) {
      return { success: false, error: 'A folder with this name already exists' };
    }
    
    fs.renameSync(oldPath, newPath);
    return { success: true, newPath };
  } catch (e) {
    log.error('Error renaming folder:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('move-file', async (_event, sourcePath: string, destFolder: string) => {
  try {
    if (!sourcePath || typeof sourcePath !== 'string') {
      return { success: false, error: 'Invalid source path' };
    }
    
    if (!destFolder || typeof destFolder !== 'string') {
      return { success: false, error: 'Invalid destination folder' };
    }
    
    if (!isPathWithinNotesDir(sourcePath)) {
      log.error('Attempted to move file outside notes directory:', sourcePath);
      return { success: false, error: 'Access denied' };
    }
    
    if (!isPathWithinNotesDir(destFolder)) {
      log.error('Attempted to move file to outside notes directory:', destFolder);
      return { success: false, error: 'Access denied' };
    }
    
    const fileName = path.basename(sourcePath);
    let destPath = path.join(destFolder, fileName);
    
    // If file already exists, rename it
    if (fs.existsSync(destPath)) {
      const nameWithoutExt = fileName.replace(/\.md$/, '');
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
    log.error('Error moving file:', e);
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('get-directory', async (_event, dirPath: string) => {
  try {
    // Only validate that it's a valid string path
    if (!dirPath || typeof dirPath !== 'string') {
      return [];
    }
    
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
  } catch (e) {
    log.error('Error reading directory:', e);
    return [];
  }
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    // Only validate that it's a valid string path
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = path.basename(filePath, '.md');
    const stats = fs.statSync(filePath);
    return {
      id: filePath,
      title: name,
      content: content,
      createdAt: stats.birthtimeMs,
      updatedAt: stats.mtimeMs
    };
  } catch (e) {
    log.error('Error reading file:', e);
    return null;
  }
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.info('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
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
}

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  // On Windows/Linux, quit the app
  if (process.platform !== 'darwin') {
    app.quit();
  }
});