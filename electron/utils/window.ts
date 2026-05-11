import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

export function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    log.error('Error loading window state:', e);
  }
  return { width: 1200, height: 800 };
}

export function saveWindowState(state: WindowState): void {
  try {
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    log.error('Error saving window state:', e);
  }
}

export function createWindowStateListener(window: BrowserWindow, saveState: () => void): void {
  window.on('resize', saveState);
  window.on('move', saveState);
  window.on('maximize', saveState);
  window.on('unmaximize', saveState);
}