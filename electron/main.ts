import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

import { loadConfig, getNotesDir, ensureNotesDir } from './utils/config';
import { loadWindowState, saveWindowState } from './utils/window';
import { createMenu, initMenuConfig } from './utils/menu';
import { registerNotesHandlers, setNotesDir as setNotesDirHandler } from './ipc/notes';
import { initConfig, registerConfigHandlers, getNotesDirValue, getThemeValue, getTreeWidthValue, setNotesDirValue } from './ipc/config';
import { registerFilesystemHandlers, setNotesDir as setFsNotesDir, openNotesFolder } from './ipc/filesystem';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
export const MAIN_WINDOW_VITE_NAME = 'main_window';

let mainWindow: BrowserWindow | undefined;

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = app.isPackaged ? 'warn' : 'debug';

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  if (app.isPackaged) {
    app.quit();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function setupIpcHandlers(): void {
  registerNotesHandlers();
  registerConfigHandlers(mainWindow);
  registerFilesystemHandlers();
}

async function createWindow(): Promise<void> {
  const windowState = loadWindowState();
  
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Calcite',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  initConfig();
  setNotesDirHandler(getNotesDirValue());
  setFsNotesDir(getNotesDirValue());
  setupIpcHandlers();

  const isDev = !app.isPackaged;
  
  if (isDev && VITE_DEV_SERVER_URL) {
    log.debug('Loading dev URL:', VITE_DEV_SERVER_URL);
    await mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
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

  mainWindow.on('resize', saveCurrentState);
  mainWindow.on('move', saveCurrentState);
  mainWindow.on('maximize', saveCurrentState);
  mainWindow.on('unmaximize', saveCurrentState);
  
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  if (!app.isPackaged && mainWindow) {
    let reloadTimeout: NodeJS.Timeout | null = null;
    const srcPath = path.join(__dirname, '..', '..', 'src');
    
    log.info('Hot reload enabled. Watching path:', srcPath);
    
    try {
      const watcher = fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const ext = filename.split('.').pop();
        if (!['tsx', 'ts', 'css'].includes(ext || '')) return;
        
        log.info('Detected change in:', filename);
        
        if (reloadTimeout) clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            log.info('Reloading renderer...');
            mainWindow.reload();
          }
        }, 500);
      });
      
      watcher.on('error', (err) => {
        log.error('Watcher error:', err);
      });
      
    } catch (e) {
      log.warn('Could not watch renderer files:', e);
    }
  }

  initMenuConfig(getNotesDirValue(), getThemeValue(), getTreeWidthValue());
  createMenu(mainWindow);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.info('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
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

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});