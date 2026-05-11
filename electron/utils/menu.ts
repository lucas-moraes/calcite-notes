import { Menu, BrowserWindow, dialog, shell } from 'electron';
import log from 'electron-log';
import { saveConfig, getNotesDir, ensureNotesDir } from './config';

let notesDir: string;
let theme: 'dark' | 'light';
let treeWidth: number;

export function initMenuConfig(dir: string, t: 'dark' | 'light', tw: number): void {
  notesDir = dir;
  theme = t;
  treeWidth = tw;
}

export function createMenu(mainWindow: BrowserWindow | undefined): void {
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
              notesDir = result.filePaths[0];
              saveConfig({ notesDir: result.filePaths[0], theme, treeWidth });
              ensureNotesDir(notesDir);
              mainWindow.webContents.send('reload-notes');
            }
          }
        },
        {
          label: 'Open Notes Folder',
          click: () => {
            if (notesDir) {
              shell.openPath(notesDir);
            }
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