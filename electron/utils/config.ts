import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

export interface AppConfig {
  notesDir?: string;
  theme?: 'dark' | 'light';
  treeWidth?: number;
}

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    log.error('Error loading config:', e);
  }
  return {};
}

export function saveConfig(config: AppConfig): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    log.error('Error saving config:', e);
  }
}

export function getNotesDir(appConfig: AppConfig): string {
  return appConfig.notesDir || path.join(app.getPath('userData'), 'notes');
}

export function ensureNotesDir(notesDir: string): void {
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
}

export function isPathWithinNotesDir(filePath: string, notesDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedNotesDir = path.resolve(notesDir);
  return resolvedPath.startsWith(resolvedNotesDir);
}