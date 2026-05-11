import { ipcMain, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';
import { saveConfig, loadConfig, getNotesDir, ensureNotesDir } from '../utils/config';

let notesDir: string;
let theme: 'dark' | 'light';
let treeWidth: number;

export function initConfig(): void {
  const config = loadConfig();
  notesDir = getNotesDir(config);
  theme = config.theme || 'dark';
  treeWidth = config.treeWidth || 220;
}

export function getNotesDirValue(): string {
  return notesDir;
}

export function setNotesDirValue(dir: string): void {
  notesDir = dir;
}

export function getThemeValue(): 'dark' | 'light' {
  return theme;
}

export function getTreeWidthValue(): number {
  return treeWidth;
}

export function registerConfigHandlers(mainWindow: BrowserWindow | undefined): void {
  ipcMain.handle('get-notes-folder', () => notesDir);

  ipcMain.handle('get-theme', () => theme);

  ipcMain.handle('save-theme', async (_event, newTheme: 'dark' | 'light') => {
    try {
      theme = newTheme;
      saveConfig({ notesDir, theme, treeWidth });
      return true;
    } catch (e) {
      log.error('Error saving theme:', e);
      return false;
    }
  });

  ipcMain.handle('get-tree-width', () => treeWidth);

  ipcMain.handle('save-tree-width', async (_event, width: number) => {
    try {
      treeWidth = width;
      saveConfig({ notesDir, theme, treeWidth: width });
      return true;
    } catch (e) {
      log.error('Error saving tree width:', e);
      return false;
    }
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
        notesDir = newDir;
        saveConfig({ notesDir: newDir, theme, treeWidth });
        ensureNotesDir(notesDir);
        mainWindow.webContents.send('reload-notes');
        return newDir;
      }
      return null;
    } catch (e) {
      log.error('Error in select-notes-folder:', e);
      return null;
    }
  });
}