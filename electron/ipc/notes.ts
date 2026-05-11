import { ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';
import { isPathWithinNotesDir, ensureNotesDir } from '../utils/config';

let notesDir: string;

export function setNotesDir(dir: string): void {
  notesDir = dir;
}

export function registerNotesHandlers(): void {
  ipcMain.handle('get-notes', async () => {
    try {
      if (!notesDir) {
        return [];
      }
      ensureNotesDir(notesDir);

      const notes: { id: string; title: string; content: string; createdAt: number; updatedAt: number }[] = [];

      const readDirRecursive = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            readDirRecursive(fullPath);
          } else if (entry.name.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const name = path.basename(entry.name, '.md');
            const stats = fs.statSync(fullPath);
            notes.push({
              id: fullPath,
              title: name,
              content: content,
              createdAt: stats.birthtimeMs,
              updatedAt: stats.mtimeMs
            });
          }
        }
      };

      readDirRecursive(notesDir);
      return notes;
    } catch (e) {
      log.error('Error getting notes:', e);
      return [];
    }
  });

  ipcMain.handle('get-all-notes-for-graph', async () => {
    try {
      if (!notesDir) {
        return [];
      }
      ensureNotesDir(notesDir);

      const notes: { id: string; name: string; content: string; createdAt: number; updatedAt: number }[] = [];

      const readDirRecursive = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            readDirRecursive(fullPath);
          } else if (entry.name.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const name = path.basename(entry.name, '.md');
            const stats = fs.statSync(fullPath);
            notes.push({
              id: fullPath,
              name: name,
              content: content,
              createdAt: stats.birthtimeMs,
              updatedAt: stats.mtimeMs
            });
          }
        }
      };

      readDirRecursive(notesDir);
      return notes;
    } catch (e) {
      log.error('Error getting all notes for graph:', e);
      return [];
    }
  });

  ipcMain.handle('save-note', async (_event, note: { id?: string; content?: string }) => {
    try {
      if (!note || typeof note !== 'object') {
        return { success: false, error: 'Invalid note object' };
      }
      
      if (!note.id || typeof note.id !== 'string') {
        return { success: false, error: 'Note ID is required' };
      }
      
      if (note.content === undefined || note.content === null) {
        return { success: false, error: 'Note content is required' };
      }
      
      const filePath = note.id.endsWith('.md') ? note.id : path.join(notesDir, `${note.id}.md`);
      
      if (!isPathWithinNotesDir(filePath, notesDir)) {
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
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid file path' };
      }
      
      if (!isPathWithinNotesDir(filePath, notesDir)) {
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

  ipcMain.handle('save-new-note', async (_event, filePath: string, content: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid file path' };
      }
      
      if (content === undefined || content === null) {
        return { success: false, error: 'Content is required' };
      }
      
      if (!isPathWithinNotesDir(filePath, notesDir)) {
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
      
      const sanitizedName = newFileName.replace(/[^a-zA-Z0-9\-]/g, '-');
      
      if (!isPathWithinNotesDir(oldPath, notesDir)) {
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
}